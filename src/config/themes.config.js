/**
 * Wedding Theme Configuration
 * Defines all available wedding themes with detailed metadata for template engine
 */

export const WEDDING_THEMES = {
  bohemian_beach: {
    id: 'bohemian_beach',
    name: 'Bohemian Beach Wedding',
    description: 'A romantic beachside ceremony with flowing fabrics, natural elements, and ocean backdrop',
    enabled: true,
    category: 'outdoor',
    mood: 'romantic',
    themeDescription: 'A dreamy beachside wedding with soft ocean waves, golden sand, and tropical palm trees swaying in the breeze. The setting sun creates a warm, golden hour glow.',
    clothingDescription: 'Flowing bohemian wedding dress with lace details and barefoot elegance for the bride, lightweight linen suit with rolled sleeves and no tie for the groom',
    atmosphereDescription: 'Soft golden hour lighting with gentle ocean breeze, romantic and relaxed atmosphere with natural beach elements like driftwood and seashells',
    colors: ['cream', 'soft gold', 'coral', 'sage green'],
    props: ['flowing fabric', 'barefoot', 'beach flowers', 'natural textures'],
    lighting: 'golden hour',
    pose_suggestions: {
      single: ['Walking along shoreline', 'Standing in shallow waves', 'Looking towards sunset'],
      couple: ['Embracing by the water', 'Walking hand in hand', 'Dancing on the sand'],
      family: ['Group hug on the beach', 'Walking together', 'Playing in shallow waves']
    }
  },

  classic_timeless: {
    id: 'classic_timeless',
    name: 'Classic & Timeless Wedding',
    description: 'Elegant traditional wedding with sophisticated styling and timeless beauty',
    enabled: true,
    category: 'traditional',
    mood: 'elegant',
    themeDescription: 'An elegant church or classic venue with marble columns, crystal chandeliers, and sophisticated architectural details. Rich fabrics and traditional wedding elements.',
    clothingDescription: 'Classic ball gown wedding dress with cathedral train and pearl accessories for the bride, traditional black tuxedo with white bow tie and cummerbund for the groom',
    atmosphereDescription: 'Sophisticated and refined with soft, warm lighting from crystal chandeliers, creating an atmosphere of timeless elegance and grace',
    colors: ['ivory', 'gold', 'deep red', 'navy'],
    props: ['cathedral train', 'pearl jewelry', 'classic bouquet', 'formal accessories'],
    lighting: 'soft warm indoor',
    pose_suggestions: {
      single: ['Formal portrait stance', 'Holding bouquet gracefully', 'Looking over shoulder'],
      couple: ['Traditional formal pose', 'First dance position', 'Exchanging rings'],
      family: ['Formal family portrait', 'Generational grouping', 'Traditional arrangement']
    }
  },

  rustic_barn: {
    id: 'rustic_barn',
    name: 'Rustic Barn Wedding',
    description: 'Charming countryside wedding with natural wood, vintage details, and pastoral charm',
    enabled: true,
    category: 'rustic',
    mood: 'cozy',
    themeDescription: 'A charming rustic barn with weathered wood beams, string lights, hay bales, and wildflower arrangements. Rolling countryside hills visible through open barn doors.',
    clothingDescription: 'Vintage-inspired lace wedding dress with cowboy boots for the bride, brown leather boots, suspenders, and rolled-up sleeves for the groom',
    atmosphereDescription: 'Warm and cozy with string lights creating a magical glow, natural textures and countryside charm with the scent of wildflowers',
    colors: ['burlap', 'sage green', 'cream', 'warm brown'],
    props: ['cowboy boots', 'wildflowers', 'mason jars', 'vintage details'],
    lighting: 'warm string lights',
    pose_suggestions: {
      single: ['Sitting on hay bale', 'Leaning against barn door', 'Walking through field'],
      couple: ['Dancing under string lights', 'Sitting on hay bales', 'Walking through barn'],
      family: ['Group on hay bales', 'Sitting on barn steps', 'Walking through field']
    }
  },

  vintage_victorian: {
    id: 'vintage_victorian',
    name: 'Vintage Victorian Wedding',
    description: 'Ornate Victorian-era inspired wedding with elaborate details and antique charm',
    enabled: true,
    category: 'vintage',
    mood: 'ornate',
    themeDescription: 'An ornate Victorian mansion with intricate wallpaper, antique furniture, elaborate moldings, and vintage crystal details. Rich fabrics and period-appropriate decor.',
    clothingDescription: 'High-neck lace Victorian wedding dress with long sleeves and buttons for the bride, formal Victorian suit with vest, pocket watch, and top hat for the groom',
    atmosphereDescription: 'Rich and luxurious with warm candlelight and gas lamp ambiance, creating an atmosphere of old-world elegance and historical romance',
    colors: ['deep burgundy', 'gold', 'ivory', 'forest green'],
    props: ['lace gloves', 'pocket watch', 'vintage jewelry', 'antique details'],
    lighting: 'warm candlelight',
    pose_suggestions: {
      single: ['Victorian portrait pose', 'Sitting in antique chair', 'Standing by fireplace'],
      couple: ['Formal Victorian stance', 'Tea time pose', 'Garden walk'],
      family: ['Formal Victorian family', 'Sitting room arrangement', 'Garden gathering']
    }
  },

  modern_minimalist: {
    id: 'modern_minimalist',
    name: 'Modern Minimalist Wedding',
    description: 'Clean contemporary wedding with geometric elements and sophisticated simplicity',
    enabled: true,
    category: 'modern',
    mood: 'sophisticated',
    themeDescription: 'A sleek modern venue with clean lines, geometric architecture, floor-to-ceiling windows, and minimalist decor. Neutral color palette with architectural elements.',
    clothingDescription: 'Simple, elegant sheath wedding dress with clean lines for the bride, modern slim-fit suit with minimal accessories for the groom',
    atmosphereDescription: 'Clean and sophisticated with natural light streaming through large windows, creating a bright, airy, and contemporary atmosphere',
    colors: ['white', 'black', 'grey', 'soft blush'],
    props: ['geometric shapes', 'modern flowers', 'clean lines', 'minimal jewelry'],
    lighting: 'bright natural light',
    pose_suggestions: {
      single: ['Clean geometric pose', 'Standing by window', 'Modern portrait stance'],
      couple: ['Minimal embrace', 'Walking together', 'Geometric positioning'],
      family: ['Clean family line', 'Modern group pose', 'Architectural arrangement']
    }
  },

  fairytale_castle: {
    id: 'fairytale_castle',
    name: 'Fairytale Castle Wedding',
    description: 'Magical castle wedding with royal grandeur and enchanted atmosphere',
    enabled: true,
    category: 'fantasy',
    mood: 'magical',
    themeDescription: 'A magnificent castle with stone towers, grand staircases, royal tapestries, and enchanted gardens. Medieval architecture with magical elements and royal grandeur.',
    clothingDescription: 'Princess ball gown with sparkles and royal train for the bride, royal prince outfit with cape and crown for the groom',
    atmospheresDescription: 'Magical and enchanting with torchlight and chandeliers, creating a royal fairy tale atmosphere with sparkles and medieval charm',
    colors: ['royal blue', 'gold', 'silver', 'deep purple'],
    props: ['crown', 'royal cape', 'sparkling details', 'medieval elements'],
    lighting: 'magical torch light',
    pose_suggestions: {
      single: ['Royal portrait pose', 'Standing on castle steps', 'Looking from tower window'],
      couple: ['Royal embrace', 'Dancing in grand hall', 'Walking through castle grounds'],
      family: ['Royal family portrait', 'Throne room gathering', 'Castle garden group']
    }
  },

  enchanted_forest: {
    id: 'enchanted_forest',
    name: 'Enchanted Forest Wedding',
    description: 'Mystical woodland wedding with natural magic and organic elements',
    enabled: true,
    category: 'nature',
    mood: 'mystical',
    themeDescription: 'A magical forest with ancient trees, dappled sunlight, moss-covered stones, fairy lights, and woodland creatures. Mystical atmosphere with natural elements.',
    clothingDescription: 'Flowing nature-inspired wedding dress with flower crown for the bride, earth-toned suit with natural accessories for the groom',
    atmosphereDescription: 'Mystical and enchanting with dappled forest light and fairy lights, creating a magical woodland atmosphere with natural sounds and scents',
    colors: ['forest green', 'earth brown', 'soft gold', 'moss green'],
    props: ['flower crown', 'natural textures', 'woodland flowers', 'fairy lights'],
    lighting: 'dappled forest light',
    pose_suggestions: {
      single: ['Standing among trees', 'Sitting on moss rock', 'Walking forest path'],
      couple: ['Dancing under trees', 'Sitting by stream', 'Walking through forest'],
      family: ['Group among trees', 'Forest clearing gathering', 'Walking woodland path']
    }
  },

  tropical_paradise: {
    id: 'tropical_paradise',
    name: 'Tropical Paradise Wedding',
    description: 'Vibrant tropical wedding with lush vegetation and island atmosphere',
    enabled: true,
    category: 'outdoor',
    mood: 'vibrant',
    themeDescription: 'A lush tropical paradise with palm trees, exotic flowers, crystal blue water, and vibrant colors. Island setting with natural beauty and tropical elements.',
    clothingDescription: 'Light tropical wedding dress with tropical flowers for the bride, lightweight tropical shirt and pants for the groom',
    atmosphereDescription: 'Vibrant and joyful with warm tropical sunlight and gentle trade winds, creating a paradise atmosphere with exotic scents and sounds',
    colors: ['coral', 'turquoise', 'bright pink', 'lime green'],
    props: ['tropical flowers', 'palm fronds', 'shell details', 'bright colors'],
    lighting: 'tropical sunlight',
    pose_suggestions: {
      single: ['Standing by palm tree', 'Walking on beach', 'Holding tropical bouquet'],
      couple: ['Tropical embrace', 'Walking beach together', 'Dancing under palms'],
      family: ['Beach family group', 'Tropical garden gathering', 'Walking together']
    }
  },

  japanese_cherry_blossom: {
    id: 'japanese_cherry_blossom',
    name: 'Japanese Cherry Blossom Wedding',
    description: 'Serene Japanese-inspired wedding with cherry blossoms and zen elements',
    enabled: true,
    category: 'cultural',
    mood: 'serene',
    themeDescription: 'A peaceful Japanese garden with blooming cherry blossom trees, traditional architecture, koi ponds, and zen elements. Serene and harmonious setting.',
    clothingDescription: 'Traditional Japanese-inspired wedding kimono for the bride, elegant Japanese formal wear for the groom',
    atmosphereDescription: 'Peaceful and serene with soft pink cherry blossom petals falling, creating a harmonious and zen-like atmosphere with traditional elements',
    colors: ['soft pink', 'white', 'sage green', 'warm grey'],
    props: ['cherry blossoms', 'traditional elements', 'zen details', 'natural textures'],
    lighting: 'soft natural light',
    pose_suggestions: {
      single: ['Standing under cherry tree', 'Traditional pose', 'Walking garden path'],
      couple: ['Bowing to each other', 'Walking under blossoms', 'Tea ceremony pose'],
      family: ['Traditional family pose', 'Garden gathering', 'Walking together']
    }
  },

  steampunk_victorian: {
    id: 'steampunk_victorian',
    name: 'Steampunk Victorian Wedding',
    description: 'Industrial Victorian wedding with brass details and mechanical elements',
    enabled: true,
    category: 'alternative',
    mood: 'dramatic',
    themeDescription: 'An industrial Victorian setting with brass gears, steam pipes, mechanical elements, and vintage industrial details. Gothic architecture with steampunk elements.',
    clothingDescription: 'Steampunk corset wedding dress with gears and brass details for the bride, Victorian suit with brass accessories and goggles for the groom',
    atmosphereDescription: 'Dramatic and industrial with warm brass lighting and steam effects, creating a unique steampunk atmosphere with mechanical sounds',
    colors: ['brass', 'copper', 'deep brown', 'burgundy'],
    props: ['brass gears', 'goggles', 'mechanical details', 'industrial elements'],
    lighting: 'warm brass lighting',
    pose_suggestions: {
      single: ['Standing by gears', 'Industrial portrait', 'Dramatic lighting pose'],
      couple: ['Steampunk embrace', 'Industrial dance', 'Dramatic couple pose'],
      family: ['Industrial family group', 'Steampunk gathering', 'Dramatic family pose']
    }
  },

  disco_70s_glam: {
    id: 'disco_70s_glam',
    name: 'Disco 70s Glam Wedding',
    description: 'Groovy 70s wedding with disco balls, sequins, and retro glamour',
    enabled: true,
    category: 'retro',
    mood: 'fun',
    themeDescription: 'A groovy 70s disco venue with mirror balls, neon lights, retro furniture, and psychedelic patterns. Dance floor with disco lighting and vintage elements.',
    clothingDescription: 'Sequined disco wedding dress with platform shoes for the bride, 70s suit with wide lapels and disco accessories for the groom',
    atmosphereDescription: 'Fun and energetic with disco lighting and mirror ball reflections, creating a groovy party atmosphere with 70s music and energy',
    colors: ['gold', 'silver', 'neon pink', 'electric blue'],
    props: ['sequins', 'platform shoes', 'disco ball', 'retro accessories'],
    lighting: 'disco lighting',
    pose_suggestions: {
      single: ['Disco dance pose', 'Standing by disco ball', 'Groovy portrait'],
      couple: ['Disco dance together', 'Retro embrace', 'Dancing under disco ball'],
      family: ['Disco family dance', 'Groovy family pose', 'Retro family group']
    }
  },

  hollywood_red_carpet: {
    id: 'hollywood_red_carpet',
    name: 'Hollywood Red Carpet Wedding',
    description: 'Glamorous Hollywood wedding with red carpet elegance and star treatment',
    enabled: true,
    category: 'glamour',
    mood: 'glamorous',
    themeDescription: 'A glamorous Hollywood venue with red carpet, paparazzi flashes, golden statues, and luxury decor. Movie premiere atmosphere with star treatment.',
    clothingDescription: 'Glamorous red carpet gown with sparkles and train for the bride, classic Hollywood tuxedo with bow tie for the groom',
    atmosphereDescription: 'Glamorous and sophisticated with camera flashes and spotlight lighting, creating a movie premiere atmosphere with luxury and star treatment',
    colors: ['deep red', 'gold', 'black', 'silver'],
    props: ['red carpet', 'sparkles', 'luxury accessories', 'glamour elements'],
    lighting: 'spotlight and flashes',
    pose_suggestions: {
      single: ['Red carpet pose', 'Hollywood glamour', 'Paparazzi shot'],
      couple: ['Red carpet couple', 'Hollywood embrace', 'Star treatment pose'],
      family: ['Celebrity family', 'Red carpet family', 'Hollywood group']
    }
  }
};

/**
 * Theme Management Utilities
 */
export class ThemeManager {
  /**
   * Get all enabled themes
   */
  static getEnabledThemes() {
    return Object.values(WEDDING_THEMES).filter(theme => theme.enabled);
  }

  /**
   * Get themes by category
   */
  static getThemesByCategory(category) {
    return Object.values(WEDDING_THEMES).filter(
      theme => theme.enabled && theme.category === category
    );
  }

  /**
   * Get random themes for generation
   */
  static getRandomThemes(count = 3) {
    const enabledThemes = this.getEnabledThemes();
    const shuffled = [...enabledThemes].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  /**
   * Get theme by ID
   */
  static getThemeById(themeId) {
    return WEDDING_THEMES[themeId] || null;
  }

  /**
   * Get theme by name (legacy support)
   */
  static getThemeByName(themeName) {
    return Object.values(WEDDING_THEMES).find(
      theme => theme.name === themeName
    ) || null;
  }

  /**
   * Enable/disable theme
   */
  static setThemeEnabled(themeId, enabled) {
    if (WEDDING_THEMES[themeId]) {
      WEDDING_THEMES[themeId].enabled = enabled;
      return true;
    }
    return false;
  }

  /**
   * Get available categories
   */
  static getCategories() {
    const categories = new Set();
    Object.values(WEDDING_THEMES).forEach(theme => {
      if (theme.enabled) {
        categories.add(theme.category);
      }
    });
    return Array.from(categories);
  }

  /**
   * Get themes by mood
   */
  static getThemesByMood(mood) {
    return Object.values(WEDDING_THEMES).filter(
      theme => theme.enabled && theme.mood === mood
    );
  }
}

// Legacy support for existing code
export const WEDDING_STYLES = Object.values(WEDDING_THEMES).map(theme => theme.name);

export default {
  WEDDING_THEMES,
  ThemeManager,
  WEDDING_STYLES
};