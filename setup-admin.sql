-- Simple Admin Setup Script
-- Run this directly in the Supabase SQL Editor

-- 1. Add role column to users table if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' 
  CHECK (role IN ('user', 'admin', 'super_admin'));

-- Create index for role lookups
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 2. Create simple admin actions audit log
CREATE TABLE IF NOT EXISTS admin_actions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  action_details JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS on admin actions
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;

-- 3. Create admin check function
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

-- 4. Create policy for admin actions
CREATE POLICY "Admins can view admin actions" ON admin_actions
  FOR SELECT USING (is_admin());

-- 5. Update existing policies for admin access
-- Users table policy for admin access
DROP POLICY IF EXISTS "Users can view own profile" ON users;
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (
    auth.uid() = id OR -- Users can view their own profile
    is_admin() -- Admins can view all profiles
  );

-- 6. Function to create first admin user
CREATE OR REPLACE FUNCTION create_first_admin(
  user_email TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  user_record RECORD;
BEGIN
  -- Find user by email
  SELECT * INTO user_record FROM users WHERE email = user_email;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User with email % not found', user_email;
  END IF;
  
  -- Update to admin role
  UPDATE users SET role = 'admin' WHERE id = user_record.id;
  
  -- Log the action
  INSERT INTO admin_actions (admin_user_id, action_type, action_details)
  VALUES (user_record.id, 'admin_user_created', jsonb_build_object('email', user_email));
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION is_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_first_admin(TEXT) TO authenticated;
GRANT SELECT ON admin_actions TO authenticated;

-- Example: To make yourself admin, run:
-- SELECT create_first_admin('your-email@example.com');

-- Query to check if setup worked:
-- SELECT email, role FROM users WHERE role IN ('admin', 'super_admin');