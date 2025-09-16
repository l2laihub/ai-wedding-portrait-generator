-- Authentication Security Enhancements Migration
-- Created: 2025-09-16
-- Description: Implement comprehensive auth security with rate limiting, security events, and session management

-- Create rate limiting table for authentication endpoints
CREATE TABLE IF NOT EXISTS rate_limit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  identifier TEXT NOT NULL, -- email, IP, or user ID
  action TEXT NOT NULL CHECK (action IN ('password_reset', 'login_attempt', 'signup_attempt', 'oauth_attempt')),
  ip_address TEXT,
  user_agent TEXT CHECK (length(user_agent) <= 500),
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_identifier CHECK (length(identifier) <= 255),
  CONSTRAINT valid_action_length CHECK (length(action) <= 50)
);

-- Create indexes for rate limiting
CREATE INDEX IF NOT EXISTS idx_rate_limit_logs_identifier_action ON rate_limit_logs(identifier, action);
CREATE INDEX IF NOT EXISTS idx_rate_limit_logs_created_at ON rate_limit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_rate_limit_logs_ip_address ON rate_limit_logs(ip_address);

-- Create security events table for auth monitoring
CREATE TABLE IF NOT EXISTS security_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL CHECK (length(event_type) <= 100),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT,
  ip_address TEXT,
  user_agent TEXT CHECK (length(user_agent) <= 500),
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_event_type CHECK (event_type ~ '^[a-zA-Z0-9_]+$'),
  CONSTRAINT metadata_size CHECK (pg_column_size(metadata) < 8192)
);

-- Create indexes for security events
CREATE INDEX IF NOT EXISTS idx_security_events_event_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON security_events(created_at);
CREATE INDEX IF NOT EXISTS idx_security_events_ip_address ON security_events(ip_address);
CREATE INDEX IF NOT EXISTS idx_security_events_success ON security_events(success);

-- Create session tracking table for enhanced JWT management
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token TEXT UNIQUE NOT NULL,
  refresh_token_hash TEXT,
  ip_address TEXT,
  user_agent TEXT CHECK (length(user_agent) <= 500),
  is_active BOOLEAN DEFAULT TRUE,
  last_activity TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_session_token CHECK (length(session_token) <= 512),
  CONSTRAINT valid_refresh_token_hash CHECK (length(refresh_token_hash) <= 128),
  CONSTRAINT valid_expires_at CHECK (expires_at > created_at)
);

-- Create indexes for session tracking
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_is_active ON user_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_activity ON user_sessions(last_activity);

-- Create password history table to prevent password reuse
CREATE TABLE IF NOT EXISTS password_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_password_hash CHECK (length(password_hash) <= 512)
);

-- Create indexes for password history
CREATE INDEX IF NOT EXISTS idx_password_history_user_id ON password_history(user_id);
CREATE INDEX IF NOT EXISTS idx_password_history_created_at ON password_history(created_at);

-- Create failed login attempts table for account security
CREATE TABLE IF NOT EXISTS failed_login_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT CHECK (length(user_agent) <= 500),
  attempt_count INTEGER DEFAULT 1,
  last_attempt TIMESTAMP DEFAULT NOW(),
  blocked_until TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_email_format CHECK (email ~ '^[^@]+@[^@]+\.[^@]+$'),
  CONSTRAINT valid_attempt_count CHECK (attempt_count > 0)
);

-- Create indexes for failed login attempts
CREATE UNIQUE INDEX IF NOT EXISTS idx_failed_login_attempts_email_ip ON failed_login_attempts(email, ip_address);
CREATE INDEX IF NOT EXISTS idx_failed_login_attempts_email ON failed_login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_failed_login_attempts_blocked_until ON failed_login_attempts(blocked_until);

-- Enable RLS on new tables
ALTER TABLE rate_limit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE failed_login_attempts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for rate_limit_logs (service role only)
CREATE POLICY "Service role can access rate limit logs" ON rate_limit_logs
  FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for security_events
CREATE POLICY "Admins can view security events" ON security_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Service role can manage security events" ON security_events
  FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for user_sessions
CREATE POLICY "Users can view their own sessions" ON user_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage sessions" ON user_sessions
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Admins can view all sessions" ON user_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- RLS Policies for password_history (service role only)
CREATE POLICY "Service role can access password history" ON password_history
  FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for failed_login_attempts (service role only)
CREATE POLICY "Service role can access failed login attempts" ON failed_login_attempts
  FOR ALL USING (auth.role() = 'service_role');

-- Function to clean up expired rate limit logs
CREATE OR REPLACE FUNCTION cleanup_rate_limit_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete rate limit logs older than 24 hours
  DELETE FROM rate_limit_logs 
  WHERE created_at < NOW() - INTERVAL '24 hours';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Mark expired sessions as inactive
  UPDATE user_sessions 
  SET is_active = FALSE 
  WHERE expires_at < NOW() AND is_active = TRUE;
  
  -- Delete old inactive sessions (older than 30 days)
  DELETE FROM user_sessions 
  WHERE expires_at < NOW() - INTERVAL '30 days' AND is_active = FALSE;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old password history
CREATE OR REPLACE FUNCTION cleanup_old_password_history()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Keep only the last 5 passwords per user
  WITH ranked_passwords AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as rn
    FROM password_history
  )
  DELETE FROM password_history 
  WHERE id IN (
    SELECT id FROM ranked_passwords WHERE rn > 5
  );
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if account is blocked due to failed attempts
CREATE OR REPLACE FUNCTION is_account_blocked(p_email TEXT, p_ip_address TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  blocked_until TIMESTAMP;
BEGIN
  -- Get blocked until time for this email/IP combination
  SELECT failed_login_attempts.blocked_until INTO blocked_until
  FROM failed_login_attempts
  WHERE email = p_email 
  AND (ip_address = p_ip_address OR ip_address IS NULL)
  ORDER BY last_attempt DESC
  LIMIT 1;
  
  -- Return true if currently blocked
  RETURN blocked_until IS NOT NULL AND blocked_until > NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record failed login attempt
CREATE OR REPLACE FUNCTION record_failed_login(
  p_email TEXT,
  p_ip_address TEXT,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  current_attempts INTEGER := 0;
  max_attempts INTEGER := 5;
  block_duration INTERVAL := INTERVAL '15 minutes';
BEGIN
  -- Get current attempt count
  SELECT attempt_count INTO current_attempts
  FROM failed_login_attempts
  WHERE email = p_email AND ip_address = p_ip_address;
  
  IF current_attempts IS NULL THEN
    -- First failed attempt
    INSERT INTO failed_login_attempts (email, ip_address, user_agent)
    VALUES (p_email, p_ip_address, p_user_agent);
  ELSE
    -- Increment attempt count
    current_attempts := current_attempts + 1;
    
    UPDATE failed_login_attempts
    SET 
      attempt_count = current_attempts,
      last_attempt = NOW(),
      blocked_until = CASE 
        WHEN current_attempts >= max_attempts THEN NOW() + block_duration
        ELSE blocked_until
      END
    WHERE email = p_email AND ip_address = p_ip_address;
  END IF;
  
  -- Log security event
  INSERT INTO security_events (
    event_type,
    email,
    ip_address,
    user_agent,
    success,
    metadata
  ) VALUES (
    'failed_login_attempt',
    p_email,
    p_ip_address,
    p_user_agent,
    FALSE,
    jsonb_build_object(
      'attempt_count', current_attempts + 1,
      'blocked', (current_attempts + 1) >= max_attempts
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clear failed login attempts after successful login
CREATE OR REPLACE FUNCTION clear_failed_login_attempts(p_email TEXT, p_ip_address TEXT)
RETURNS VOID AS $$
BEGIN
  DELETE FROM failed_login_attempts
  WHERE email = p_email AND ip_address = p_ip_address;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create secure session
CREATE OR REPLACE FUNCTION create_user_session(
  p_user_id UUID,
  p_session_token TEXT,
  p_refresh_token_hash TEXT,
  p_ip_address TEXT,
  p_user_agent TEXT,
  p_expires_at TIMESTAMP
)
RETURNS UUID AS $$
DECLARE
  session_id UUID;
BEGIN
  -- Clean up old sessions for this user
  UPDATE user_sessions 
  SET is_active = FALSE 
  WHERE user_id = p_user_id AND expires_at < NOW();
  
  -- Create new session
  INSERT INTO user_sessions (
    user_id,
    session_token,
    refresh_token_hash,
    ip_address,
    user_agent,
    expires_at
  ) VALUES (
    p_user_id,
    p_session_token,
    p_refresh_token_hash,
    p_ip_address,
    p_user_agent,
    p_expires_at
  ) RETURNING id INTO session_id;
  
  RETURN session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION cleanup_rate_limit_logs() TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_expired_sessions() TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_password_history() TO service_role;
GRANT EXECUTE ON FUNCTION is_account_blocked(TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION record_failed_login(TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION clear_failed_login_attempts(TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION create_user_session(UUID, TEXT, TEXT, TEXT, TEXT, TIMESTAMP) TO service_role;

-- Create scheduled cleanup job (if pg_cron is available)
-- SELECT cron.schedule('cleanup-auth-tables', '0 2 * * *', $$
--   SELECT cleanup_rate_limit_logs();
--   SELECT cleanup_expired_sessions();
--   SELECT cleanup_old_password_history();
-- $$);

-- Comments for documentation
COMMENT ON TABLE rate_limit_logs IS 'Rate limiting logs for authentication endpoints';
COMMENT ON TABLE security_events IS 'Security event logging for authentication monitoring';
COMMENT ON TABLE user_sessions IS 'Active user sessions tracking';
COMMENT ON TABLE password_history IS 'Password history to prevent reuse';
COMMENT ON TABLE failed_login_attempts IS 'Failed login attempt tracking for account security';

COMMENT ON FUNCTION cleanup_rate_limit_logs IS 'Clean up old rate limiting logs';
COMMENT ON FUNCTION cleanup_expired_sessions IS 'Clean up expired user sessions';
COMMENT ON FUNCTION cleanup_old_password_history IS 'Clean up old password history entries';
COMMENT ON FUNCTION is_account_blocked IS 'Check if account is temporarily blocked';
COMMENT ON FUNCTION record_failed_login IS 'Record failed login attempt';
COMMENT ON FUNCTION clear_failed_login_attempts IS 'Clear failed attempts after successful login';
COMMENT ON FUNCTION create_user_session IS 'Create new user session with security tracking';

-- Migration completion log
INSERT INTO admin_actions (
  admin_user_id,
  action_type,
  action_details,
  ip_address,
  user_agent
) VALUES (
  NULL,
  'migration_completed',
  jsonb_build_object(
    'migration', '20250916_auth_security_enhancements',
    'timestamp', NOW(),
    'features_added', jsonb_build_array(
      'rate_limiting',
      'security_events',
      'session_tracking', 
      'password_history',
      'failed_login_protection'
    )
  ),
  'database',
  'migration_script'
);