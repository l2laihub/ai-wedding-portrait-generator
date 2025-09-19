-- Seed data for package themes
-- Run this after the photo packages migration to add sample themes

-- Add themes to the default wedding package
DO $$
DECLARE
    wedding_package_id UUID;
BEGIN
    -- Get the wedding package ID
    SELECT id INTO wedding_package_id 
    FROM photo_packages 
    WHERE slug = 'wedding-portraits';
    
    IF wedding_package_id IS NOT NULL THEN
        -- Insert wedding themes
        INSERT INTO package_themes (
            package_id, 
            name, 
            description, 
            setting_prompt, 
            clothing_prompt, 
            atmosphere_prompt, 
            technical_prompt,
            is_active,
            is_premium,
            sort_order,
            popularity_score
        ) VALUES
        -- Classic themes
        (
            wedding_package_id,
            'Classic Elegance',
            'Timeless wedding portraits with sophisticated styling',
            'Classic wedding portrait in an elegant ballroom or luxury hotel setting',
            'Traditional wedding attire - white wedding dress with veil for bride, black tuxedo with bow tie for groom',
            'Sophisticated and timeless atmosphere with crystal chandeliers, marble columns, soft golden lighting',
            'Professional studio lighting, medium format camera quality, shallow depth of field, classic portrait composition',
            true,
            false,
            1,
            10
        ),
        (
            wedding_package_id,
            'Romantic Garden',
            'Enchanting outdoor wedding portraits in blooming gardens',
            'Beautiful garden wedding setting with blooming roses, wisteria, and lush greenery',
            'Flowing wedding dress with floral accents, light colored suit or tuxedo, flower crown optional',
            'Dreamy and romantic atmosphere with natural sunlight filtering through trees, flower petals in the air',
            'Natural light photography, golden hour lighting, soft focus on background, warm color grading',
            true,
            false,
            2,
            9
        ),
        (
            wedding_package_id,
            'Beach Paradise',
            'Stunning beach wedding portraits with ocean backdrop',
            'Tropical beach wedding setting at sunset with pristine white sand and turquoise ocean',
            'Lightweight beach wedding dress, linen suit or casual beach attire, barefoot or sandals',
            'Relaxed beach atmosphere with gentle waves, golden sunset light, palm trees swaying',
            'Golden hour photography, lens flare effects, vibrant colors, wide angle for scenery',
            true,
            false,
            3,
            8
        ),
        -- Premium themes
        (
            wedding_package_id,
            'Royal Palace',
            'Luxurious palace-style wedding portraits fit for royalty',
            'Opulent palace or castle setting with grand architecture, gold details, and regal decorations',
            'Princess-style ball gown with long train, military dress uniform or formal royal attire with medals',
            'Majestic and grand atmosphere with dramatic lighting, rich tapestries, ornate furniture',
            'Dramatic lighting setup, wide angle to capture grandeur, rich color tones, formal posing',
            true,
            true,
            4,
            7
        ),
        (
            wedding_package_id,
            'Vintage Romance',
            'Nostalgic wedding portraits with retro charm',
            'Vintage 1920s-1950s era setting with art deco or mid-century modern elements',
            'Period-appropriate vintage wedding dress and suit, classic accessories like pearls and pocket watch',
            'Nostalgic atmosphere with sepia or muted color tones, vintage props like old cars or phonographs',
            'Film photography aesthetic, grain texture, vintage color grading, classic Hollywood lighting',
            true,
            false,
            5,
            7
        ),
        (
            wedding_package_id,
            'Fairytale Forest',
            'Magical woodland wedding portraits from a storybook',
            'Enchanted forest setting with tall trees, moss, fairy lights, and mystical elements',
            'Ethereal wedding dress with nature-inspired details, earth-toned suit with botanical accents',
            'Magical and whimsical atmosphere with soft fog, dappled sunlight, butterflies, fireflies',
            'Soft diffused lighting, bokeh effects, dreamy post-processing, fantasy color grading',
            true,
            true,
            6,
            6
        ),
        -- Modern themes
        (
            wedding_package_id,
            'Urban Chic',
            'Contemporary city wedding portraits with modern style',
            'Modern cityscape or rooftop setting with skyline views, industrial or minimalist venue',
            'Sleek modern wedding dress, sharp tailored suit, contemporary accessories',
            'Sophisticated urban atmosphere with city lights, modern architecture, clean lines',
            'High contrast lighting, architectural framing, modern editing style, bold compositions',
            true,
            false,
            7,
            6
        ),
        (
            wedding_package_id,
            'Bohemian Dream',
            'Free-spirited boho wedding portraits in nature',
            'Desert landscape, meadow, or rustic outdoor setting with natural elements',
            'Boho-style flowing dress with lace and fringe, relaxed suit or vest, flower crowns, barefoot',
            'Carefree and natural atmosphere with wildflowers, dreamcatchers, macrame, warm earth tones',
            'Natural light only, sun flares, earthy color palette, candid posing, film photography style',
            true,
            false,
            8,
            5
        ),
        -- Cultural themes
        (
            wedding_package_id,
            'Asian Elegance',
            'Traditional Asian-inspired wedding portraits',
            'Traditional Asian temple, garden with cherry blossoms, or tea house setting',
            'Traditional Asian wedding attire - qipao, kimono, hanbok, or modern fusion styles',
            'Serene and harmonious atmosphere with paper lanterns, cherry blossoms, traditional elements',
            'Soft natural lighting, balanced composition, subtle color palette, respectful portraiture',
            true,
            false,
            9,
            5
        ),
        (
            wedding_package_id,
            'Mediterranean Romance',
            'Coastal Mediterranean wedding portraits',
            'Greek island or Italian coastal setting with white buildings, blue domes, or vineyards',
            'Flowing Grecian-style dress, light linen suit, olive branch crowns or accessories',
            'Warm Mediterranean atmosphere with bright sunlight, blue waters, bougainvillea flowers',
            'Bright natural light, high key photography, blue and white color scheme, airy feeling',
            true,
            false,
            10,
            5
        ),
        -- Seasonal themes
        (
            wedding_package_id,
            'Winter Wonderland',
            'Magical winter wedding portraits in snowy settings',
            'Snowy landscape with evergreen trees, ice sculptures, or cozy lodge setting',
            'Winter wedding dress with fur stole or cape, warm suits with scarves, winter accessories',
            'Crisp winter atmosphere with falling snow, warm firelight, twinkling lights, frosty details',
            'High key lighting for snow, warm/cool color contrast, sparkle effects, cozy intimate poses',
            true,
            false,
            11,
            4
        ),
        (
            wedding_package_id,
            'Autumn Harvest',
            'Warm fall wedding portraits with autumn colors',
            'Autumn forest, vineyard, or orchard with colorful fall foliage',
            'Jewel-toned wedding attire complementing fall colors, boots, wraps or shawls',
            'Cozy autumn atmosphere with golden leaves, warm sunlight, harvest decorations',
            'Warm color grading, golden hour light, rich autumn tones, natural settings',
            true,
            false,
            12,
            4
        )
        ON CONFLICT (package_id, name) DO UPDATE
        SET 
            description = EXCLUDED.description,
            setting_prompt = EXCLUDED.setting_prompt,
            clothing_prompt = EXCLUDED.clothing_prompt,
            atmosphere_prompt = EXCLUDED.atmosphere_prompt,
            technical_prompt = EXCLUDED.technical_prompt,
            is_active = EXCLUDED.is_active,
            is_premium = EXCLUDED.is_premium,
            sort_order = EXCLUDED.sort_order,
            popularity_score = EXCLUDED.popularity_score,
            updated_at = NOW();
            
        RAISE NOTICE 'Successfully added/updated % themes for Wedding Portraits package', 12;
    ELSE
        RAISE NOTICE 'Wedding Portraits package not found. Please run the main migration first.';
    END IF;
END $$;