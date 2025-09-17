-- Fix infinite recursion in users table RLS policies
-- This migration creates a security definer function to check admin status
-- and updates the RLS policies to avoid self-referencing queries

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Admins can view all user profiles" ON users;
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;

-- Create a security definer function to check if a user is an admin
-- This bypasses RLS to avoid recursion
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Return false if no user_id provided
  IF user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Get the user's role directly, bypassing RLS
  SELECT role INTO user_role
  FROM users
  WHERE id = user_id;
  
  -- Check if the role is admin or super_admin
  RETURN user_role IN ('admin', 'super_admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to check if the current user is an admin
CREATE OR REPLACE FUNCTION is_current_user_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN is_admin(auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on these functions
GRANT EXECUTE ON FUNCTION is_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_current_user_admin() TO authenticated;

-- Create new RLS policies that avoid recursion

-- Policy for users to view their own profile
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (auth.uid() = id);

-- Policy for admins to view all profiles (using the security definer function)
CREATE POLICY "Admins can view all user profiles" ON users
  FOR SELECT USING (is_current_user_admin());

-- Policy for users to update their own profile
CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Policy for admins to update any profile
CREATE POLICY "Admins can update all user profiles" ON users
  FOR UPDATE USING (is_current_user_admin());

-- Also fix the admin checking in other tables that might have similar issues
-- Update prompt_templates policies to use the new function
DROP POLICY IF EXISTS "Admin users can view prompt templates" ON prompt_templates;
DROP POLICY IF EXISTS "Admin users can insert prompt templates" ON prompt_templates;
DROP POLICY IF EXISTS "Admin users can update prompt templates" ON prompt_templates;
DROP POLICY IF EXISTS "Admin users can delete prompt templates" ON prompt_templates;

CREATE POLICY "Admin users can view prompt templates" ON prompt_templates
  FOR SELECT USING (is_current_user_admin());

CREATE POLICY "Admin users can insert prompt templates" ON prompt_templates
  FOR INSERT WITH CHECK (is_current_user_admin());

CREATE POLICY "Admin users can update prompt templates" ON prompt_templates
  FOR UPDATE USING (is_current_user_admin());

CREATE POLICY "Admin users can delete prompt templates" ON prompt_templates
  FOR DELETE USING (is_current_user_admin());

-- Update rate_limits policies
DROP POLICY IF EXISTS "Admin can manage rate limits" ON rate_limits;
CREATE POLICY "Admin can manage rate limits" ON rate_limits
  FOR ALL USING (is_current_user_admin());

-- Update api_keys policies
DROP POLICY IF EXISTS "Admin can manage API keys" ON api_keys;
CREATE POLICY "Admin can manage API keys" ON api_keys
  FOR ALL USING (is_current_user_admin());

-- Ensure the admin user has the correct role
-- Update the role for admin@huybuilds.app if needed
UPDATE users 
SET role = 'admin' 
WHERE email = 'admin@huybuilds.app' 
AND (role IS NULL OR role = 'user');

-- Add a comment explaining the fix
COMMENT ON FUNCTION is_admin IS 'Security definer function to check admin status without triggering RLS recursion';
COMMENT ON FUNCTION is_current_user_admin IS 'Check if the currently authenticated user is an admin';

-- Verification: Show admin users
SELECT email, role FROM users WHERE role IN ('admin', 'super_admin');