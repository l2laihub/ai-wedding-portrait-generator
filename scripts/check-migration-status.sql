-- Check Enhanced Template Engine Migration Status

-- Check if tables exist
SELECT 
  'wedding_styles' as table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'wedding_styles'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
UNION ALL
SELECT 
  'template_engine_config' as table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'template_engine_config'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
UNION ALL
SELECT 
  'custom_themes' as table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'custom_themes'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
UNION ALL
SELECT 
  'template_cache' as table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'template_cache'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
UNION ALL
SELECT 
  'migration_log' as table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'migration_log'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;

-- Check if wedding styles are populated
SELECT 
  'Default Wedding Styles' as component,
  CASE WHEN EXISTS (SELECT 1 FROM wedding_styles WHERE id = 'classic-timeless') 
       THEN '✅ POPULATED (' || (SELECT COUNT(*)::text FROM wedding_styles) || ' styles)'
       ELSE '❌ EMPTY' END as status;

-- Check if enhanced columns exist on prompt_templates
SELECT 
  'Enhanced Prompt Templates' as component,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prompt_templates' AND column_name = 'template_variables'
  ) THEN '✅ ENHANCED' ELSE '❌ LEGACY' END as status;

-- Check if functions exist
SELECT 
  'get_template_engine_stats function' as component,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_name = 'get_template_engine_stats'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;