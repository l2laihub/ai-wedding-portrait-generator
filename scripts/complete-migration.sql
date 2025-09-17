-- Complete Enhanced Template Engine Migration
-- This script handles cases where parts of the migration already exist

-- Insert default wedding styles (ignore if already exist)
INSERT INTO wedding_styles (
  id, name, description, category, tags, popularity, color_palette, mood, setting,
  prompt_modifiers, enabled, featured, created_by
) VALUES
(
  'classic-timeless',
  'Classic & Timeless Wedding',
  'Elegant, sophisticated, and eternally beautiful',
  'traditional',
  ARRAY['elegant', 'sophisticated', 'traditional', 'formal'],
  9,
  ARRAY['#FFFFFF', '#F8F8FF', '#E6E6FA', '#D3D3D3'],
  ARRAY['elegant', 'sophisticated', 'romantic', 'refined'],
  'Traditional church or elegant venue with classical architecture',
  '[
    {
      "type": "prepend",
      "content": "In an elegant, sophisticated style with classical elements,"
    },
    {
      "type": "append", 
      "content": "with timeless elegance, perfect lighting, and refined composition"
    }
  ]'::jsonb,
  true,
  true,
  NULL
),
(
  'rustic-barn',
  'Rustic Barn Wedding',
  'Cozy, natural, and charmingly rustic',
  'traditional',
  ARRAY['rustic', 'natural', 'cozy', 'country'],
  8,
  ARRAY['#8B4513', '#DEB887', '#F5DEB3', '#D2691E'],
  ARRAY['cozy', 'natural', 'warm', 'intimate'],
  'Rustic barn with wooden beams, string lights, and natural elements',
  '[
    {
      "type": "prepend",
      "content": "In a cozy, rustic barn setting with natural wooden elements,"
    },
    {
      "type": "append",
      "content": "with warm lighting, natural textures, and countryside charm"
    }
  ]'::jsonb,
  true,
  true,
  NULL
),
(
  'bohemian-beach',
  'Bohemian Beach Wedding',
  'Free-spirited, natural, and oceanside romance',
  'modern',
  ARRAY['bohemian', 'beach', 'natural', 'free-spirited'],
  7,
  ARRAY['#87CEEB', '#F0E68C', '#DDA0DD', '#98FB98'],
  ARRAY['free-spirited', 'natural', 'romantic', 'relaxed'],
  'Beautiful beach with flowing fabrics, natural flowers, and ocean views',
  '[
    {
      "type": "prepend",
      "content": "In a free-spirited bohemian beach setting with flowing elements,"
    },
    {
      "type": "append",
      "content": "with ocean breeze, natural lighting, and ethereal atmosphere"
    }
  ]'::jsonb,
  true,
  true,
  NULL
),
(
  'fairytale-castle',
  'Fairytale Castle Wedding',
  'Magical, grand, and storybook romance',
  'fantasy',
  ARRAY['fairytale', 'magical', 'grand', 'princess'],
  6,
  ARRAY['#FFB6C1', '#E6E6FA', '#FFD700', '#F0F8FF'],
  ARRAY['magical', 'grand', 'romantic', 'enchanting'],
  'Majestic castle with towers, grand staircases, and magical atmosphere',
  '[
    {
      "type": "prepend",
      "content": "In a magical fairytale castle with grand architecture,"
    },
    {
      "type": "append",
      "content": "with enchanting atmosphere, regal elegance, and storybook magic"
    }
  ]'::jsonb,
  true,
  false,
  NULL
) ON CONFLICT (id) DO NOTHING;

-- Insert default template engine configuration (ignore if already exist)
INSERT INTO template_engine_config (key, value, description, created_by) VALUES
(
  'engine_settings',
  '{
    "enableCaching": true,
    "cacheProvider": "database",
    "validationLevel": "normal",
    "allowUnsafeVariables": false,
    "maxTemplateSize": 10000,
    "maxVariableCount": 50,
    "enableDebugMode": false
  }'::jsonb,
  'Main template engine configuration',
  NULL
),
(
  'cache_settings',
  '{
    "defaultTtl": 3600,
    "maxCacheSize": 1000,
    "cleanupInterval": 300
  }'::jsonb,
  'Cache configuration settings',
  NULL
),
(
  'migration_status',
  '{
    "lastMigrationDate": null,
    "currentVersion": "1.0.0",
    "migrationRequired": false
  }'::jsonb,
  'Migration status tracking',
  NULL
) ON CONFLICT (key) DO NOTHING;

-- Create functions if they don't exist
CREATE OR REPLACE FUNCTION get_template_engine_stats()
RETURNS TABLE (
  total_templates INTEGER,
  enhanced_templates INTEGER,
  total_styles INTEGER,
  custom_themes INTEGER,
  cache_entries INTEGER,
  cache_hit_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*)::INTEGER FROM prompt_templates) as total_templates,
    (SELECT COUNT(*)::INTEGER FROM prompt_templates WHERE template_variables != '{}') as enhanced_templates,
    (SELECT COUNT(*)::INTEGER FROM wedding_styles WHERE enabled = true) as total_styles,
    (SELECT COUNT(*)::INTEGER FROM custom_themes) as custom_themes,
    (SELECT COUNT(*)::INTEGER FROM template_cache WHERE expires_at > NOW()) as cache_entries,
    (
      CASE 
        WHEN (SELECT SUM(hits) FROM template_cache) > 0 
        THEN (SELECT SUM(hits)::NUMERIC / COUNT(*)::NUMERIC FROM template_cache)
        ELSE 0
      END
    ) as cache_hit_rate;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT ALL ON wedding_styles TO service_role;
GRANT ALL ON template_engine_config TO service_role;
GRANT ALL ON custom_themes TO service_role;
GRANT ALL ON template_cache TO service_role;
GRANT ALL ON migration_log TO service_role;

-- Grant sequence permissions
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Log successful completion
INSERT INTO migration_log (migration_id, step_id, step_name, status, started_at, completed_at, metadata)
VALUES (
  'enhanced_template_engine_completion_' || extract(epoch from now())::text,
  'completion_check',
  'Enhanced Template Engine Migration Completion',
  'completed',
  NOW(),
  NOW(),
  '{"version": "1.0.0", "completion_method": "manual_sql"}'
) ON CONFLICT DO NOTHING;