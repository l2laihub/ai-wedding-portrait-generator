-- Complete fix for admin access with CASCADE
-- This script handles all dependencies and recreates necessary policies

-- First, temporarily disable RLS on users table to fix the recursion
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Ensure admin@huybuilds.app has admin role
UPDATE users 
SET role = 'admin' 
WHERE email = 'admin@huybuilds.app';

-- Verify the update
SELECT id, email, role FROM users WHERE email = 'admin@huybuilds.app';

-- Drop ALL existing policies on users table to clean slate
DROP POLICY IF EXISTS "Admins can view all user profiles" ON users;
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Admins can update all user profiles" ON users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
DROP POLICY IF EXISTS "Users can insert their own credits" ON users;
DROP POLICY IF EXISTS "Service role bypass" ON users;
DROP POLICY IF EXISTS "Enable read access for all users" ON users;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON users;
DROP POLICY IF EXISTS "Enable update for users based on email" ON users;
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Admins view all profiles" ON users;
DROP POLICY IF EXISTS "Users update own profile" ON users;
DROP POLICY IF EXISTS "Admins update all profiles" ON users;

-- Drop existing functions with CASCADE (this will drop dependent policies)
-- We'll recreate the important ones after
DROP FUNCTION IF EXISTS is_admin(UUID) CASCADE;
DROP FUNCTION IF EXISTS is_current_user_admin() CASCADE;

-- Create a security definer function to check if a user is an admin
-- This bypasses RLS to avoid recursion
CREATE FUNCTION is_admin(user_id UUID)
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
CREATE FUNCTION is_current_user_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN is_admin(auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION is_admin(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION is_current_user_admin() TO authenticated, anon;

-- Re-enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create simple, non-recursive policies for users table
-- 1. Users can always view their own profile
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

-- 2. Admins can view all profiles (using security definer function)
CREATE POLICY "Admins view all profiles" ON users
  FOR SELECT USING (is_current_user_admin());

-- 3. Users can update their own profile
CREATE POLICY "Users update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- 4. Admins can update all profiles
CREATE POLICY "Admins update all profiles" ON users
  FOR UPDATE USING (is_current_user_admin());

-- 5. Service role can do anything
CREATE POLICY "Service role bypass" ON users
  FOR ALL USING (auth.role() = 'service_role');

-- Recreate admin_actions policies if the table exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_actions') THEN
    -- Create policy for admins to view admin actions
    CREATE POLICY "Admins can view admin actions" ON admin_actions
      FOR SELECT USING (is_current_user_admin());
      
    -- Service role can manage admin actions
    CREATE POLICY "Service role can manage admin actions" ON admin_actions
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

-- Fix prompt_templates policies if they exist
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'prompt_templates') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Admin users can view prompt templates" ON prompt_templates;
    DROP POLICY IF EXISTS "Admin users can insert prompt templates" ON prompt_templates;
    DROP POLICY IF EXISTS "Admin users can update prompt templates" ON prompt_templates;
    DROP POLICY IF EXISTS "Admin users can delete prompt templates" ON prompt_templates;
    
    -- Create new policies using the security definer function
    CREATE POLICY "Admin users can view prompt templates" ON prompt_templates
      FOR SELECT USING (is_current_user_admin());
    
    CREATE POLICY "Admin users can insert prompt templates" ON prompt_templates
      FOR INSERT WITH CHECK (is_current_user_admin());
    
    CREATE POLICY "Admin users can update prompt templates" ON prompt_templates
      FOR UPDATE USING (is_current_user_admin());
    
    CREATE POLICY "Admin users can delete prompt templates" ON prompt_templates
      FOR DELETE USING (is_current_user_admin());
      
    -- Service role bypass
    CREATE POLICY "Service role can manage prompt templates" ON prompt_templates
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

-- Fix rate_limits policies if they exist
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rate_limits') THEN
    DROP POLICY IF EXISTS "Admin can manage rate limits" ON rate_limits;
    
    CREATE POLICY "Admin can manage rate limits" ON rate_limits
      FOR ALL USING (is_current_user_admin());
      
    CREATE POLICY "Service role can manage rate limits" ON rate_limits
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

-- Fix api_keys policies if they exist
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'api_keys') THEN
    DROP POLICY IF EXISTS "Admin can manage API keys" ON api_keys;
    
    CREATE POLICY "Admin can manage API keys" ON api_keys
      FOR ALL USING (is_current_user_admin());
      
    CREATE POLICY "Service role can manage API keys" ON api_keys
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

-- Test the admin check
SELECT 
  email,
  role,
  is_admin(id) as is_admin_check,
  CASE 
    WHEN id = auth.uid() THEN 'Current User'
    ELSE 'Other User'
  END as user_status
FROM users 
WHERE email IN ('admin@huybuilds.app', 'l2laihub@gmail.com')
ORDER BY email;

-- Show final status
SELECT 'Admin access fix completed!' as status;
SELECT 'Admin users:' as info;
SELECT email, role FROM users WHERE role IN ('admin', 'super_admin');