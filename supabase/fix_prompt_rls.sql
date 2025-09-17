-- Fix prompt_templates RLS to allow read access for generating prompts
-- The current policies only allow admin access, but regular users need to read prompts for generation

-- Check current policies on prompt_templates
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'prompt_templates';

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Admin users can view prompt templates" ON prompt_templates;
DROP POLICY IF EXISTS "Admin users can insert prompt templates" ON prompt_templates;
DROP POLICY IF EXISTS "Admin users can update prompt templates" ON prompt_templates;
DROP POLICY IF EXISTS "Admin users can delete prompt templates" ON prompt_templates;
DROP POLICY IF EXISTS "Service role can manage prompt templates" ON prompt_templates;

-- Create new policies that allow:
-- 1. Everyone (including anonymous) can READ prompts (needed for generation)
-- 2. Only admins can modify prompts

-- Allow everyone to read prompt templates (needed for AI generation)
CREATE POLICY "Everyone can read prompt templates" ON prompt_templates
  FOR SELECT USING (true);

-- Only admins can insert new prompt templates
CREATE POLICY "Admins can insert prompt templates" ON prompt_templates
  FOR INSERT WITH CHECK (is_current_user_admin());

-- Only admins can update prompt templates
CREATE POLICY "Admins can update prompt templates" ON prompt_templates
  FOR UPDATE USING (is_current_user_admin());

-- Only admins can delete prompt templates
CREATE POLICY "Admins can delete prompt templates" ON prompt_templates
  FOR DELETE USING (is_current_user_admin());

-- Service role can do everything
CREATE POLICY "Service role can manage prompt templates" ON prompt_templates
  FOR ALL USING (auth.role() = 'service_role');

-- Test the policies by selecting prompts
SELECT 'Testing prompt access...' as status;
SELECT id, type, name, version, is_default FROM prompt_templates ORDER BY type, version DESC;

-- Show final policies
SELECT 'Final policies on prompt_templates:' as info;
SELECT policyname, cmd, permissive FROM pg_policies WHERE tablename = 'prompt_templates';