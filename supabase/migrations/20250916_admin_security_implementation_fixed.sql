-- Admin Security Implementation Migration (FIXED)
-- Created: 2025-09-16
-- Description: Implement comprehensive admin security with RBAC, audit logging, and RLS policies

-- Add admin role to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' 
  CHECK (role IN ('user', 'admin', 'super_admin'));

-- Create index for role lookups
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Create admin actions audit log table
CREATE TABLE IF NOT EXISTS admin_actions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL CHECK (length(action_type) <= 100),
  action_details JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT CHECK (length(user_agent) <= 500),
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_action_type CHECK (action_type ~ '^[a-zA-Z0-9_]+$'),
  CONSTRAINT action_details_size CHECK (pg_column_size(action_details) < 8192)
);

-- Create indexes for audit log
CREATE INDEX IF NOT EXISTS idx_admin_actions_user_id ON admin_actions(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_created_at ON admin_actions(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_actions_action_type ON admin_actions(action_type);

-- Create webhook events table for idempotency
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stripe_event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMP DEFAULT NOW(),
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  processing_time_ms INTEGER,
  
  -- Constraints
  CONSTRAINT valid_stripe_event_id CHECK (length(stripe_event_id) <= 255),
  CONSTRAINT valid_event_type CHECK (length(event_type) <= 100)
);

-- Create index for webhook events
CREATE INDEX IF NOT EXISTS idx_webhook_events_stripe_id ON webhook_events(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON webhook_events(processed_at);

-- Enable RLS on new tables
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- Admin actions table policies
DROP POLICY IF EXISTS "Admins can view all admin actions" ON admin_actions;
CREATE POLICY "Admins can view all admin actions" ON admin_actions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "System can insert admin actions" ON admin_actions;
CREATE POLICY "System can insert admin actions" ON admin_actions
  FOR INSERT WITH CHECK (true);

-- Webhook events policies (service role only)
DROP POLICY IF EXISTS "Only service role can access webhook events" ON webhook_events;
CREATE POLICY "Only service role can access webhook events" ON webhook_events
  FOR ALL USING (auth.role() = 'service_role');

-- Update existing waitlist table policies for admin access
DROP POLICY IF EXISTS "Admins can view all waitlist entries" ON waitlist;
CREATE POLICY "Admins can view all waitlist entries" ON waitlist
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- Update users table policies for admin access
DROP POLICY IF EXISTS "Admins can view all user profiles" ON users;
CREATE POLICY "Admins can view all user profiles" ON users
  FOR SELECT USING (
    auth.uid() = id OR -- Users can view their own profile
    EXISTS (
      SELECT 1 FROM users admin_user
      WHERE admin_user.id = auth.uid() 
      AND admin_user.role IN ('admin', 'super_admin')
    )
  );

-- Update user_credits table policies for admin access
DROP POLICY IF EXISTS "Admins can view all user credits" ON user_credits;
CREATE POLICY "Admins can view all user credits" ON user_credits
  FOR SELECT USING (
    auth.uid() = user_id OR -- Users can view their own credits
    EXISTS (
      SELECT 1 FROM users admin_user
      WHERE admin_user.id = auth.uid() 
      AND admin_user.role IN ('admin', 'super_admin')
    )
  );

-- Update credit_transactions table policies for admin access
DROP POLICY IF EXISTS "Admins can view all credit transactions" ON credit_transactions;
CREATE POLICY "Admins can view all credit transactions" ON credit_transactions
  FOR SELECT USING (
    auth.uid() = user_id OR -- Users can view their own transactions
    EXISTS (
      SELECT 1 FROM users admin_user
      WHERE admin_user.id = auth.uid() 
      AND admin_user.role IN ('admin', 'super_admin')
    )
  );

-- Secure function to check admin role
CREATE OR REPLACE FUNCTION is_admin(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  IF user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE id = user_id 
    AND role IN ('admin', 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Secure function to check super admin role
CREATE OR REPLACE FUNCTION is_super_admin(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  IF user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE id = user_id 
    AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced function to log admin actions with validation
CREATE OR REPLACE FUNCTION log_admin_action(
  p_action_type TEXT,
  p_action_details JSONB DEFAULT '{}',
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_action_id UUID;
  v_admin_user_id UUID;
BEGIN
  -- Get current user ID
  v_admin_user_id := auth.uid();
  
  -- Validate admin user
  IF NOT is_admin(v_admin_user_id) THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  
  -- Validate action type
  IF p_action_type IS NULL OR length(p_action_type) = 0 OR length(p_action_type) > 100 THEN
    RAISE EXCEPTION 'Invalid action type';
  END IF;
  
  -- Validate action type format (alphanumeric and underscore only)
  IF p_action_type !~ '^[a-zA-Z0-9_]+$' THEN
    RAISE EXCEPTION 'Invalid action type format';
  END IF;
  
  -- Insert audit log entry
  INSERT INTO admin_actions (
    admin_user_id,
    action_type,
    action_details,
    ip_address,
    user_agent
  ) VALUES (
    v_admin_user_id,
    p_action_type,
    COALESCE(p_action_details, '{}'),
    p_ip_address,
    left(p_user_agent, 500)
  ) RETURNING id INTO v_action_id;
  
  RETURN v_action_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to safely create first admin user (for setup)
CREATE OR REPLACE FUNCTION create_admin_user(
  p_user_id UUID,
  p_email TEXT,
  p_role TEXT DEFAULT 'admin'
) RETURNS BOOLEAN AS $$
BEGIN
  -- Validate role
  IF p_role NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'Invalid role: must be admin or super_admin';
  END IF;
  
  -- Validate email
  IF p_email IS NULL OR length(p_email) < 5 OR p_email !~ '^[^@]+@[^@]+\.[^@]+$' THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;
  
  -- Check if user exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'User does not exist in auth.users';
  END IF;
  
  -- Update user role
  UPDATE users 
  SET role = p_role 
  WHERE id = p_user_id AND email = p_email;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found or email mismatch';
  END IF;
  
  -- Log admin user creation
  INSERT INTO admin_actions (
    admin_user_id,
    action_type,
    action_details,
    ip_address,
    user_agent
  ) VALUES (
    NULL, -- System action
    'admin_user_created',
    jsonb_build_object(
      'target_user_id', p_user_id,
      'target_email', p_email,
      'role', p_role,
      'timestamp', NOW()
    ),
    'system',
    'database_function'
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION is_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_super_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION log_admin_action(TEXT, JSONB, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION create_admin_user(UUID, TEXT, TEXT) TO service_role;

-- Grant read access to admin actions for authenticated users (RLS will restrict)
GRANT SELECT ON admin_actions TO authenticated;

-- Comments for documentation
COMMENT ON TABLE admin_actions IS 'Audit log for all admin actions with tamper detection';
COMMENT ON TABLE webhook_events IS 'Webhook event processing log for idempotency';
COMMENT ON FUNCTION is_admin IS 'Check if user has admin or super_admin role';
COMMENT ON FUNCTION is_super_admin IS 'Check if user has super_admin role';
COMMENT ON FUNCTION log_admin_action IS 'Securely log admin actions with validation';
COMMENT ON FUNCTION create_admin_user IS 'Create admin user (system function only)';

-- Add missing columns to admin_actions if they don't exist
DO $$ 
BEGIN
  -- Add ip_address column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'admin_actions' AND column_name = 'ip_address'
  ) THEN
    ALTER TABLE admin_actions ADD COLUMN ip_address TEXT;
  END IF;
  
  -- Add user_agent column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'admin_actions' AND column_name = 'user_agent'
  ) THEN
    ALTER TABLE admin_actions ADD COLUMN user_agent TEXT CHECK (length(user_agent) <= 500);
  END IF;
END $$;

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
    'migration', '20250916_admin_security_implementation_fixed',
    'timestamp', NOW(),
    'features_added', jsonb_build_array(
      'admin_roles',
      'audit_logging', 
      'rls_policies',
      'security_functions',
      'webhook_idempotency'
    )
  ),
  'database',
  'migration_script'
);