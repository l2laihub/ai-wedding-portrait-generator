/**
 * Wedding Theme Configuration (CommonJS version)
 * Defines all available wedding themes with detailed metadata for template engine
 */

const WEDDING_THEMES = {
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
  }
};

/**
 * Theme Management Utilities
 */
class ThemeManager {
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
}

// Export for CommonJS
module.exports = {
  WEDDING_THEMES,
  ThemeManager,
  WEDDING_STYLES: Object.values(WEDDING_THEMES).map(theme => theme.name)
};