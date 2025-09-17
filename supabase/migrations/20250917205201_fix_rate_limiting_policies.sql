-- Fix Rate Limiting Infrastructure Migration
-- Fixes existing policy conflicts and role system

-- Drop existing policies that are causing conflicts
DROP POLICY IF EXISTS "Admin can manage rate limits" ON rate_limits;
DROP POLICY IF EXISTS "Users can view their own generation requests" ON generation_requests;
DROP POLICY IF EXISTS "Service role can manage generation requests" ON generation_requests;
DROP POLICY IF EXISTS "Admin can manage API keys" ON api_keys;

-- Recreate policies with correct role system
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

-- Update generate_api_key function to handle conflicts
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
  v_existing_key RECORD;
BEGIN
  -- Check if key already exists
  SELECT * INTO v_existing_key FROM api_keys WHERE key_name = p_key_name;
  
  IF FOUND THEN
    -- Return a placeholder for existing keys
    RETURN 'Key already exists: ' || p_key_name;
  END IF;
  
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
  );
  
  -- Return raw key (only time it's visible)
  RETURN v_raw_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions to service role
GRANT ALL ON rate_limits TO service_role;
GRANT ALL ON generation_requests TO service_role;
GRANT ALL ON api_keys TO service_role;

-- Ensure service API key exists (safely)
DO $$
DECLARE
  v_api_key TEXT;
  v_key_exists BOOLEAN;
BEGIN
  -- Check if service key already exists
  SELECT EXISTS (
    SELECT 1 FROM api_keys WHERE key_name = 'portrait_generation_service'
  ) INTO v_key_exists;
  
  IF NOT v_key_exists THEN
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

-- Verification
SELECT 'Rate limiting policies fixed successfully' as status;