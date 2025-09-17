-- Check if prompt_templates table exists and has data
SELECT 'Checking prompt_templates table...' as status;

-- Check if table exists
SELECT 
  table_name,
  table_schema
FROM information_schema.tables 
WHERE table_name = 'prompt_templates';

-- Check prompt templates data
SELECT 
  id,
  type,
  name,
  version,
  is_default,
  created_at,
  updated_at,
  LENGTH(template) as template_length
FROM prompt_templates 
ORDER BY type, version DESC;

-- Check if we can call the admin functions
SELECT 'Testing admin functions...' as status;
SELECT is_current_user_admin() as is_admin_test;