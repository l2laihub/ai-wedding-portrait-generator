-- Fix admin visibility for generation tracking tables
-- This migration adds RLS policies to allow admins to view all generation data
-- Updated to use users.role instead of admin_users table

-- First ensure the admin user has the correct role
UPDATE users 
SET role = 'admin' 
WHERE email = 'admin@huybuilds.app' AND (role IS NULL OR role = 'user');

-- Add policy for admins to view all generation requests
CREATE POLICY "Admins can view all generation requests" ON generation_requests
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('admin', 'super_admin')
  )
);

-- Add policy for admins to view all portrait generations
CREATE POLICY "Admins can view all portrait generations" ON portrait_generations
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('admin', 'super_admin')
  )
);

-- Also ensure admins can see all usage analytics (if not already present)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'usage_analytics' 
    AND policyname = 'Admins can view all usage analytics'
  ) THEN
    CREATE POLICY "Admins can view all usage analytics" ON usage_analytics
    FOR SELECT TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role IN ('admin', 'super_admin')
      )
    );
  END IF;
END $$;

-- Add a policy for package_usage if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'package_usage' 
    AND policyname = 'Admins can view all package usage'
  ) THEN
    CREATE POLICY "Admins can view all package usage" ON package_usage
    FOR SELECT TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role IN ('admin', 'super_admin')
      )
    );
  END IF;
END $$;