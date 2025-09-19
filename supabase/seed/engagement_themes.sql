-- Engagement Portraits Themes
-- Optimized theme templates and prompts for engagement photography

DO $$
DECLARE
    engagement_package_id UUID;
BEGIN
    -- Get the engagement package ID
    SELECT id INTO engagement_package_id 
    FROM photo_packages 
    WHERE slug = 'engagement-portraits';
    
    IF engagement_package_id IS NOT NULL THEN
        -- Insert engagement themes with optimized prompts
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
            popularity_score,
            mood_tags,
            style_tags,
            metadata
        ) VALUES
        -- Classic & Timeless Engagement
        (
            engagement_package_id,
            'Classic Romance',
            'Timeless engagement portraits with elegant sophistication',
            'Elegant indoor setting with soft natural light from large windows, classic architecture with marble columns or grand staircase, luxury hotel lobby or historic mansion interior',
            'Sophisticated engagement attire - flowing midi or maxi dress in soft colors (blush, cream, sage), well-fitted blazer or dress shirt for partner, coordinated but not matching outfits',
            'Intimate and romantic atmosphere with soft golden lighting, gentle touches and loving gazes, classic timeless elegance, sophisticated charm',
            'Professional portrait lighting, medium format camera aesthetic, shallow depth of field, warm color grading, classic composition with rule of thirds',
            true,
            false,
            1,
            10,
            ARRAY['romantic', 'intimate', 'elegant', 'timeless'],
            ARRAY['classic', 'sophisticated', 'indoor'],
            '{"season": "any", "time_of_day": "golden_hour", "difficulty": "easy"}'
        ),
        -- Golden Hour Outdoor
        (
            engagement_package_id,
            'Golden Hour Glow',
            'Magical outdoor engagement session during golden hour',
            'Beautiful outdoor location during golden hour - open field with tall grass, park with mature trees, lakeside or beach setting with natural backdrop',
            'Casual romantic attire - flowing sundress or midi dress, casual button-up shirt or sweater, earth tones and soft colors that complement the natural setting',
            'Warm and dreamy atmosphere with golden sunlight, natural wind in hair, laughing and candid moments, carefree and joyful energy',
            'Golden hour natural lighting, lens flares and bokeh effects, warm color temperature, backlit photography, film photography aesthetic',
            true,
            false,
            2,
            9,
            ARRAY['warm', 'dreamy', 'natural', 'joyful'],
            ARRAY['outdoor', 'golden_hour', 'natural_light'],
            '{"season": "spring_summer", "time_of_day": "golden_hour", "difficulty": "medium"}'
        ),
        -- Urban City Engagement
        (
            engagement_package_id,
            'Urban Romance',
            'Modern city engagement portraits with metropolitan backdrop',
            'Urban cityscape setting - rooftop with city skyline, modern downtown streets, industrial brick walls, contemporary architecture, city bridges or walkways',
            'Modern chic attire - sleek dress or stylish jumpsuit, tailored jacket or contemporary shirt, urban fashion with clean lines and modern aesthetic',
            'Dynamic urban energy with romantic moments, city lights and architectural elements, modern sophistication, confident and stylish mood',
            'Urban photography style, architectural leading lines, high contrast lighting, modern color grading, street photography influence',
            true,
            false,
            3,
            8,
            ARRAY['modern', 'chic', 'dynamic', 'confident'],
            ARRAY['urban', 'cityscape', 'contemporary'],
            '{"season": "any", "time_of_day": "blue_hour", "difficulty": "medium"}'
        ),
        -- Rustic Country Engagement
        (
            engagement_package_id,
            'Rustic Charm',
            'Countryside engagement session with natural rustic elements',
            'Rustic country setting - wooden barn, farm fields, vineyard rows, country roads, old wooden fences, natural meadows with wildflowers',
            'Country casual attire - bohemian dress or midi skirt with flowy top, flannel shirt or casual button-up, boots or casual shoes, earth tones and natural fabrics',
            'Relaxed country charm atmosphere, natural and carefree energy, authentic connection with nature, warm and comfortable feeling',
            'Natural lighting with soft shadows, earthy color palette, film photography style, natural depth of field, rustic aesthetic',
            true,
            false,
            4,
            7,
            ARRAY['rustic', 'natural', 'carefree', 'authentic'],
            ARRAY['country', 'outdoor', 'rustic'],
            '{"season": "spring_fall", "time_of_day": "golden_hour", "difficulty": "easy"}'
        ),
        -- Beach Coastal Engagement
        (
            engagement_package_id,
            'Coastal Dreams',
            'Romantic beach engagement session with ocean vibes',
            'Beautiful coastal setting - sandy beach at sunset, rocky coastline, seaside cliffs, ocean pier or boardwalk, dunes with beach grass',
            'Beach casual attire - flowy maxi dress or midi dress, linen shirt or casual polo, light fabrics in coastal colors (whites, blues, corals), barefoot or sandals',
            'Relaxed beach vibes with ocean breeze, romantic sunset lighting, playful and carefree energy, natural movement and interaction',
            'Natural beach lighting, golden hour warmth, ocean reflections, wind-blown hair effects, bright airy color grading',
            true,
            false,
            5,
            8,
            ARRAY['breezy', 'romantic', 'playful', 'carefree'],
            ARRAY['beach', 'coastal', 'sunset'],
            '{"season": "spring_summer", "time_of_day": "sunset", "difficulty": "medium"}'
        ),
        -- Forest Woodland Engagement
        (
            engagement_package_id,
            'Woodland Fairytale',
            'Enchanted forest engagement with natural beauty',
            'Mystical forest setting - tall trees with dappled sunlight, forest path or clearing, moss-covered rocks, woodland stream, autumn foliage or spring greenery',
            'Nature-inspired attire - bohemian dress with natural textures, earth-toned sweater or jacket, comfortable outdoor shoes, layered natural fabrics',
            'Magical woodland atmosphere with filtered sunlight, intimate forest sanctuary, peaceful and serene energy, connection with nature',
            'Dappled forest lighting, natural depth of field, earthy color tones, ethereal mood, soft natural shadows',
            true,
            true,
            6,
            6,
            ARRAY['magical', 'serene', 'intimate', 'natural'],
            ARRAY['forest', 'woodland', 'nature'],
            '{"season": "spring_fall", "time_of_day": "morning", "difficulty": "hard"}'
        ),
        -- Garden Botanical
        (
            engagement_package_id,
            'Garden Romance',
            'Botanical garden engagement with lush floral backdrops',
            'Stunning botanical garden - blooming flower beds, greenhouse conservatory, garden paths with archways, rose gardens, seasonal flower displays',
            'Garden party attire - feminine dress with floral patterns or solid pastels, dress shirt or polo, garden party elegance, spring/summer colors',
            'Fresh and vibrant garden atmosphere, blooming flowers and lush greenery, romantic garden party vibes, natural beauty and color',
            'Natural garden lighting, vibrant color palette, floral composition elements, fresh and bright color grading',
            true,
            false,
            7,
            7,
            ARRAY['fresh', 'vibrant', 'colorful', 'romantic'],
            ARRAY['garden', 'botanical', 'floral'],
            '{"season": "spring_summer", "time_of_day": "morning", "difficulty": "easy"}'
        ),
        -- Vintage Retro Engagement
        (
            engagement_package_id,
            'Vintage Romance',
            'Nostalgic retro-inspired engagement portraits',
            'Vintage location - antique shop, classic diner, vintage car setting, retro downtown area, historic district with period architecture',
            'Vintage-inspired attire - retro dress styles from 1950s-70s, vintage patterns and fabrics, classic menswear with suspenders or vest, vintage accessories',
            'Nostalgic romantic atmosphere, classic vintage charm, timeless love story feeling, retro elegance and sophistication',
            'Film photography aesthetic, vintage color grading with warm tones, classic portrait composition, soft vintage lighting',
            true,
            true,
            8,
            5,
            ARRAY['nostalgic', 'classic', 'timeless', 'charming'],
            ARRAY['vintage', 'retro', 'classic'],
            '{"season": "any", "time_of_day": "golden_hour", "difficulty": "medium"}'
        ),
        -- Home Cozy Engagement
        (
            engagement_package_id,
            'Cozy At Home',
            'Intimate at-home engagement session capturing daily life',
            'Comfortable home setting - cozy living room with soft lighting, kitchen while cooking together, bedroom with natural light, reading nook or home office',
            'Comfortable casual attire - soft sweaters or cardigans, jeans or comfortable pants, cozy socks or barefoot, matching or coordinated loungewear',
            'Intimate and cozy atmosphere, authentic daily life moments, comfortable and relaxed energy, genuine connection and intimacy',
            'Natural window lighting, soft indoor shadows, warm color temperature, lifestyle photography style, candid documentary approach',
            true,
            false,
            9,
            6,
            ARRAY['cozy', 'intimate', 'authentic', 'comfortable'],
            ARRAY['lifestyle', 'indoor', 'intimate'],
            '{"season": "winter", "time_of_day": "morning", "difficulty": "easy"}'
        ),
        -- Adventure Outdoor
        (
            engagement_package_id,
            'Adventure Love',
            'Active outdoor engagement for adventurous couples',
            'Adventure location - mountain hiking trail, rock formations, scenic overlook, national park, camping or outdoor activity setting',
            'Outdoor adventure attire - hiking boots and outdoor gear, layered clothing for weather, practical yet stylish outdoor fashion, earth tones and functional fabrics',
            'Adventurous and energetic atmosphere, connection through shared outdoor activities, confident and active energy, natural adventure spirit',
            'Natural outdoor lighting, dynamic action shots, landscape integration, adventure photography style, high contrast and vibrant colors',
            true,
            false,
            10,
            5,
            ARRAY['adventurous', 'energetic', 'active', 'confident'],
            ARRAY['adventure', 'outdoor', 'hiking'],
            '{"season": "spring_fall", "time_of_day": "midday", "difficulty": "hard"}'
        ),
        -- Cultural Heritage
        (
            engagement_package_id,
            'Cultural Celebration',
            'Engagement portraits celebrating cultural heritage and traditions',
            'Culturally significant location - cultural center, traditional architecture, heritage site, museum, or location meaningful to couples cultural background',
            'Traditional or culturally-inspired attire representing couples heritage, elegant fusion of traditional and modern elements, culturally appropriate and respectful styling',
            'Respectful celebration of cultural heritage, pride in traditions and family history, elegant cultural sophistication, meaningful connection to roots',
            'Respectful cultural photography, traditional composition elements, rich cultural colors, elegant portrait lighting, heritage documentation style',
            true,
            false,
            11,
            4,
            ARRAY['cultural', 'traditional', 'respectful', 'elegant'],
            ARRAY['cultural', 'heritage', 'traditional'],
            '{"season": "any", "time_of_day": "golden_hour", "difficulty": "medium"}'
        ),
        -- Seasonal Winter
        (
            engagement_package_id,
            'Winter Wonderland',
            'Magical winter engagement session with snow and cozy elements',
            'Winter wonderland setting - snow-covered landscape, frosted trees, winter cabin or lodge, ice skating rink, cozy fireplace setting',
            'Winter engagement attire - cozy sweaters and scarves, winter coats and boots, warm layers in winter colors, mittens and winter accessories',
            'Cozy winter romance atmosphere, snowy magical feeling, warm love against cold weather, seasonal holiday charm and warmth',
            'Winter natural lighting, snow reflection lighting, cozy warm color balance, seasonal winter aesthetic, contrast between warm couple and cool environment',
            true,
            false,
            12,
            4,
            ARRAY['cozy', 'magical', 'seasonal', 'warm'],
            ARRAY['winter', 'seasonal', 'snow'],
            '{"season": "winter", "time_of_day": "golden_hour", "difficulty": "medium"}'
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
            mood_tags = EXCLUDED.mood_tags,
            style_tags = EXCLUDED.style_tags,
            metadata = EXCLUDED.metadata,
            updated_at = NOW();
            
        RAISE NOTICE 'Successfully added/updated % themes for Engagement Portraits package', 12;
    ELSE
        RAISE NOTICE 'Engagement Portraits package not found. Please create the package first.';
    END IF;
END $$;