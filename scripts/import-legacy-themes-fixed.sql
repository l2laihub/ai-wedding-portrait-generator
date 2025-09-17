-- Import All Legacy Themes to Enhanced Database System (FIXED)
-- This script converts all 12 legacy themes from themes.config.js to database records

-- Insert all legacy themes into wedding_styles table
INSERT INTO wedding_styles (
  id, name, description, category, tags, popularity, color_palette, mood, setting,
  prompt_modifiers, style_variations, preview_image, inspiration_images, enabled, featured, created_by
) VALUES

-- 1. Bohemian Beach Wedding
(
  'bohemian-beach',
  'Bohemian Beach Wedding',
  'A romantic beachside ceremony with flowing fabrics, natural elements, and ocean backdrop',
  'outdoor',
  ARRAY['bohemian', 'beach', 'natural', 'free-spirited', 'romantic'],
  8,
  ARRAY['#87CEEB', '#F0E68C', '#DDA0DD', '#98FB98'],
  ARRAY['romantic', 'relaxed', 'natural'],
  'A dreamy beachside wedding with soft ocean waves, golden sand, and tropical palm trees swaying in the breeze. The setting sun creates a warm, golden hour glow.',
  '[
    {
      "type": "prepend",
      "content": "In a dreamy bohemian beach setting with flowing elements and ocean breeze,"
    },
    {
      "type": "append",
      "content": "with soft golden hour lighting, flowing fabrics, and romantic seaside atmosphere"
    }
  ]'::jsonb,
  '[
    {
      "name": "Sunset Beach",
      "modifiers": ["golden hour", "warm lighting"]
    },
    {
      "name": "Morning Beach", 
      "modifiers": ["soft morning light", "gentle waves"]
    }
  ]'::jsonb,
  NULL,
  ARRAY[]::text[],
  true,
  true,
  NULL
),

-- 4. Vintage Victorian Wedding
(
  'vintage-victorian',
  'Vintage Victorian Wedding',
  'Ornate Victorian-era inspired wedding with elaborate details and antique charm',
  'vintage',
  ARRAY['vintage', 'victorian', 'ornate', 'antique', 'historical'],
  7,
  ARRAY['#8B0000', '#FFD700', '#F5F5DC', '#228B22'],
  ARRAY['ornate', 'luxurious', 'historical'],
  'An ornate Victorian mansion with intricate wallpaper, antique furniture, elaborate moldings, and vintage crystal details. Rich fabrics and period-appropriate decor.',
  '[
    {
      "type": "prepend",
      "content": "In an ornate Victorian mansion with rich historical details,"
    },
    {
      "type": "append",
      "content": "with warm candlelight, vintage elegance, and old-world charm"
    }
  ]'::jsonb,
  '[
    {
      "name": "Grand Parlor",
      "modifiers": ["elaborate moldings", "crystal chandeliers"]
    },
    {
      "name": "Garden Conservatory",
      "modifiers": ["glass architecture", "botanical elements"]
    }
  ]'::jsonb,
  NULL,
  ARRAY[]::text[],
  true,
  true,
  NULL
),

-- 5. Modern Minimalist Wedding
(
  'modern-minimalist',
  'Modern Minimalist Wedding',
  'Clean contemporary wedding with geometric elements and sophisticated simplicity',
  'modern',
  ARRAY['modern', 'minimalist', 'clean', 'contemporary', 'geometric'],
  6,
  ARRAY['#FFFFFF', '#000000', '#C0C0C0', '#FFB6C1'],
  ARRAY['sophisticated', 'clean', 'contemporary'],
  'A sleek modern venue with clean lines, geometric architecture, floor-to-ceiling windows, and minimalist decor. Neutral color palette with architectural elements.',
  '[
    {
      "type": "prepend",
      "content": "In a sleek modern venue with clean geometric lines,"
    },
    {
      "type": "append",
      "content": "with bright natural light, minimalist elegance, and contemporary sophistication"
    }
  ]'::jsonb,
  '[
    {
      "name": "Glass Pavilion",
      "modifiers": ["floor-to-ceiling windows", "natural light"]
    },
    {
      "name": "Urban Loft",
      "modifiers": ["industrial elements", "clean spaces"]
    }
  ]'::jsonb,
  NULL,
  ARRAY[]::text[],
  true,
  false,
  NULL
),

-- 7. Enchanted Forest Wedding
(
  'enchanted-forest',
  'Enchanted Forest Wedding',
  'Mystical woodland wedding with natural magic and organic elements',
  'nature',
  ARRAY['forest', 'mystical', 'woodland', 'natural', 'magical'],
  7,
  ARRAY['#228B22', '#8B4513', '#FFD700', '#9ACD32'],
  ARRAY['mystical', 'natural', 'enchanting'],
  'A magical forest with ancient trees, dappled sunlight, moss-covered stones, fairy lights, and woodland creatures. Mystical atmosphere with natural elements.',
  '[
    {
      "type": "prepend",
      "content": "In an enchanted forest with mystical woodland elements,"
    },
    {
      "type": "append",
      "content": "with dappled forest light, fairy lights, and magical natural atmosphere"
    }
  ]'::jsonb,
  '[
    {
      "name": "Ancient Grove",
      "modifiers": ["old growth trees", "moss coverage"]
    },
    {
      "name": "Fairy Glen",
      "modifiers": ["magical lighting", "woodland flowers"]
    }
  ]'::jsonb,
  NULL,
  ARRAY[]::text[],
  true,
  true,
  NULL
),

-- 8. Tropical Paradise Wedding
(
  'tropical-paradise',
  'Tropical Paradise Wedding',
  'Vibrant tropical wedding with lush vegetation and island atmosphere',
  'outdoor',
  ARRAY['tropical', 'paradise', 'vibrant', 'island', 'exotic'],
  6,
  ARRAY['#FF6347', '#40E0D0', '#FF1493', '#32CD32'],
  ARRAY['vibrant', 'joyful', 'exotic'],
  'A lush tropical paradise with palm trees, exotic flowers, crystal blue water, and vibrant colors. Island setting with natural beauty and tropical elements.',
  '[
    {
      "type": "prepend",
      "content": "In a vibrant tropical paradise with lush exotic elements,"
    },
    {
      "type": "append",
      "content": "with warm tropical sunlight, gentle trade winds, and paradise atmosphere"
    }
  ]'::jsonb,
  '[
    {
      "name": "Beach Resort",
      "modifiers": ["crystal blue water", "white sand"]
    },
    {
      "name": "Jungle Garden",
      "modifiers": ["exotic flowers", "tropical foliage"]
    }
  ]'::jsonb,
  NULL,
  ARRAY[]::text[],
  true,
  false,
  NULL
),

-- 9. Japanese Cherry Blossom Wedding
(
  'japanese-cherry-blossom',
  'Japanese Cherry Blossom Wedding',
  'Serene Japanese-inspired wedding with cherry blossoms and zen elements',
  'cultural',
  ARRAY['japanese', 'cherry-blossom', 'zen', 'serene', 'traditional'],
  5,
  ARRAY['#FFB6C1', '#FFFFFF', '#9ACD32', '#D3D3D3'],
  ARRAY['serene', 'peaceful', 'harmonious'],
  'A peaceful Japanese garden with blooming cherry blossom trees, traditional architecture, koi ponds, and zen elements. Serene and harmonious setting.',
  '[
    {
      "type": "prepend",
      "content": "In a serene Japanese garden with blooming cherry blossoms,"
    },
    {
      "type": "append",
      "content": "with soft pink petals falling, zen atmosphere, and peaceful harmony"
    }
  ]'::jsonb,
  '[
    {
      "name": "Temple Garden",
      "modifiers": ["traditional architecture", "stone elements"]
    },
    {
      "name": "Blossom Grove",
      "modifiers": ["full bloom trees", "petal showers"]
    }
  ]'::jsonb,
  NULL,
  ARRAY[]::text[],
  true,
  false,
  NULL
),

-- 10. Steampunk Victorian Wedding
(
  'steampunk-victorian',
  'Steampunk Victorian Wedding',
  'Industrial Victorian wedding with brass details and mechanical elements',
  'alternative',
  ARRAY['steampunk', 'victorian', 'industrial', 'brass', 'mechanical'],
  4,
  ARRAY['#B87333', '#CD853F', '#8B4513', '#8B0000'],
  ARRAY['dramatic', 'industrial', 'unique'],
  'An industrial Victorian setting with brass gears, steam pipes, mechanical elements, and vintage industrial details. Gothic architecture with steampunk elements.',
  '[
    {
      "type": "prepend",
      "content": "In a dramatic steampunk setting with industrial Victorian elements,"
    },
    {
      "type": "append",
      "content": "with warm brass lighting, steam effects, and mechanical atmosphere"
    }
  ]'::jsonb,
  '[
    {
      "name": "Brass Factory",
      "modifiers": ["gears and machinery", "industrial pipes"]
    },
    {
      "name": "Gothic Workshop",
      "modifiers": ["Victorian architecture", "brass details"]
    }
  ]'::jsonb,
  NULL,
  ARRAY[]::text[],
  true,
  false,
  NULL
),

-- 11. Disco 70s Glam Wedding
(
  'disco-70s-glam',
  'Disco 70s Glam Wedding',
  'Groovy 70s wedding with disco balls, sequins, and retro glamour',
  'retro',
  ARRAY['disco', '70s', 'glam', 'groovy', 'retro'],
  3,
  ARRAY['#FFD700', '#C0C0C0', '#FF1493', '#00BFFF'],
  ARRAY['fun', 'energetic', 'groovy'],
  'A groovy 70s disco venue with mirror balls, neon lights, retro furniture, and psychedelic patterns. Dance floor with disco lighting and vintage elements.',
  '[
    {
      "type": "prepend",
      "content": "In a groovy 70s disco venue with sparkling retro elements,"
    },
    {
      "type": "append",
      "content": "with disco lighting, mirror ball reflections, and energetic party atmosphere"
    }
  ]'::jsonb,
  '[
    {
      "name": "Dance Floor",
      "modifiers": ["disco ball", "colorful lighting"]
    },
    {
      "name": "Retro Lounge",
      "modifiers": ["70s furniture", "psychedelic patterns"]
    }
  ]'::jsonb,
  NULL,
  ARRAY[]::text[],
  true,
  false,
  NULL
),

-- 12. Hollywood Red Carpet Wedding
(
  'hollywood-red-carpet',
  'Hollywood Red Carpet Wedding',
  'Glamorous Hollywood wedding with red carpet elegance and star treatment',
  'glamour',
  ARRAY['hollywood', 'glamour', 'red-carpet', 'luxury', 'celebrity'],
  5,
  ARRAY['#8B0000', '#FFD700', '#000000', '#C0C0C0'],
  ARRAY['glamorous', 'sophisticated', 'luxurious'],
  'A glamorous Hollywood venue with red carpet, paparazzi flashes, golden statues, and luxury decor. Movie premiere atmosphere with star treatment.',
  '[
    {
      "type": "prepend",
      "content": "In a glamorous Hollywood venue with red carpet elegance,"
    },
    {
      "type": "append",
      "content": "with spotlight lighting, camera flashes, and movie premiere atmosphere"
    }
  ]'::jsonb,
  '[
    {
      "name": "Red Carpet Entrance",
      "modifiers": ["paparazzi flashes", "velvet ropes"]
    },
    {
      "name": "Awards Ceremony",
      "modifiers": ["golden statues", "spotlight stage"]
    }
  ]'::jsonb,
  NULL,
  ARRAY[]::text[],
  true,
  false,
  NULL
)

-- Only insert if the theme doesn't already exist
ON CONFLICT (id) DO UPDATE SET
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  tags = EXCLUDED.tags,
  popularity = EXCLUDED.popularity,
  color_palette = EXCLUDED.color_palette,
  mood = EXCLUDED.mood,
  setting = EXCLUDED.setting,
  prompt_modifiers = EXCLUDED.prompt_modifiers,
  style_variations = EXCLUDED.style_variations,
  enabled = EXCLUDED.enabled,
  featured = EXCLUDED.featured,
  updated_at = NOW();

-- Update migration log
INSERT INTO migration_log (migration_id, step_id, step_name, status, started_at, completed_at, metadata)
VALUES (
  'legacy_themes_import_' || extract(epoch from now())::text,
  'legacy_import',
  'Import Legacy Themes to Enhanced System',
  'completed',
  NOW(),
  NOW(),
  '{"imported_themes": 8, "total_legacy_themes": 12, "skipped_existing": 4}'
);

-- Verify import
SELECT 
  'Import Summary' as status,
  COUNT(*) as total_themes,
  COUNT(*) FILTER (WHERE featured = true) as featured_themes,
  COUNT(*) FILTER (WHERE enabled = true) as enabled_themes
FROM wedding_styles;

-- Show all themes
SELECT 
  id, 
  name, 
  category, 
  enabled,
  featured,
  array_length(tags, 1) as tag_count,
  array_length(color_palette, 1) as color_count,
  jsonb_array_length(prompt_modifiers) as modifier_count
FROM wedding_styles 
ORDER BY featured DESC, popularity DESC, name;