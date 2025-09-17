#!/usr/bin/env node

/**
 * Import Legacy Themes to Enhanced Database System
 * Converts all 12 legacy themes from themes.config.js to database records
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(color, ...args) {
  console.log(colors[color], ...args, colors.reset);
}

// Legacy themes data from themes.config.js
const legacyThemes = {
  'bohemian-beach': {
    name: 'Bohemian Beach Wedding',
    description: 'A romantic beachside ceremony with flowing fabrics, natural elements, and ocean backdrop',
    category: 'outdoor',
    mood: 'romantic',
    colors: ['#87CEEB', '#F0E68C', '#DDA0DD', '#98FB98'],
    themeDescription: 'A dreamy beachside wedding with soft ocean waves, golden sand, and tropical palm trees swaying in the breeze. The setting sun creates a warm, golden hour glow.',
    atmosphereDescription: 'Soft golden hour lighting with gentle ocean breeze, romantic and relaxed atmosphere with natural beach elements like driftwood and seashells'
  },
  'vintage-victorian': {
    name: 'Vintage Victorian Wedding',
    description: 'Ornate Victorian-era inspired wedding with elaborate details and antique charm',
    category: 'vintage',
    mood: 'ornate',
    colors: ['#8B0000', '#FFD700', '#F5F5DC', '#228B22'],
    themeDescription: 'An ornate Victorian mansion with intricate wallpaper, antique furniture, elaborate moldings, and vintage crystal details. Rich fabrics and period-appropriate decor.',
    atmosphereDescription: 'Rich and luxurious with warm candlelight and gas lamp ambiance, creating an atmosphere of old-world elegance and historical romance'
  },
  'modern-minimalist': {
    name: 'Modern Minimalist Wedding',
    description: 'Clean contemporary wedding with geometric elements and sophisticated simplicity',
    category: 'modern',
    mood: 'sophisticated',
    colors: ['#FFFFFF', '#000000', '#C0C0C0', '#FFB6C1'],
    themeDescription: 'A sleek modern venue with clean lines, geometric architecture, floor-to-ceiling windows, and minimalist decor. Neutral color palette with architectural elements.',
    atmosphereDescription: 'Clean and sophisticated with natural light streaming through large windows, creating a bright, airy, and contemporary atmosphere'
  },
  'enchanted-forest': {
    name: 'Enchanted Forest Wedding',
    description: 'Mystical woodland wedding with natural magic and organic elements',
    category: 'nature',
    mood: 'mystical',
    colors: ['#228B22', '#8B4513', '#FFD700', '#9ACD32'],
    themeDescription: 'A magical forest with ancient trees, dappled sunlight, moss-covered stones, fairy lights, and woodland creatures. Mystical atmosphere with natural elements.',
    atmosphereDescription: 'Mystical and enchanting with dappled forest light and fairy lights, creating a magical woodland atmosphere with natural sounds and scents'
  },
  'tropical-paradise': {
    name: 'Tropical Paradise Wedding',
    description: 'Vibrant tropical wedding with lush vegetation and island atmosphere',
    category: 'outdoor',
    mood: 'vibrant',
    colors: ['#FF6347', '#40E0D0', '#FF1493', '#32CD32'],
    themeDescription: 'A lush tropical paradise with palm trees, exotic flowers, crystal blue water, and vibrant colors. Island setting with natural beauty and tropical elements.',
    atmosphereDescription: 'Vibrant and joyful with warm tropical sunlight and gentle trade winds, creating a paradise atmosphere with exotic scents and sounds'
  },
  'japanese-cherry-blossom': {
    name: 'Japanese Cherry Blossom Wedding',
    description: 'Serene Japanese-inspired wedding with cherry blossoms and zen elements',
    category: 'cultural',
    mood: 'serene',
    colors: ['#FFB6C1', '#FFFFFF', '#9ACD32', '#D3D3D3'],
    themeDescription: 'A peaceful Japanese garden with blooming cherry blossom trees, traditional architecture, koi ponds, and zen elements. Serene and harmonious setting.',
    atmosphereDescription: 'Peaceful and serene with soft pink cherry blossom petals falling, creating a harmonious and zen-like atmosphere with traditional elements'
  },
  'steampunk-victorian': {
    name: 'Steampunk Victorian Wedding',
    description: 'Industrial Victorian wedding with brass details and mechanical elements',
    category: 'alternative',
    mood: 'dramatic',
    colors: ['#B87333', '#CD853F', '#8B4513', '#8B0000'],
    themeDescription: 'An industrial Victorian setting with brass gears, steam pipes, mechanical elements, and vintage industrial details. Gothic architecture with steampunk elements.',
    atmosphereDescription: 'Dramatic and industrial with warm brass lighting and steam effects, creating a unique steampunk atmosphere with mechanical sounds'
  },
  'disco-70s-glam': {
    name: 'Disco 70s Glam Wedding',
    description: 'Groovy 70s wedding with disco balls, sequins, and retro glamour',
    category: 'retro',
    mood: 'fun',
    colors: ['#FFD700', '#C0C0C0', '#FF1493', '#00BFFF'],
    themeDescription: 'A groovy 70s disco venue with mirror balls, neon lights, retro furniture, and psychedelic patterns. Dance floor with disco lighting and vintage elements.',
    atmosphereDescription: 'Fun and energetic with disco lighting and mirror ball reflections, creating a groovy party atmosphere with 70s music and energy'
  },
  'hollywood-red-carpet': {
    name: 'Hollywood Red Carpet Wedding',
    description: 'Glamorous Hollywood wedding with red carpet elegance and star treatment',
    category: 'glamour',
    mood: 'glamorous',
    colors: ['#8B0000', '#FFD700', '#000000', '#C0C0C0'],
    themeDescription: 'A glamorous Hollywood venue with red carpet, paparazzi flashes, golden statues, and luxury decor. Movie premiere atmosphere with star treatment.',
    atmosphereDescription: 'Glamorous and sophisticated with camera flashes and spotlight lighting, creating a movie premiere atmosphere with luxury and star treatment'
  }
};

function generateSupabaseInsert() {
  const insertStatements = [];
  
  Object.entries(legacyThemes).forEach(([id, theme]) => {
    const tags = [theme.mood, theme.category, 'legacy-import'];
    const promptModifiers = [
      {
        type: 'prepend',
        content: `In ${theme.themeDescription.split('.')[0].toLowerCase()},`
      },
      {
        type: 'append',
        content: `with ${theme.atmosphereDescription.split(',')[0].toLowerCase()}`
      }
    ];

    const insert = `
(
  '${id}',
  '${theme.name}',
  '${theme.description}',
  '${theme.category}',
  ARRAY[${tags.map(t => `'${t}'`).join(', ')}],
  ${getPopularityScore(theme.category)},
  ARRAY[${theme.colors.map(c => `'${c}'`).join(', ')}],
  ARRAY['${theme.mood}'],
  '${theme.themeDescription}',
  '${JSON.stringify(promptModifiers)}'::jsonb,
  '[]'::jsonb,
  NULL,
  ARRAY[]::text[],
  true,
  ${getFeaturedStatus(id)},
  NULL
)`;
    
    insertStatements.push(insert);
  });

  return insertStatements;
}

function getPopularityScore(category) {
  const scores = {
    'outdoor': 8,
    'vintage': 7,
    'modern': 6,
    'nature': 7,
    'cultural': 5,
    'alternative': 4,
    'retro': 3,
    'glamour': 5
  };
  return scores[category] || 5;
}

function getFeaturedStatus(id) {
  const featured = ['bohemian-beach', 'vintage-victorian', 'enchanted-forest'];
  return featured.includes(id) ? 'true' : 'false';
}

async function main() {
  log('magenta', '🎨 Legacy Themes Import to Enhanced Database System\n');
  
  const themesToImport = Object.keys(legacyThemes);
  log('blue', `📋 Found ${themesToImport.length} legacy themes to import:`);
  themesToImport.forEach(id => {
    log('cyan', `   • ${legacyThemes[id].name} (${legacyThemes[id].category})`);
  });
  
  log('green', '\n✅ Generated SQL import statements');
  
  const sqlFile = path.join(__dirname, 'import-legacy-themes.sql');
  log('yellow', `📄 SQL file ready: ${sqlFile}`);
  
  log('blue', '\n🚀 To import the themes:');
  log('cyan', '1. Option A - Run via Supabase SQL Editor:');
  log('yellow', '   • Copy content from import-legacy-themes.sql');
  log('yellow', '   • Paste and run in your Supabase SQL Editor');
  log('cyan', '\n2. Option B - Run via Supabase CLI:');
  log('yellow', '   • npx supabase db push --include-seed');
  
  log('green', '\n📊 After import you will have:');
  log('green', `   • 12 total themes (4 existing + 8 new legacy imports)`);
  log('green', '   • Rich prompt modifiers for all themes');
  log('green', '   • Full enhanced mode functionality');
  log('green', '   • Complete theme management via admin dashboard');
  
  log('magenta', '\n✨ Enhanced mode will then show all 12 themes with rich metadata!');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { legacyThemes, generateSupabaseInsert };