-- Photo Packages System - Corrected Final Migration
-- Fixes all schema conflicts and ensures proper table structure

BEGIN;

-- ==========================================
-- 1. CREATE MISSING FOUNDATION TABLES
-- ==========================================

-- Create portrait_generations table if it doesn't exist
CREATE TABLE IF NOT EXISTS portrait_generations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT,
  portrait_type TEXT NOT NULL CHECK (portrait_type IN ('single', 'couple', 'family')),
  theme TEXT,
  custom_prompt TEXT,
  image_urls JSONB DEFAULT '[]',
  generation_status TEXT DEFAULT 'pending' CHECK (generation_status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  processing_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_profiles table if it doesn't exist (for admin RLS policies)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  display_name TEXT,
  is_admin BOOLEAN DEFAULT false,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 2. CREATE PHOTO PACKAGES TABLES
-- ==========================================

-- Create photo_packages table with corrected structure
CREATE TABLE IF NOT EXISTS photo_packages (
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
CREATE TABLE IF NOT EXISTS package_themes (
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
CREATE TABLE IF NOT EXISTS package_pricing_tiers (
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

-- Create package_usage table (referenced by rate limiting)
CREATE TABLE IF NOT EXISTS package_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  package_id UUID REFERENCES photo_packages(id) ON DELETE CASCADE,
  tier_id UUID REFERENCES package_pricing_tiers(id) ON DELETE SET NULL,
  credits_used INTEGER DEFAULT 1,
  generations_count INTEGER DEFAULT 1,
  themes_used TEXT[] DEFAULT '{}',
  session_id TEXT,
  upload_type TEXT DEFAULT 'couple',
  processing_time INTEGER,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  error_message TEXT,
  result_quality_score INTEGER,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create package_analytics table
CREATE TABLE IF NOT EXISTS package_analytics (
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

-- ==========================================
-- 3. UPDATE EXISTING TABLES
-- ==========================================

-- Update portrait_generations table to include package references
ALTER TABLE portrait_generations 
ADD COLUMN IF NOT EXISTS package_id UUID REFERENCES photo_packages(id),
ADD COLUMN IF NOT EXISTS package_theme_id UUID REFERENCES package_themes(id),
ADD COLUMN IF NOT EXISTS generation_settings JSONB DEFAULT '{}';

-- Update credit_transactions for package tracking
ALTER TABLE credit_transactions 
ADD COLUMN IF NOT EXISTS package_id UUID REFERENCES photo_packages(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS tier_id UUID REFERENCES package_pricing_tiers(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS usage_id UUID REFERENCES package_usage(id) ON DELETE SET NULL;

-- Update usage_analytics for package tracking
ALTER TABLE usage_analytics 
ADD COLUMN IF NOT EXISTS package_id UUID REFERENCES photo_packages(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS tier_used TEXT,
ADD COLUMN IF NOT EXISTS themes_used TEXT[],
ADD COLUMN IF NOT EXISTS processing_time INTEGER;

-- ==========================================
-- 4. CREATE INDEXES
-- ==========================================

-- Foundation table indexes
CREATE INDEX IF NOT EXISTS idx_portrait_generations_user_id ON portrait_generations(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_portrait_generations_package ON portrait_generations(package_id, created_at);
CREATE INDEX IF NOT EXISTS idx_portrait_generations_status ON portrait_generations(generation_status, created_at);

CREATE INDEX IF NOT EXISTS idx_user_profiles_admin ON user_profiles(is_admin) WHERE is_admin = true;
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);

-- Package system indexes
CREATE INDEX IF NOT EXISTS idx_packages_active_featured ON photo_packages(is_active, is_featured, sort_order);
CREATE INDEX IF NOT EXISTS idx_packages_category ON photo_packages(category) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_packages_slug ON photo_packages(slug) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_package_themes_active ON package_themes(package_id, is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_package_themes_premium ON package_themes(package_id, is_premium) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_pricing_tiers_package ON package_pricing_tiers(package_id, sort_order) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_pricing_tiers_default ON package_pricing_tiers(package_id, is_default) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_package_usage_user_package ON package_usage(user_id, package_id, created_at);
CREATE INDEX IF NOT EXISTS idx_package_usage_status ON package_usage(status, created_at);

CREATE INDEX IF NOT EXISTS idx_analytics_package_date ON package_analytics(package_id, created_at);

-- Updated table indexes
CREATE INDEX IF NOT EXISTS idx_credit_transactions_package_id ON credit_transactions(package_id);
CREATE INDEX IF NOT EXISTS idx_usage_analytics_package_id ON usage_analytics(package_id);

-- ==========================================
-- 5. CREATE FUNCTIONS
-- ==========================================

-- Function for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_packages_updated_at ON photo_packages;
CREATE TRIGGER update_packages_updated_at BEFORE UPDATE ON photo_packages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_themes_updated_at ON package_themes;
CREATE TRIGGER update_themes_updated_at BEFORE UPDATE ON package_themes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_portrait_generations_updated_at ON portrait_generations;
CREATE TRIGGER update_portrait_generations_updated_at BEFORE UPDATE ON portrait_generations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to ensure only one default pricing tier per package
CREATE OR REPLACE FUNCTION ensure_single_default_tier()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_default = true THEN
        UPDATE package_pricing_tiers 
        SET is_default = false 
        WHERE package_id = NEW.package_id 
        AND id != NEW.id 
        AND is_default = true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ensure_single_default_tier_trigger ON package_pricing_tiers;
CREATE TRIGGER ensure_single_default_tier_trigger 
    BEFORE INSERT OR UPDATE ON package_pricing_tiers
    FOR EACH ROW EXECUTE FUNCTION ensure_single_default_tier();

-- ==========================================
-- 6. RLS POLICIES
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE portrait_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_pricing_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_analytics ENABLE ROW LEVEL SECURITY;

-- Portrait generations policies
DROP POLICY IF EXISTS "Users can view own generations" ON portrait_generations;
CREATE POLICY "Users can view own generations" ON portrait_generations
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own generations" ON portrait_generations;
CREATE POLICY "Users can insert own generations" ON portrait_generations
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- User profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
CREATE POLICY "Admins can view all profiles" ON user_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.is_admin = true
        )
    );

-- Package system policies
DROP POLICY IF EXISTS "Public can view active packages" ON photo_packages;
CREATE POLICY "Public can view active packages" ON photo_packages
    FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage packages" ON photo_packages;
CREATE POLICY "Admins can manage packages" ON photo_packages
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.is_admin = true
        )
    );

DROP POLICY IF EXISTS "Public can view active themes" ON package_themes;
CREATE POLICY "Public can view active themes" ON package_themes
    FOR SELECT USING (
        is_active = true AND 
        EXISTS (SELECT 1 FROM photo_packages WHERE id = package_themes.package_id AND is_active = true)
    );

DROP POLICY IF EXISTS "Admins can manage themes" ON package_themes;
CREATE POLICY "Admins can manage themes" ON package_themes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.is_admin = true
        )
    );

DROP POLICY IF EXISTS "Public can view active pricing tiers" ON package_pricing_tiers;
CREATE POLICY "Public can view active pricing tiers" ON package_pricing_tiers
    FOR SELECT USING (
        is_active = true AND 
        EXISTS (SELECT 1 FROM photo_packages WHERE id = package_pricing_tiers.package_id AND is_active = true)
    );

DROP POLICY IF EXISTS "Admins can manage pricing tiers" ON package_pricing_tiers;
CREATE POLICY "Admins can manage pricing tiers" ON package_pricing_tiers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.is_admin = true
        )
    );

-- Package usage policies
DROP POLICY IF EXISTS "Users can view own usage" ON package_usage;
CREATE POLICY "Users can view own usage" ON package_usage
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own usage" ON package_usage;
CREATE POLICY "Users can insert own usage" ON package_usage
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- ==========================================
-- 7. INSERT DEFAULT DATA
-- ==========================================

-- Create default wedding package
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
) ON CONFLICT (slug) DO NOTHING;

-- Insert default wedding pricing tiers
DO $$
DECLARE
    wedding_package_id UUID;
BEGIN
    SELECT id INTO wedding_package_id 
    FROM photo_packages 
    WHERE slug = 'wedding-portraits';
    
    IF wedding_package_id IS NOT NULL THEN
        INSERT INTO package_pricing_tiers (package_id, name, shoots_count, price_cents, badge, features, sort_order, is_default) VALUES
        (wedding_package_id, 'Starter', 10, 499, NULL, '["10 photo shoots", "All wedding themes", "High resolution output", "Email support"]', 1, false),
        (wedding_package_id, 'Wedding', 25, 999, 'MOST POPULAR', '["25 photo shoots", "All wedding themes", "Priority processing", "Email support", "HD downloads"]', 2, true),
        (wedding_package_id, 'Party', 75, 2499, 'BEST VALUE', '["75 photo shoots", "All wedding themes", "Priority processing", "Premium support", "HD downloads", "Commercial license"]', 3, false)
        ON CONFLICT (package_id, name) DO NOTHING;
    END IF;
END $$;

-- ==========================================
-- 8. GRANT PERMISSIONS
-- ==========================================

-- Grant service role permissions
GRANT ALL ON portrait_generations TO service_role;
GRANT ALL ON user_profiles TO service_role;
GRANT ALL ON photo_packages TO service_role;
GRANT ALL ON package_themes TO service_role;
GRANT ALL ON package_pricing_tiers TO service_role;
GRANT ALL ON package_usage TO service_role;
GRANT ALL ON package_analytics TO service_role;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

COMMIT;

-- Success notification
DO $$
BEGIN
  RAISE NOTICE 'Photo Packages System - Corrected Final Migration completed successfully!';
  RAISE NOTICE 'Created tables: portrait_generations, user_profiles, photo_packages, package_themes, package_pricing_tiers, package_usage, package_analytics';
  RAISE NOTICE 'Fixed all table references and data type consistency';
  RAISE NOTICE 'Installed proper RLS policies and indexes';
END $$;