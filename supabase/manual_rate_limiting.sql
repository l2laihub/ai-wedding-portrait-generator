-- Rate Limiting Infrastructure Migration (Fixed)
-- Adds tables and functions for secure rate limiting system

-- Rate limiting table for IP-based tracking
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  identifier TEXT NOT NULL, -- IP address or user_id
  identifier_type TEXT NOT NULL CHECK (identifier_type IN ('ip', 'user', 'anonymous')),
  requests_count INTEGER DEFAULT 0,
  window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_request TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(identifier, identifier_type)
);

-- Generation requests tracking
CREATE TABLE IF NOT EXISTS generation_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_id TEXT,
  ip_address INET,
  user_agent TEXT,
  request_payload_hash TEXT, -- Hash of image + prompt for duplicate detection
  styles_requested TEXT[], -- Array of styles requested
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'rate_limited')),
  credits_consumed INTEGER DEFAULT 0,
  processing_time_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Secure API keys table for backend services
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key_name TEXT NOT NULL UNIQUE,
  key_hash TEXT NOT NULL, -- bcrypt hashed API key
  permissions TEXT[] DEFAULT '{}', -- Array of permissions
  rate_limit_per_hour INTEGER DEFAULT 1000,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier ON rate_limits(identifier, identifier_type);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start ON rate_limits(window_start);
CREATE INDEX IF NOT EXISTS idx_generation_requests_user_id ON generation_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_generation_requests_ip_address ON generation_requests(ip_address);
CREATE INDEX IF NOT EXISTS idx_generation_requests_created_at ON generation_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_generation_requests_status ON generation_requests(status);
CREATE INDEX IF NOT EXISTS idx_generation_requests_hash ON generation_requests(request_payload_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON api_keys(is_active);

-- Enable RLS
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admin can manage rate limits" ON rate_limits;
DROP POLICY IF EXISTS "Users can view their own generation requests" ON generation_requests;
DROP POLICY IF EXISTS "Service role can manage generation requests" ON generation_requests;
DROP POLICY IF EXISTS "Admin can manage API keys" ON api_keys;

-- RLS Policies for rate_limits (admin only)
CREATE POLICY "Admin can manage rate limits" ON rate_limits
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- RLS Policies for generation_requests
CREATE POLICY "Users can view their own generation requests" ON generation_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage generation requests" ON generation_requests
  FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for api_keys (admin only)
CREATE POLICY "Admin can manage API keys" ON api_keys
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- Function to check rate limit
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_identifier TEXT,
  p_identifier_type TEXT DEFAULT 'ip',
  p_limit_per_hour INTEGER DEFAULT 60,
  p_limit_per_day INTEGER DEFAULT 3
) RETURNS JSONB AS $$
DECLARE
  v_current_count INTEGER;
  v_hourly_count INTEGER;
  v_daily_count INTEGER;
  v_window_start TIMESTAMP WITH TIME ZONE;
  v_can_proceed BOOLEAN DEFAULT false;
  v_reset_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get current window start (hourly window)
  v_window_start := date_trunc('hour', NOW());
  
  -- Get or create rate limit record
  INSERT INTO rate_limits (identifier, identifier_type, requests_count, window_start)
  VALUES (p_identifier, p_identifier_type, 0, v_window_start)
  ON CONFLICT (identifier, identifier_type) 
  DO UPDATE SET
    requests_count = CASE 
      WHEN rate_limits.window_start < v_window_start THEN 0
      ELSE rate_limits.requests_count
    END,
    window_start = CASE
      WHEN rate_limits.window_start < v_window_start THEN v_window_start
      ELSE rate_limits.window_start
    END,
    last_request = NOW()
  RETURNING requests_count INTO v_current_count;
  
  -- Get hourly count
  SELECT COUNT(*)
  INTO v_hourly_count
  FROM generation_requests
  WHERE (
    (p_identifier_type = 'ip' AND ip_address = p_identifier::INET) OR
    (p_identifier_type = 'user' AND user_id = p_identifier::UUID) OR
    (p_identifier_type = 'anonymous' AND session_id = p_identifier)
  )
  AND created_at >= NOW() - INTERVAL '1 hour';
  
  -- Get daily count
  SELECT COUNT(*)
  INTO v_daily_count
  FROM generation_requests
  WHERE (
    (p_identifier_type = 'ip' AND ip_address = p_identifier::INET) OR
    (p_identifier_type = 'user' AND user_id = p_identifier::UUID) OR
    (p_identifier_type = 'anonymous' AND session_id = p_identifier)
  )
  AND created_at >= NOW() - INTERVAL '24 hours';
  
  -- Check if can proceed
  v_can_proceed := v_hourly_count < p_limit_per_hour AND v_daily_count < p_limit_per_day;
  
  -- Calculate reset time (next hour)
  v_reset_at := date_trunc('hour', NOW()) + INTERVAL '1 hour';
  
  RETURN jsonb_build_object(
    'can_proceed', v_can_proceed,
    'hourly_count', v_hourly_count,
    'daily_count', v_daily_count,
    'hourly_limit', p_limit_per_hour,
    'daily_limit', p_limit_per_day,
    'hourly_remaining', GREATEST(0, p_limit_per_hour - v_hourly_count),
    'daily_remaining', GREATEST(0, p_limit_per_day - v_daily_count),
    'reset_at', v_reset_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record generation request
CREATE OR REPLACE FUNCTION record_generation_request(
  p_user_id UUID DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_request_hash TEXT DEFAULT NULL,
  p_styles TEXT[] DEFAULT '{}',
  p_credits_consumed INTEGER DEFAULT 1
) RETURNS UUID AS $$
DECLARE
  v_request_id UUID;
BEGIN
  INSERT INTO generation_requests (
    user_id,
    session_id,
    ip_address,
    user_agent,
    request_payload_hash,
    styles_requested,
    credits_consumed,
    status
  ) VALUES (
    p_user_id,
    p_session_id,
    p_ip_address,
    p_user_agent,
    p_request_hash,
    p_styles,
    p_credits_consumed,
    'pending'
  ) RETURNING id INTO v_request_id;
  
  RETURN v_request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update generation request status
CREATE OR REPLACE FUNCTION update_generation_request(
  p_request_id UUID,
  p_status TEXT,
  p_processing_time_ms INTEGER DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE generation_requests
  SET 
    status = p_status,
    processing_time_ms = COALESCE(p_processing_time_ms, processing_time_ms),
    error_message = COALESCE(p_error_message, error_message),
    completed_at = CASE WHEN p_status IN ('completed', 'failed') THEN NOW() ELSE completed_at END
  WHERE id = p_request_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate and store API key
CREATE OR REPLACE FUNCTION generate_api_key(
  p_key_name TEXT,
  p_permissions TEXT[] DEFAULT '{"generate_portrait"}',
  p_rate_limit INTEGER DEFAULT 1000,
  p_expires_days INTEGER DEFAULT NULL
) RETURNS TEXT AS $$
DECLARE
  v_raw_key TEXT;
  v_key_hash TEXT;
  v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Generate random API key
  v_raw_key := encode(gen_random_bytes(32), 'base64');
  
  -- Hash the key for storage
  v_key_hash := crypt(v_raw_key, gen_salt('bf', 12));
  
  -- Set expiration if provided
  IF p_expires_days IS NOT NULL THEN
    v_expires_at := NOW() + (p_expires_days || ' days')::INTERVAL;
  END IF;
  
  -- Store hashed key
  INSERT INTO api_keys (
    key_name,
    key_hash,
    permissions,
    rate_limit_per_hour,
    expires_at
  ) VALUES (
    p_key_name,
    v_key_hash,
    p_permissions,
    p_rate_limit,
    v_expires_at
  )
  ON CONFLICT (key_name) DO NOTHING;
  
  -- Return raw key (only time it's visible)
  RETURN v_raw_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate API key
CREATE OR REPLACE FUNCTION validate_api_key(p_raw_key TEXT)
RETURNS JSONB AS $$
DECLARE
  v_key_info RECORD;
BEGIN
  SELECT 
    id,
    key_name,
    permissions,
    rate_limit_per_hour,
    is_active,
    expires_at
  INTO v_key_info
  FROM api_keys
  WHERE key_hash = crypt(p_raw_key, key_hash)
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > NOW());
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Invalid or expired API key');
  END IF;
  
  -- Update last used timestamp
  UPDATE api_keys SET last_used_at = NOW() WHERE id = v_key_info.id;
  
  RETURN jsonb_build_object(
    'valid', true,
    'key_name', v_key_info.key_name,
    'permissions', v_key_info.permissions,
    'rate_limit_per_hour', v_key_info.rate_limit_per_hour
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get rate limit stats
CREATE OR REPLACE FUNCTION get_rate_limit_stats(
  p_hours INTEGER DEFAULT 24
) RETURNS JSONB AS $$
DECLARE
  v_stats JSONB;
BEGIN
  WITH request_stats AS (
    SELECT
      COUNT(*) as total_requests,
      COUNT(DISTINCT COALESCE(user_id::TEXT, session_id, ip_address::TEXT)) as unique_users,
      COUNT(*) FILTER (WHERE status = 'completed') as successful_requests,
      COUNT(*) FILTER (WHERE status = 'failed') as failed_requests,
      COUNT(*) FILTER (WHERE status = 'rate_limited') as rate_limited_requests,
      AVG(processing_time_ms) FILTER (WHERE processing_time_ms IS NOT NULL) as avg_processing_time
    FROM generation_requests
    WHERE created_at >= NOW() - (p_hours || ' hours')::INTERVAL
  )
  SELECT jsonb_build_object(
    'period_hours', p_hours,
    'total_requests', COALESCE(total_requests, 0),
    'unique_users', COALESCE(unique_users, 0),
    'successful_requests', COALESCE(successful_requests, 0),
    'failed_requests', COALESCE(failed_requests, 0),
    'rate_limited_requests', COALESCE(rate_limited_requests, 0),
    'success_rate', CASE 
      WHEN COALESCE(total_requests, 0) > 0 
      THEN ROUND((COALESCE(successful_requests, 0)::DECIMAL / total_requests) * 100, 2)
      ELSE 0 
    END,
    'avg_processing_time_ms', ROUND(COALESCE(avg_processing_time, 0))
  ) INTO v_stats
  FROM request_stats;
  
  RETURN v_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Initial API key for the portrait generation service
-- This will be used by the Edge Function to authenticate with the backend
DO $$
DECLARE
  v_api_key TEXT;
BEGIN
  -- Check if service key already exists
  IF NOT EXISTS (SELECT 1 FROM api_keys WHERE key_name = 'portrait_generation_service') THEN
    -- Generate service API key
    SELECT generate_api_key(
      'portrait_generation_service',
      ARRAY['generate_portrait', 'rate_limit_check'],
      10000, -- 10k requests per hour
      NULL -- never expires
    ) INTO v_api_key;
    
    -- Log the key (in production, this should be securely stored)
    RAISE NOTICE 'Generated service API key: %', v_api_key;
  ELSE
    RAISE NOTICE 'Service API key already exists';
  END IF;
END $$;

-- Grant permissions
GRANT ALL ON rate_limits TO service_role;
GRANT ALL ON generation_requests TO service_role;
GRANT ALL ON api_keys TO service_role;

-- Comments for documentation
COMMENT ON TABLE rate_limits IS 'Rate limiting tracking by IP/user/session';
COMMENT ON TABLE generation_requests IS 'Complete log of all portrait generation requests';
COMMENT ON TABLE api_keys IS 'Secure API keys for backend services';
COMMENT ON FUNCTION check_rate_limit IS 'Check if identifier can make requests within rate limits';
COMMENT ON FUNCTION record_generation_request IS 'Record a new generation request with metadata';
COMMENT ON FUNCTION update_generation_request IS 'Update generation request status and results';
COMMENT ON FUNCTION generate_api_key IS 'Generate and store new API key with permissions';
COMMENT ON FUNCTION validate_api_key IS 'Validate API key and return permissions';
COMMENT ON FUNCTION get_rate_limit_stats IS 'Get rate limiting and usage statistics';

-- Verification
SELECT 'Rate limiting infrastructure created successfully' as status;
SELECT table_name FROM information_schema.tables WHERE table_name IN ('rate_limits', 'generation_requests', 'api_keys') AND table_schema = 'public';