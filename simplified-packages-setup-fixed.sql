-- =====================================================
-- SIMPLIFIED PHOTO PACKAGES SYSTEM (FIXED VERSION)
-- Creates 4 main packages with themes and prompts
-- =====================================================

-- Step 1: Add new columns to photo_packages table if they don't exist
DO $$
BEGIN
    -- Add single_prompt_template column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'photo_packages' 
        AND column_name = 'single_prompt_template'
    ) THEN
        ALTER TABLE photo_packages ADD COLUMN single_prompt_template TEXT;
    END IF;

    -- Add couple_prompt_template column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'photo_packages' 
        AND column_name = 'couple_prompt_template'
    ) THEN
        ALTER TABLE photo_packages ADD COLUMN couple_prompt_template TEXT;
    END IF;

    -- Add family_prompt_template column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'photo_packages' 
        AND column_name = 'family_prompt_template'
    ) THEN
        ALTER TABLE photo_packages ADD COLUMN family_prompt_template TEXT;
    END IF;
END $$;

-- Step 2: Clear existing data for fresh start
DELETE FROM package_themes;
DELETE FROM package_pricing_tiers;
DELETE FROM photo_packages;

-- Step 3: Create 4 main photo packages with all required prompts
INSERT INTO photo_packages (
    name, slug, description, category, is_active, is_featured, 
    base_prompt_template,
    single_prompt_template, 
    couple_prompt_template, 
    family_prompt_template,
    images_per_generation, sort_order
) VALUES 
-- Wedding Pack
(
    'Wedding Portraits',
    'wedding-portraits',
    'Classic wedding portrait styles with elegant themes for your special day',
    'wedding',
    true,
    true,
    'Professional wedding portrait, {setting_prompt}, {clothing_prompt}, {atmosphere_prompt}, {technical_prompt}, wedding day elegance and joy',
    'Professional wedding portrait of a bride in {setting_prompt}, {clothing_prompt}, {atmosphere_prompt}, {technical_prompt}, elegant bridal pose, radiant smile, wedding day magic',
    'Professional wedding portrait of a loving couple, {setting_prompt}, {clothing_prompt}, {atmosphere_prompt}, {technical_prompt}, romantic connection, wedding day joy, intimate moment',
    'Professional wedding portrait of a family of {family_count} celebrating, {setting_prompt}, {clothing_prompt}, {atmosphere_prompt}, {technical_prompt}, multi-generational wedding celebration, joyful family bonds',
    3,
    1
),
-- Engagement Pack  
(
    'Engagement Portraits',
    'engagement-portraits',
    'Romantic engagement portraits capturing your love story before the big day',
    'engagement',
    true,
    true,
    'Professional engagement portrait, {setting_prompt}, {clothing_prompt}, {atmosphere_prompt}, {technical_prompt}, romantic and joyful expressions, engagement session magic',
    'Professional engagement portrait of a person preparing for marriage, {setting_prompt}, {clothing_prompt}, {atmosphere_prompt}, {technical_prompt}, anticipation and joy, engagement session magic',
    'Professional engagement portrait of a loving couple, {setting_prompt}, {clothing_prompt}, {atmosphere_prompt}, {technical_prompt}, romantic and joyful expressions, intimate connection between partners, engagement session candid moments',
    'Professional engagement portrait of a family of {family_count} celebrating the upcoming marriage, {setting_prompt}, {clothing_prompt}, {atmosphere_prompt}, {technical_prompt}, family support and love, engagement celebration',
    3,
    2
),
-- Professional Headshots Pack
(
    'Professional Headshots',
    'professional-headshots',
    'LinkedIn-ready professional headshots that showcase your expertise and personality',
    'professional',
    true,
    true,
    'Professional business headshot portrait, {setting_prompt}, {clothing_prompt}, {atmosphere_prompt}, {technical_prompt}, confident and approachable expression, LinkedIn profile quality',
    'Professional business headshot portrait, {setting_prompt}, {clothing_prompt}, {atmosphere_prompt}, {technical_prompt}, confident and approachable expression, LinkedIn profile quality, executive presence',
    'Professional business portraits of business partners, {setting_prompt}, {clothing_prompt}, {atmosphere_prompt}, {technical_prompt}, professional collaboration, executive team presentation',
    'Professional family business portrait of {family_count} family members, {setting_prompt}, {clothing_prompt}, {atmosphere_prompt}, {technical_prompt}, family business legacy, professional multi-generational success',
    3,
    3
),
-- Anniversary Pack
(
    'Anniversary Photos',
    'anniversary-photos', 
    'Celebrate your love milestone with romantic anniversary portrait styles',
    'celebration',
    true,
    true,
    'Anniversary portrait celebrating milestone, {setting_prompt}, {clothing_prompt}, {atmosphere_prompt}, {technical_prompt}, reflection and gratitude, celebration joy',
    'Anniversary portrait celebrating personal milestone, {setting_prompt}, {clothing_prompt}, {atmosphere_prompt}, {technical_prompt}, reflection and gratitude, personal achievement celebration',
    'Anniversary portrait of a couple celebrating their love milestone, {setting_prompt}, {clothing_prompt}, {atmosphere_prompt}, {technical_prompt}, enduring love, romantic celebration, relationship milestone',
    'Anniversary portrait of a family of {family_count} celebrating their journey together, {setting_prompt}, {clothing_prompt}, {atmosphere_prompt}, {technical_prompt}, family milestone celebration, generational love',
    3,
    4
);

-- Step 4: Create Wedding Pack themes (migrate existing 12 wedding styles)
WITH wedding_pkg AS (SELECT id FROM photo_packages WHERE slug = 'wedding-portraits')
INSERT INTO package_themes (
    package_id, name, description, setting_prompt, clothing_prompt, atmosphere_prompt, technical_prompt,
    style_modifiers, color_palette, popularity_score, sort_order
) 
SELECT 
    wedding_pkg.id,
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
FROM wedding_pkg,
(VALUES
    ('Classic & Timeless', 'Elegant traditional wedding photography with timeless sophistication',
     'Elegant indoor chapel or mansion setting with soft natural light, classical architecture with columns',
     'Traditional wedding attire - flowing white gown with cathedral train, classic black tuxedo with bowtie',
     'Timeless romantic atmosphere with soft lighting, formal poses, traditional elegance',
     'Professional wedding photography, medium format camera aesthetic, classic composition',
     '["classic", "timeless", "elegant", "traditional"]', '["ivory", "gold", "soft_white", "champagne"]', 10, 1),
    
    ('Rustic Barn', 'Charming countryside wedding with rustic barn and natural elements',
     'Rustic barn venue with exposed wooden beams, hay bales, mason jar lighting, countryside backdrop',
     'Rustic wedding attire - lace wedding dress with boots, casual groom attire with suspenders',
     'Warm cozy atmosphere with natural lighting, casual romantic poses, country charm',
     'Natural lighting photography, warm color grading, rustic composition style',
     '["rustic", "country", "natural", "cozy"]', '["earth_tones", "warm_brown", "cream", "sage_green"]', 9, 2),
    
    ('Bohemian Beach', 'Free-spirited beach wedding with boho chic styling and ocean views',
     'Beautiful beach setting with ocean waves, driftwood altar, flowing fabric decorations, sunset backdrop',
     'Bohemian wedding attire - flowing bohemian dress with flower crown, linen shirt with rolled sleeves',
     'Carefree romantic atmosphere with ocean breeze, natural flowing poses, beach sunset magic',
     'Natural light beach photography, golden hour timing, candid moment capture',
     '["bohemian", "beach", "free_spirited", "natural"]', '["ocean_blue", "sandy_beige", "sunset_coral", "sea_foam"]', 9, 3),
    
    ('Vintage Victorian', 'Ornate Victorian elegance with vintage styling and period details',
     'Grand Victorian mansion setting with ornate furnishings, vintage wallpaper, antique decorations',
     'Vintage Victorian wedding attire - elaborate gown with bustle and high neckline, period-appropriate formal wear',
     'Formal sophisticated atmosphere with period elegance, classical poses, vintage romance',
     'Vintage photography style, rich color saturation, formal portrait composition',
     '["vintage", "victorian", "ornate", "period"]', '["deep_burgundy", "antique_gold", "royal_purple", "vintage_cream"]', 8, 4),
    
    ('Modern Minimalist', 'Clean contemporary wedding with minimalist design and architectural elements',
     'Modern architectural venue with clean lines, geometric shapes, floor-to-ceiling windows, urban skyline',
     'Modern minimalist wedding attire - sleek simple gown with clean lines, contemporary suit with modern cut',
     'Clean sophisticated atmosphere with geometric elements, contemporary poses, urban elegance',
     'Contemporary photography style, high contrast, architectural composition',
     '["modern", "minimalist", "clean", "architectural"]', '["pure_white", "charcoal_gray", "steel_blue", "accent_black"]', 8, 5),
    
    ('Fairytale Castle', 'Magical castle wedding with princess-like elegance and fantasy elements',
     'Majestic castle setting with grand staircases, stone archways, medieval architecture, royal gardens',
     'Fairytale wedding attire - ballgown with dramatic train and sparkles, royal formal wear with details',
     'Magical romantic atmosphere with royal elegance, dramatic poses, fairytale enchantment',
     'Cinematic photography style, dramatic lighting, fantasy portrait composition',
     '["fairytale", "royal", "magical", "dramatic"]', '["royal_blue", "princess_pink", "golden_yellow", "enchanted_purple"]', 9, 6),
    
    ('Enchanted Forest', 'Mystical woodland wedding surrounded by nature and magical forest elements',
     'Enchanted forest setting with towering trees, dappled sunlight, moss-covered rocks, woodland flowers',
     'Nature-inspired wedding attire - flowing dress with natural elements, earth-toned formal wear',
     'Mystical romantic atmosphere with natural magic, organic poses, forest enchantment',
     'Natural forest photography, dappled lighting effects, organic composition',
     '["enchanted", "forest", "mystical", "natural"]', '["forest_green", "earth_brown", "moss_green", "flower_accents"]', 8, 7),
    
    ('Tropical Paradise', 'Vibrant tropical wedding with lush greenery and exotic flowers',
     'Tropical paradise setting with palm trees, exotic flowers, crystal clear waters, lush vegetation',
     'Tropical wedding attire - lightweight flowing dress with tropical flowers, linen tropical formal wear',
     'Vibrant joyful atmosphere with tropical energy, playful poses, paradise celebration',
     'Tropical photography style, vibrant colors, paradise composition',
     '["tropical", "vibrant", "paradise", "exotic"]', '["tropical_turquoise", "hibiscus_red", "palm_green", "sunset_orange"]', 7, 8),
    
    ('Japanese Cherry Blossom', 'Serene Japanese-inspired wedding with cherry blossoms and zen elements',
     'Japanese garden setting with cherry blossom trees, traditional bridges, zen rock gardens, pagoda backdrop',
     'Japanese-inspired wedding attire - kimono-influenced dress with delicate details, formal wear with Japanese elements',
     'Serene peaceful atmosphere with zen tranquility, graceful poses, cultural elegance',
     'Japanese photography style, soft natural lighting, zen composition',
     '["japanese", "serene", "zen", "cultural"]', '["cherry_blossom_pink", "zen_white", "bamboo_green", "traditional_red"]', 7, 9),
    
    ('Steampunk Victorian', 'Alternative Victorian wedding with steampunk mechanical elements and vintage industrial style',
     'Steampunk venue with vintage machinery, brass fixtures, industrial elements, Victorian Gothic architecture',
     'Steampunk wedding attire - corset dress with gears and clockwork details, vest with pocket watch and goggles',
     'Alternative romantic atmosphere with mechanical intrigue, unique poses, steampunk adventure',
     'Steampunk photography style, sepia tones, vintage industrial composition',
     '["steampunk", "alternative", "mechanical", "vintage"]', '["brass_gold", "copper_brown", "steam_gray", "gear_silver"]', 6, 10),
    
    ('Disco 70s Glam', 'Retro 70s wedding with disco glamour and vintage party vibes',
     'Retro 70s venue with disco balls, neon lights, shag carpeting, vintage party decorations',
     'Retro 70s wedding attire - disco-era dress with sequins and bell sleeves, vintage suit with wide lapels',
     'Groovy party atmosphere with disco energy, retro poses, vintage celebration',
     'Retro photography style, warm vintage colors, disco composition',
     '["retro", "disco", "groovy", "vintage"]', '["disco_gold", "retro_orange", "vintage_brown", "neon_accents"]', 6, 11),
    
    ('Hollywood Red Carpet', 'Glamorous Hollywood wedding with red carpet elegance and movie star sophistication',
     'Hollywood red carpet setting with spotlights, paparazzi backdrop, luxury venue, movie premiere atmosphere',
     'Hollywood glamour wedding attire - red carpet worthy gown with dramatic details, celebrity-style formal wear',
     'Star-studded glamorous atmosphere with spotlight drama, celebrity poses, Hollywood magic',
     'Hollywood photography style, dramatic lighting, red carpet composition',
     '["hollywood", "glamorous", "celebrity", "dramatic"]', '["red_carpet_red", "hollywood_gold", "spotlight_white", "star_silver"]', 8, 12)
) AS theme(name, description, setting_prompt, clothing_prompt, atmosphere_prompt, technical_prompt, style_modifiers, color_palette, popularity_score, sort_order);

-- Step 5: Create Engagement Pack themes  
WITH engagement_pkg AS (SELECT id FROM photo_packages WHERE slug = 'engagement-portraits')
INSERT INTO package_themes (
    package_id, name, description, setting_prompt, clothing_prompt, atmosphere_prompt, technical_prompt,
    style_modifiers, color_palette, popularity_score, sort_order
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
     '["romantic", "intimate", "elegant", "timeless"]', '["soft_pastels", "cream", "blush", "sage_green"]', 10, 1),
     
    ('Golden Hour Glow', 'Magical outdoor engagement session during golden hour',
     'Beautiful outdoor location during golden hour - open field with tall grass, park with mature trees',
     'Casual romantic attire - flowing sundress or midi dress, casual button-up shirt or sweater',
     'Warm and dreamy atmosphere with golden sunlight, natural wind in hair, carefree energy',
     'Golden hour natural lighting, lens flares and bokeh effects, warm color temperature',
     '["warm", "dreamy", "natural", "joyful"]', '["golden_tones", "warm_earth", "sunset_hues"]', 9, 2),
     
    ('Urban Romance', 'Modern city engagement portraits with metropolitan backdrop',
     'Urban cityscape setting - rooftop with city skyline, modern downtown streets, industrial brick walls',
     'Modern chic attire - sleek dress or stylish jumpsuit, tailored jacket with clean lines',
     'Dynamic urban energy with romantic moments, city lights and architectural elements',
     'Urban photography style, architectural leading lines, high contrast lighting',
     '["modern", "chic", "dynamic", "confident"]', '["urban_grays", "modern_blacks", "city_blues"]', 8, 3)
) AS theme(name, description, setting_prompt, clothing_prompt, atmosphere_prompt, technical_prompt, style_modifiers, color_palette, popularity_score, sort_order);

-- Step 6: Create Professional Headshots themes
WITH professional_pkg AS (SELECT id FROM photo_packages WHERE slug = 'professional-headshots')
INSERT INTO package_themes (
    package_id, name, description, setting_prompt, clothing_prompt, atmosphere_prompt, technical_prompt,
    style_modifiers, color_palette, popularity_score, sort_order
) 
SELECT 
    professional_pkg.id,
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
FROM professional_pkg,
(VALUES
    ('Executive Business', 'Polished LinkedIn-ready executive headshots for corporate professionals',
     'Professional office setting with clean modern background, soft corporate lighting, minimal distractions',
     'Executive business attire - tailored suit, crisp shirt, professional tie or blouse, polished appearance',
     'Confident professional atmosphere with approachable warmth, executive presence, trustworthy demeanor',
     'Corporate headshot photography, professional lighting setup, clean composition, LinkedIn optimized',
     '["professional", "executive", "corporate", "trustworthy"]', '["navy_blue", "charcoal_gray", "crisp_white", "professional_burgundy"]', 10, 1),
     
    ('Creative Professional', 'Artistic professional headshots for creative industries and entrepreneurs',
     'Creative studio setting with interesting textures, artistic lighting, modern creative workspace background',
     'Smart casual creative attire - blazer with interesting details, stylish shirt, creative accessories',
     'Creative confident atmosphere with artistic flair, innovative spirit, approachable expertise',
     'Creative photography style, dynamic lighting, artistic composition, portfolio quality',
     '["creative", "artistic", "innovative", "approachable"]', '["creative_teal", "warm_gray", "accent_orange", "modern_black"]', 9, 2),
     
    ('Casual Professional', 'Approachable casual headshots for consultants and service professionals',
     'Relaxed professional setting with natural lighting, comfortable environment, approachable background',
     'Business casual attire - nice sweater or polo, professional but relaxed, welcoming appearance',
     'Warm approachable atmosphere with friendly confidence, accessible expertise, personable presence',
     'Natural light photography, warm tones, friendly composition, consulting professional style',
     '["casual", "approachable", "friendly", "accessible"]', '["warm_navy", "soft_gray", "friendly_blue", "approachable_green"]', 8, 3)
) AS theme(name, description, setting_prompt, clothing_prompt, atmosphere_prompt, technical_prompt, style_modifiers, color_palette, popularity_score, sort_order);

-- Step 7: Create Anniversary Photos themes
WITH anniversary_pkg AS (SELECT id FROM photo_packages WHERE slug = 'anniversary-photos')
INSERT INTO package_themes (
    package_id, name, description, setting_prompt, clothing_prompt, atmosphere_prompt, technical_prompt,
    style_modifiers, color_palette, popularity_score, sort_order
) 
SELECT 
    anniversary_pkg.id,
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
FROM anniversary_pkg,
(VALUES
    ('Romantic Milestone', 'Intimate anniversary portraits celebrating enduring love and relationship milestones',
     'Romantic intimate setting with soft lighting, meaningful location, cozy atmosphere, anniversary celebration backdrop',
     'Elegant anniversary attire - special occasion dress, nice suit or dress shirt, celebration styling',
     'Tender romantic atmosphere with deep connection, milestone celebration, enduring love, grateful joy',
     'Romantic portrait photography, warm intimate lighting, celebration composition, milestone documentation',
     '["romantic", "intimate", "milestone", "enduring"]', '["anniversary_gold", "romantic_rose", "celebration_champagne", "love_burgundy"]', 10, 1),
     
    ('Memory Lane', 'Nostalgic anniversary photos recreating special moments and celebrating your journey together',
     'Meaningful location from your relationship history, nostalgic setting, memory-rich environment, personal significance',
     'Casual elegant attire with personal touches, comfortable celebration wear, memory-making styling',
     'Nostalgic celebratory atmosphere with shared memories, grateful reflection, journey celebration, legacy building',
     'Documentary style photography, natural storytelling, memory preservation, journey documentation',
     '["nostalgic", "memorable", "personal", "journey"]', '["memory_sepia", "nostalgic_cream", "journey_blue", "legacy_brown"]', 9, 2),
     
    ('Celebration of Love', 'Joyful anniversary celebration with party elements and festive milestone recognition',
     'Festive celebration setting with anniversary decorations, party elements, milestone celebration backdrop',
     'Celebration attire - party dress or festive outfit, celebration styling, milestone recognition clothing',
     'Joyful celebratory atmosphere with party energy, milestone achievement, love celebration, festive joy',
     'Celebration photography style, vibrant lighting, party composition, milestone documentation',
     '["celebratory", "joyful", "festive", "achievement"]', '["celebration_gold", "party_silver", "festive_red", "joy_yellow"]', 8, 3)
) AS theme(name, description, setting_prompt, clothing_prompt, atmosphere_prompt, technical_prompt, style_modifiers, color_palette, popularity_score, sort_order);

-- Success message
SELECT 'Simplified Photo Packages system created successfully! ✅' as status,
       (SELECT COUNT(*) FROM photo_packages) as packages_count,
       (SELECT COUNT(*) FROM package_themes) as themes_count;