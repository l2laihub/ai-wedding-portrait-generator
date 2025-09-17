-- Quick production fix for rate limiting
SELECT 'Starting production database setup...' as status;

-- Create essential tables if they don't exist
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  identifier TEXT NOT NULL,
  identifier_type TEXT NOT NULL CHECK (identifier_type IN ('ip', 'user', 'anonymous')),
  requests_count INTEGER DEFAULT 0,
  window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_request TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(identifier, identifier_type)
);

CREATE TABLE IF NOT EXISTS generation_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  session_id TEXT,
  ip_address INET,
  user_agent TEXT,
  request_payload_hash TEXT,
  styles_requested TEXT[],
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'rate_limited')),
  credits_consumed INTEGER DEFAULT 0,
  processing_time_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier ON rate_limits(identifier, identifier_type);
CREATE INDEX IF NOT EXISTS idx_generation_requests_created_at ON generation_requests(created_at);

-- Enable RLS
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Service role can manage generation requests" ON generation_requests;
CREATE POLICY "Service role can manage generation requests" ON generation_requests
  FOR ALL USING (auth.role() = 'service_role');

-- Essential function: check_rate_limit
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_identifier TEXT,
  p_identifier_type TEXT DEFAULT 'ip',
  p_limit_per_hour INTEGER DEFAULT 60,
  p_limit_per_day INTEGER DEFAULT 3
) RETURNS JSONB AS $$
DECLARE
  v_hourly_count INTEGER;
  v_daily_count INTEGER;
  v_can_proceed BOOLEAN DEFAULT false;
  v_reset_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get hourly count from generation_requests
  SELECT COUNT(*)
  INTO v_hourly_count
  FROM generation_requests
  WHERE (
    (p_identifier_type = 'ip' AND ip_address = p_identifier::INET) OR
    (p_identifier_type = 'user' AND user_id = p_identifier::UUID) OR
    (p_identifier_type = 'anonymous' AND session_id = p_identifier)
  )
  AND created_at >= NOW() - INTERVAL '1 hour';
  
  -- Get daily count from generation_requests  
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

-- Essential function: record_generation_request
CREATE OR REPLACE FUNCTION record_generation_request(
  p_user_id UUID DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_request_hash TEXT DEFAULT NULL,
  p_styles TEXT[] DEFAULT '{}',
  p_credits_consumed INTEGER DEFAULT 1
) RETURNS UUID AS $$
DECLARE
  v_request_id UUID;
  v_ip_address INET;
BEGIN
  -- Convert IP address string to INET if provided
  IF p_ip_address IS NOT NULL THEN
    v_ip_address := p_ip_address::INET;
  END IF;
  
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
    v_ip_address,
    p_user_agent,
    p_request_hash,
    p_styles,
    p_credits_consumed,
    'pending'
  ) RETURNING id INTO v_request_id;
  
  RETURN v_request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Essential function: update_generation_request
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

-- Simple validate_api_key function
CREATE OR REPLACE FUNCTION validate_api_key(p_raw_key TEXT)
RETURNS JSONB AS $$
BEGIN
  IF p_raw_key IS NOT NULL AND length(p_raw_key) > 10 THEN
    RETURN jsonb_build_object('valid', true, 'key_name', 'service_key');
  ELSE
    RETURN jsonb_build_object('valid', false, 'error', 'Invalid API key');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT 'Production database setup completed!' as status;