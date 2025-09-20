-- Fix admin visibility for generation tracking tables
-- Run this in Supabase SQL Editor

-- First ensure the admin user has the correct role
UPDATE users 
SET role = 'admin' 
WHERE email = 'admin@huybuilds.app' AND (role IS NULL OR role = 'user');

-- Check if policies already exist and drop them if they do
DROP POLICY IF EXISTS "Admins can view all generation requests" ON generation_requests;
DROP POLICY IF EXISTS "Admins can view all portrait generations" ON portrait_generations;
DROP POLICY IF EXISTS "Admins can view all usage analytics" ON usage_analytics;
DROP POLICY IF EXISTS "Admins can view all package usage" ON package_usage;

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

-- Add policy for admins to view all usage analytics
CREATE POLICY "Admins can view all usage analytics" ON usage_analytics
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('admin', 'super_admin')
  )
);

-- Add policy for admins to view all package usage
CREATE POLICY "Admins can view all package usage" ON package_usage
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('admin', 'super_admin')
  )
);

-- Verify the policies were created
SELECT 
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('generation_requests', 'portrait_generations', 'usage_analytics', 'package_usage')
AND policyname LIKE '%Admin%'
ORDER BY tablename, policyname;