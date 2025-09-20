-- Check the actual column names in the database
-- Run this in Supabase SQL Editor to see what columns actually exist

-- Check package_usage columns
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'package_usage'
ORDER BY ordinal_position;

-- Check portrait_generations columns  
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'portrait_generations'
ORDER BY ordinal_position;

-- Check generation_requests columns
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'generation_requests'
ORDER BY ordinal_position;