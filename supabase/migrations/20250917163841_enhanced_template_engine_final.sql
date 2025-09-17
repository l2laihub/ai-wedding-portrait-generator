-- Enhanced Template Engine Migration
-- Extends the existing prompt_templates table with new template engine features

-- Add new columns for enhanced template features
ALTER TABLE prompt_templates 
ADD COLUMN IF NOT EXISTS template_variables JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS theme_config JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS style_presets JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS advanced_options JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'default',
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_prompt_templates_template_variables ON prompt_templates USING GIN (template_variables);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_theme_config ON prompt_templates USING GIN (theme_config);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_tags ON prompt_templates USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_category ON prompt_templates(category);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_author_id ON prompt_templates(author_id);

-- Create template_engine_config table for global settings
CREATE TABLE IF NOT EXISTS template_engine_config (
  id SERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create indexes for config table
CREATE INDEX IF NOT EXISTS idx_template_engine_config_key ON template_engine_config(key);
CREATE INDEX IF NOT EXISTS idx_template_engine_config_created_at ON template_engine_config(created_at);

-- Enable RLS on config table
ALTER TABLE template_engine_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies for config table
CREATE POLICY "Admin users can view template engine config"
  ON template_engine_config FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admin users can modify template engine config"
  ON template_engine_config FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- Create wedding_styles table for enhanced style management
CREATE TABLE IF NOT EXISTS wedding_styles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  popularity INTEGER DEFAULT 5 CHECK (popularity >= 1 AND popularity <= 10),
  color_palette TEXT[] DEFAULT '{}',
  mood TEXT[] DEFAULT '{}',
  setting TEXT,
  prompt_modifiers JSONB DEFAULT '[]',
  style_variations JSONB DEFAULT '[]',
  preview_image TEXT,
  inspiration_images TEXT[] DEFAULT '{}',
  assets JSONB DEFAULT '[]',
  enabled BOOLEAN DEFAULT true,
  featured BOOLEAN DEFAULT false,
  seasonal BOOLEAN DEFAULT false,
  premium_only BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create indexes for wedding_styles
CREATE INDEX IF NOT EXISTS idx_wedding_styles_category ON wedding_styles(category);
CREATE INDEX IF NOT EXISTS idx_wedding_styles_tags ON wedding_styles USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_wedding_styles_enabled ON wedding_styles(enabled);
CREATE INDEX IF NOT EXISTS idx_wedding_styles_featured ON wedding_styles(featured);
CREATE INDEX IF NOT EXISTS idx_wedding_styles_premium_only ON wedding_styles(premium_only);
CREATE INDEX IF NOT EXISTS idx_wedding_styles_popularity ON wedding_styles(popularity);

-- Enable RLS on wedding_styles
ALTER TABLE wedding_styles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for wedding_styles (read access for authenticated users, write for admins)
CREATE POLICY "Authenticated users can view enabled wedding styles"
  ON wedding_styles FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND enabled = true
  );

CREATE POLICY "Admin users can manage wedding styles"
  ON wedding_styles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- Create custom_themes table for user-created themes
CREATE TABLE IF NOT EXISTS custom_themes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  base_style_id TEXT REFERENCES wedding_styles(id) ON DELETE CASCADE,
  overrides JSONB DEFAULT '{}',
  variables JSONB DEFAULT '{}',
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  public BOOLEAN DEFAULT false,
  featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for custom_themes
CREATE INDEX IF NOT EXISTS idx_custom_themes_base_style_id ON custom_themes(base_style_id);
CREATE INDEX IF NOT EXISTS idx_custom_themes_user_id ON custom_themes(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_themes_public ON custom_themes(public);
CREATE INDEX IF NOT EXISTS idx_custom_themes_featured ON custom_themes(featured);

-- Enable RLS on custom_themes
ALTER TABLE custom_themes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for custom_themes
CREATE POLICY "Users can view their own custom themes"
  ON custom_themes FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can view public custom themes"
  ON custom_themes FOR SELECT
  USING (public = true);

CREATE POLICY "Users can manage their own custom themes"
  ON custom_themes FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Admin users can manage all custom themes"
  ON custom_themes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- Create template_cache table for caching compiled templates
CREATE TABLE IF NOT EXISTS template_cache (
  cache_key TEXT PRIMARY KEY,
  compiled_template JSONB NOT NULL,
  template_id TEXT,
  template_version INTEGER,
  variables_hash TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  hits INTEGER DEFAULT 0,
  last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for template_cache
CREATE INDEX IF NOT EXISTS idx_template_cache_template_id ON template_cache(template_id);
CREATE INDEX IF NOT EXISTS idx_template_cache_expires_at ON template_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_template_cache_last_accessed ON template_cache(last_accessed);
CREATE INDEX IF NOT EXISTS idx_template_cache_hits ON template_cache(hits);

-- No RLS on cache table as it's system-managed

-- Create migration_log table to track migration progress
CREATE TABLE IF NOT EXISTS migration_log (
  id SERIAL PRIMARY KEY,
  migration_id TEXT NOT NULL,
  step_id TEXT NOT NULL,
  step_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'rolled_back')),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for migration_log
CREATE INDEX IF NOT EXISTS idx_migration_log_migration_id ON migration_log(migration_id);
CREATE INDEX IF NOT EXISTS idx_migration_log_status ON migration_log(status);
CREATE INDEX IF NOT EXISTS idx_migration_log_created_at ON migration_log(created_at);

-- Update triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_template_engine_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_wedding_styles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_custom_themes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER trigger_update_template_engine_config_updated_at
  BEFORE UPDATE ON template_engine_config
  FOR EACH ROW
  EXECUTE FUNCTION update_template_engine_config_updated_at();

CREATE TRIGGER trigger_update_wedding_styles_updated_at
  BEFORE UPDATE ON wedding_styles
  FOR EACH ROW
  EXECUTE FUNCTION update_wedding_styles_updated_at();

CREATE TRIGGER trigger_update_custom_themes_updated_at
  BEFORE UPDATE ON custom_themes
  FOR EACH ROW
  EXECUTE FUNCTION update_custom_themes_updated_at();

-- Insert default template engine configuration
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
  }',
  'Main template engine configuration',
  NULL
),
(
  'cache_settings',
  '{
    "defaultTtl": 3600,
    "maxCacheSize": 1000,
    "cleanupInterval": 300
  }',
  'Cache configuration settings',
  NULL
),
(
  'migration_status',
  '{
    "lastMigrationDate": null,
    "currentVersion": "1.0.0",
    "migrationRequired": false
  }',
  'Migration status tracking',
  NULL
) ON CONFLICT (key) DO NOTHING;

-- Insert default wedding styles
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
  ]',
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
  ]',
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
  ]',
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
  ]',
  true,
  false,
  NULL
) ON CONFLICT (id) DO NOTHING;

-- Update existing prompt templates with enhanced fields
UPDATE prompt_templates 
SET 
  template_variables = '{}',
  theme_config = '{
    "supportedStyles": ["Classic & Timeless Wedding", "Rustic Barn Wedding", "Bohemian Beach Wedding"],
    "styleVariations": {},
    "defaultStyle": "Classic & Timeless Wedding",
    "customThemes": []
  }',
  advanced_options = '{
    "enableConditionals": false,
    "enableDynamicVariables": false, 
    "enableStyleVariations": true,
    "cacheSettings": {
      "enabled": true,
      "ttl": 3600,
      "invalidateOnVariableChange": true
    },
    "validationRules": []
  }',
  tags = ARRAY['migrated', type],
  category = 'legacy',
  description = 'Migrated from legacy template system'
WHERE template_variables IS NULL;

-- Function to cleanup expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM template_cache 
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to update cache access statistics
CREATE OR REPLACE FUNCTION update_cache_access(cache_key_param TEXT)
RETURNS void AS $$
BEGIN
  UPDATE template_cache 
  SET 
    hits = hits + 1,
    last_accessed = NOW()
  WHERE cache_key = cache_key_param;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT ALL ON template_engine_config TO service_role;
GRANT ALL ON wedding_styles TO service_role;
GRANT ALL ON custom_themes TO service_role;
GRANT ALL ON template_cache TO service_role;
GRANT ALL ON migration_log TO service_role;

-- Grant sequence permissions
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Create function to get template engine statistics
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

-- Comments for documentation
COMMENT ON TABLE template_engine_config IS 'Configuration settings for the enhanced template engine';
COMMENT ON TABLE wedding_styles IS 'Wedding style definitions with enhanced metadata and theming';
COMMENT ON TABLE custom_themes IS 'User-created custom themes based on existing styles';
COMMENT ON TABLE template_cache IS 'Cache for compiled template results to improve performance';
COMMENT ON TABLE migration_log IS 'Log of migration steps and their execution status';

COMMENT ON COLUMN prompt_templates.template_variables IS 'JSON definition of template variables and their configurations';
COMMENT ON COLUMN prompt_templates.theme_config IS 'Theme configuration including supported styles and variations';
COMMENT ON COLUMN prompt_templates.style_presets IS 'Array of predefined style presets for quick selection';
COMMENT ON COLUMN prompt_templates.advanced_options IS 'Advanced template engine options like caching and validation';
COMMENT ON COLUMN prompt_templates.tags IS 'Tags for categorizing and filtering templates';
COMMENT ON COLUMN prompt_templates.category IS 'Template category for organization';
COMMENT ON COLUMN prompt_templates.description IS 'Detailed description of template purpose and usage';

-- Create a view for enhanced template statistics
CREATE OR REPLACE VIEW template_engine_overview AS
SELECT 
  'Templates' as metric_type,
  'Total Templates' as metric_name,
  (SELECT COUNT(*) FROM prompt_templates)::TEXT as value
UNION ALL
SELECT 
  'Templates' as metric_type,
  'Enhanced Templates' as metric_name,
  (SELECT COUNT(*) FROM prompt_templates WHERE template_variables != '{}')::TEXT as value
UNION ALL
SELECT 
  'Styles' as metric_type,
  'Available Styles' as metric_name,
  (SELECT COUNT(*) FROM wedding_styles WHERE enabled = true)::TEXT as value
UNION ALL
SELECT 
  'Themes' as metric_type,
  'Custom Themes' as metric_name,
  (SELECT COUNT(*) FROM custom_themes)::TEXT as value
UNION ALL
SELECT 
  'Cache' as metric_type,
  'Active Cache Entries' as metric_name,
  (SELECT COUNT(*) FROM template_cache WHERE expires_at > NOW())::TEXT as value;

COMMENT ON VIEW template_engine_overview IS 'Overview of template engine metrics and statistics';

-- Log successful migration
INSERT INTO migration_log (migration_id, step_id, step_name, status, started_at, completed_at, metadata)
VALUES (
  'enhanced_template_engine_' || extract(epoch from now())::text,
  'schema_migration',
  'Enhanced Template Engine Schema Migration',
  'completed',
  NOW(),
  NOW(),
  '{"version": "1.0.0", "features": ["enhanced_templates", "theme_management", "template_cache", "custom_themes"]}'
);