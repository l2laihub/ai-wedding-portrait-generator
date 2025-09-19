-- =====================================================
-- PHOTO PACKAGES REMOTE DATABASE SETUP (FINAL VERSION)
-- Run this in Supabase Studio SQL Editor
-- Handles existing constraints and policies gracefully
-- =====================================================

-- Step 1: Create photo_packages table with updated constraint
CREATE TABLE IF NOT EXISTS photo_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    images_per_generation INTEGER DEFAULT 3,
    base_prompt_template TEXT NOT NULL,
    generation_instructions JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    settings JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 1.1: Update category constraint to include 'engagement'
DO $$
BEGIN
    -- Drop existing constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'photo_packages_category_check' 
        AND table_name = 'photo_packages'
    ) THEN
        ALTER TABLE photo_packages DROP CONSTRAINT photo_packages_category_check;
    END IF;
    
    -- Add updated constraint that includes 'engagement'
    ALTER TABLE photo_packages ADD CONSTRAINT photo_packages_category_check 
        CHECK (category::text = ANY (ARRAY['wedding'::text, 'engagement'::text, 'professional'::text, 'celebration'::text, 'artistic'::text, 'portrait'::text, 'family'::text]));
END $$;

-- Step 1.2: Add images_per_generation constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'photo_packages_images_per_generation_check' 
        AND table_name = 'photo_packages'
    ) THEN
        ALTER TABLE photo_packages ADD CONSTRAINT photo_packages_images_per_generation_check 
            CHECK (images_per_generation >= 1 AND images_per_generation <= 5);
    END IF;
END $$;

-- Step 2: Create package_themes table
CREATE TABLE IF NOT EXISTS package_themes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    sort_order INTEGER DEFAULT 0,
    popularity_score INTEGER DEFAULT 5,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2.1: Add unique constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'package_themes_package_id_name_key' 
        AND table_name = 'package_themes'
    ) THEN
        ALTER TABLE package_themes ADD CONSTRAINT package_themes_package_id_name_key UNIQUE(package_id, name);
    END IF;
END $$;

-- Step 3: Create package_pricing_tiers table  
CREATE TABLE IF NOT EXISTS package_pricing_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id UUID REFERENCES photo_packages(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    shoots_count INTEGER NOT NULL,
    price_cents INTEGER NOT NULL,
    original_price_cents INTEGER,
    badge VARCHAR(30),
    features JSONB DEFAULT '[]',
    restrictions JSONB DEFAULT '{}',
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3.1: Add constraints if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'package_pricing_tiers_package_id_name_key' 
        AND table_name = 'package_pricing_tiers'
    ) THEN
        ALTER TABLE package_pricing_tiers ADD CONSTRAINT package_pricing_tiers_package_id_name_key UNIQUE(package_id, name);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'package_pricing_tiers_price_cents_check' 
        AND table_name = 'package_pricing_tiers'
    ) THEN
        ALTER TABLE package_pricing_tiers ADD CONSTRAINT package_pricing_tiers_price_cents_check CHECK (price_cents >= 0);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'package_pricing_tiers_shoots_count_check' 
        AND table_name = 'package_pricing_tiers'
    ) THEN
        ALTER TABLE package_pricing_tiers ADD CONSTRAINT package_pricing_tiers_shoots_count_check CHECK (shoots_count > 0);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'price_consistency' 
        AND table_name = 'package_pricing_tiers'
    ) THEN
        ALTER TABLE package_pricing_tiers ADD CONSTRAINT price_consistency CHECK (original_price_cents IS NULL OR original_price_cents >= price_cents);
    END IF;
END $$;

-- Step 4: Enable RLS (Row Level Security) - Safe to run multiple times
ALTER TABLE photo_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_themes ENABLE ROW LEVEL SECURITY;  
ALTER TABLE package_pricing_tiers ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS Policies (Drop existing first to avoid conflicts)
DO $$
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Public can view active packages" ON photo_packages;
    DROP POLICY IF EXISTS "Public can view active themes" ON package_themes;
    DROP POLICY IF EXISTS "Public can view active pricing tiers" ON package_pricing_tiers;
    
    -- Create fresh policies
    CREATE POLICY "Public can view active packages" 
        ON photo_packages FOR SELECT 
        USING (is_active = true);

    CREATE POLICY "Public can view active themes" 
        ON package_themes FOR SELECT 
        USING (is_active = true AND EXISTS (
            SELECT 1 FROM photo_packages 
            WHERE photo_packages.id = package_themes.package_id 
            AND photo_packages.is_active = true
        ));

    CREATE POLICY "Public can view active pricing tiers" 
        ON package_pricing_tiers FOR SELECT 
        USING (is_active = true AND EXISTS (
            SELECT 1 FROM photo_packages 
            WHERE photo_packages.id = package_pricing_tiers.package_id 
            AND photo_packages.is_active = true
        ));
END $$;

-- Step 6: Create Engagement Portraits Package
INSERT INTO photo_packages (
    name, 
    slug, 
    description, 
    category, 
    is_active, 
    is_featured, 
    base_prompt_template, 
    images_per_generation, 
    sort_order
) VALUES (
    'Engagement Portraits',
    'engagement-portraits',
    'Beautiful engagement portraits with romantic themes for couples preparing for their wedding day',
    'engagement',
    true,
    true,
    'Professional engagement portrait photography of a loving couple, {setting_prompt}, {clothing_prompt}, {atmosphere_prompt}, {technical_prompt}, romantic and joyful expressions, intimate connection between partners, natural candid moments',
    3,
    2
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    updated_at = NOW();

-- Step 7: Create pricing tier
WITH engagement_pkg AS (SELECT id FROM photo_packages WHERE slug = 'engagement-portraits')
INSERT INTO package_pricing_tiers (package_id, name, shoots_count, price_cents, features, is_default, sort_order)
SELECT 
    engagement_pkg.id,
    'Standard Engagement',
    1,
    999,
    '["3 romantic themes", "High resolution", "Commercial license", "Instant download"]'::jsonb,
    true,
    1
FROM engagement_pkg
ON CONFLICT (package_id, name) DO NOTHING;

-- Step 8: Add 3 sample engagement themes
WITH engagement_pkg AS (SELECT id FROM photo_packages WHERE slug = 'engagement-portraits')
INSERT INTO package_themes (
    package_id, 
    name, 
    description, 
    setting_prompt, 
    clothing_prompt, 
    atmosphere_prompt, 
    technical_prompt,
    style_modifiers,
    color_palette,
    popularity_score,
    sort_order
) 
SELECT 
    engagement_pkg.id,
    theme.name,
    theme.description,
    theme.setting_prompt,
    theme.clothing_prompt,
    theme.atmosphere_prompt,
    theme.technical_prompt,
    theme.style_modifiers::jsonb,
    theme.color_palette::jsonb,
    theme.popularity_score,
    theme.sort_order
FROM engagement_pkg,
(VALUES
    ('Classic Romance', 'Timeless engagement portraits with elegant sophistication', 
     'Elegant indoor setting with soft natural light from large windows, classic architecture',
     'Sophisticated engagement attire - flowing midi or maxi dress in soft colors, well-fitted blazer',
     'Intimate and romantic atmosphere with soft golden lighting, gentle touches and loving gazes',
     'Professional portrait lighting, medium format camera aesthetic, shallow depth of field',
     '["romantic", "intimate", "elegant", "timeless"]',
     '["soft_pastels", "cream", "blush", "sage_green"]',
     10, 1),
    ('Golden Hour Glow', 'Magical outdoor engagement session during golden hour',
     'Beautiful outdoor location during golden hour - open field with tall grass, park with mature trees',
     'Casual romantic attire - flowing sundress or midi dress, casual button-up shirt or sweater',
     'Warm and dreamy atmosphere with golden sunlight, natural wind in hair, carefree energy',
     'Golden hour natural lighting, lens flares and bokeh effects, warm color temperature',
     '["warm", "dreamy", "natural", "joyful"]',
     '["golden_tones", "warm_earth", "sunset_hues"]',
     9, 2),
    ('Urban Romance', 'Modern city engagement portraits with metropolitan backdrop',
     'Urban cityscape setting - rooftop with city skyline, modern downtown streets, industrial brick walls',
     'Modern chic attire - sleek dress or stylish jumpsuit, tailored jacket with clean lines',
     'Dynamic urban energy with romantic moments, city lights and architectural elements',
     'Urban photography style, architectural leading lines, high contrast lighting',
     '["modern", "chic", "dynamic", "confident"]',
     '["urban_grays", "modern_blacks", "city_blues"]',
     8, 3)
) AS theme(name, description, setting_prompt, clothing_prompt, atmosphere_prompt, technical_prompt, style_modifiers, color_palette, popularity_score, sort_order)
ON CONFLICT (package_id, name) DO NOTHING;

-- Success message
SELECT 'Photo Packages system successfully deployed! ✅' as status,
       (SELECT COUNT(*) FROM photo_packages) as packages_count,
       (SELECT COUNT(*) FROM package_themes) as themes_count,
       (SELECT COUNT(*) FROM package_pricing_tiers) as pricing_tiers_count;