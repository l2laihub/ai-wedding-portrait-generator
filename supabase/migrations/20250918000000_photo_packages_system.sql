-- Photo Packages System Migration
-- Creates the complete database schema for the multi-package photo generation system

BEGIN;

-- Create photo_packages table
CREATE TABLE photo_packages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL CHECK (category IN ('wedding', 'professional', 'celebration', 'artistic', 'portrait', 'family')),
  images_per_generation INTEGER DEFAULT 3 CHECK (images_per_generation BETWEEN 1 AND 5),
  base_prompt_template TEXT NOT NULL,
  generation_instructions JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  settings JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create package_themes table
CREATE TABLE package_themes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  package_id UUID REFERENCES photo_packages(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  setting_prompt TEXT NOT NULL,
  clothing_prompt TEXT,
  atmosphere_prompt TEXT,
  technical_prompt TEXT,
  style_modifiers JSONB DEFAULT '[]',
  color_palette JSONB DEFAULT '[]',
  inspiration_references JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  is_premium BOOLEAN DEFAULT false,
  is_seasonal BOOLEAN DEFAULT false,
  season_start DATE,
  season_end DATE,
  sort_order INTEGER DEFAULT 0,
  popularity_score INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_season CHECK (
    (is_seasonal = false) OR 
    (is_seasonal = true AND season_start IS NOT NULL AND season_end IS NOT NULL)
  ),
  CONSTRAINT unique_theme_per_package UNIQUE (package_id, name)
);

-- Create package_pricing_tiers table
CREATE TABLE package_pricing_tiers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  package_id UUID REFERENCES photo_packages(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  shoots_count INTEGER NOT NULL CHECK (shoots_count > 0),
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  original_price_cents INTEGER,
  badge VARCHAR(30),
  features JSONB DEFAULT '[]',
  restrictions JSONB DEFAULT '{}',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT price_consistency CHECK (
    original_price_cents IS NULL OR original_price_cents >= price_cents
  ),
  CONSTRAINT unique_tier_per_package UNIQUE (package_id, name)
);

-- Create package_analytics table
CREATE TABLE package_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  package_id UUID REFERENCES photo_packages(id) ON DELETE CASCADE,
  theme_id UUID REFERENCES package_themes(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  generation_count INTEGER DEFAULT 1,
  images_generated INTEGER,
  success_rate DECIMAL(5,2),
  processing_time_ms INTEGER,
  user_rating INTEGER CHECK (user_rating BETWEEN 1 AND 5),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update existing portrait_generations table
ALTER TABLE portrait_generations 
ADD COLUMN IF NOT EXISTS package_id UUID REFERENCES photo_packages(id),
ADD COLUMN IF NOT EXISTS package_theme_id UUID REFERENCES package_themes(id),
ADD COLUMN IF NOT EXISTS generation_settings JSONB DEFAULT '{}';

-- Create indexes for performance
CREATE INDEX idx_packages_active_featured ON photo_packages(is_active, is_featured, sort_order);
CREATE INDEX idx_packages_category ON photo_packages(category) WHERE is_active = true;
CREATE INDEX idx_packages_slug ON photo_packages(slug) WHERE is_active = true;

CREATE INDEX idx_package_themes_active ON package_themes(package_id, is_active, sort_order);
CREATE INDEX idx_package_themes_premium ON package_themes(package_id, is_premium) WHERE is_active = true;
CREATE INDEX idx_package_themes_seasonal ON package_themes(is_seasonal, season_start, season_end) WHERE is_active = true;

CREATE INDEX idx_pricing_tiers_package ON package_pricing_tiers(package_id, sort_order) WHERE is_active = true;
CREATE INDEX idx_pricing_tiers_default ON package_pricing_tiers(package_id, is_default) WHERE is_active = true;

CREATE INDEX idx_analytics_package_date ON package_analytics(package_id, created_at);
CREATE INDEX idx_analytics_theme_performance ON package_analytics(theme_id, user_rating, created_at);
CREATE INDEX idx_analytics_user_activity ON package_analytics(user_id, created_at);

CREATE INDEX idx_portrait_generations_package ON portrait_generations(package_id, created_at);

-- Create functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_packages_updated_at BEFORE UPDATE ON photo_packages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_themes_updated_at BEFORE UPDATE ON package_themes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to ensure only one default pricing tier per package
CREATE OR REPLACE FUNCTION ensure_single_default_tier()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_default = true THEN
        -- Unset other default tiers for this package
        UPDATE package_pricing_tiers 
        SET is_default = false 
        WHERE package_id = NEW.package_id 
        AND id != NEW.id 
        AND is_default = true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_single_default_tier_trigger 
    BEFORE INSERT OR UPDATE ON package_pricing_tiers
    FOR EACH ROW EXECUTE FUNCTION ensure_single_default_tier();

-- Create materialized view for package performance
CREATE MATERIALIZED VIEW package_performance_summary AS
SELECT 
    p.id,
    p.slug,
    p.name,
    p.category,
    p.is_active,
    p.is_featured,
    COUNT(DISTINCT pg.user_id) as unique_users,
    COUNT(pg.id) as total_generations,
    COUNT(pg.id) * p.images_per_generation as total_images_generated,
    AVG(pa.user_rating) as avg_rating,
    COUNT(DISTINCT pa.theme_id) as themes_used,
    AVG(pa.processing_time_ms) as avg_processing_time,
    AVG(pa.success_rate) as avg_success_rate,
    MAX(pg.created_at) as last_generation_at,
    p.created_at as package_created_at
FROM photo_packages p
LEFT JOIN portrait_generations pg ON pg.package_id = p.id
LEFT JOIN package_analytics pa ON pa.package_id = p.id
WHERE pg.created_at > NOW() - INTERVAL '30 days' OR pg.created_at IS NULL
GROUP BY p.id, p.slug, p.name, p.category, p.is_active, p.is_featured, p.images_per_generation, p.created_at
ORDER BY total_generations DESC NULLS LAST;

-- Create index on materialized view
CREATE INDEX idx_package_performance_summary_stats ON package_performance_summary(total_generations DESC, avg_rating DESC);

-- Function to refresh package performance summary
CREATE OR REPLACE FUNCTION refresh_package_performance()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW package_performance_summary;
END;
$$ LANGUAGE plpgsql;

-- RLS (Row Level Security) policies
ALTER TABLE photo_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_pricing_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_analytics ENABLE ROW LEVEL SECURITY;

-- Public read access for active packages and their components
CREATE POLICY "Public can view active packages" ON photo_packages
    FOR SELECT USING (is_active = true);

CREATE POLICY "Public can view active themes" ON package_themes
    FOR SELECT USING (
        is_active = true AND 
        EXISTS (SELECT 1 FROM photo_packages WHERE id = package_themes.package_id AND is_active = true)
    );

CREATE POLICY "Public can view active pricing tiers" ON package_pricing_tiers
    FOR SELECT USING (
        is_active = true AND 
        EXISTS (SELECT 1 FROM photo_packages WHERE id = package_pricing_tiers.package_id AND is_active = true)
    );

-- Admin access for all operations
CREATE POLICY "Admins can manage packages" ON photo_packages
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.is_admin = true
        )
    );

CREATE POLICY "Admins can manage themes" ON package_themes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.is_admin = true
        )
    );

CREATE POLICY "Admins can manage pricing tiers" ON package_pricing_tiers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.is_admin = true
        )
    );

-- Analytics: users can insert their own data, admins can view all
CREATE POLICY "Users can insert own analytics" ON package_analytics
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all analytics" ON package_analytics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.is_admin = true
        )
    );

-- Create default wedding package (migration from existing system)
INSERT INTO photo_packages (
    slug, 
    name, 
    category, 
    description, 
    images_per_generation, 
    base_prompt_template,
    is_active, 
    is_featured, 
    sort_order
) VALUES (
    'wedding-portraits',
    'Wedding Portraits',
    'wedding',
    'Beautiful AI wedding portraits in various romantic styles perfect for your special day',
    3,
    'Create a professional {portraitType} portrait in {theme} style. {themeDescription} {clothingDescription} {atmosphereDescription} {customPrompt} Maintain exact facial features and ensure high quality, romantic wedding photography output.',
    true,
    true,
    1
);

-- Get the wedding package ID for theme insertion
DO $$
DECLARE
    wedding_package_id UUID;
BEGIN
    SELECT id INTO wedding_package_id 
    FROM photo_packages 
    WHERE slug = 'wedding-portraits';
    
    -- Insert default wedding pricing tiers
    INSERT INTO package_pricing_tiers (package_id, name, shoots_count, price_cents, badge, features, sort_order, is_default) VALUES
    (wedding_package_id, 'Starter', 10, 499, NULL, '["10 photo shoots", "All wedding themes", "High resolution output", "Email support"]', 1, false),
    (wedding_package_id, 'Wedding', 25, 999, 'MOST POPULAR', '["25 photo shoots", "All wedding themes", "Priority processing", "Email support", "HD downloads"]', 2, true),
    (wedding_package_id, 'Party', 75, 2499, 'BEST VALUE', '["75 photo shoots", "All wedding themes", "Priority processing", "Premium support", "HD downloads", "Commercial license"]', 3, false);
END $$;

COMMIT;