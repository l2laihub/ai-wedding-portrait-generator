/**
 * Theme Manager
 * Manages wedding themes, styles, and their associated prompt modifiers
 */

import { 
  ThemeConfiguration, 
  StyleVariation, 
  CustomTheme, 
  ThemeAsset, 
  PromptModifier,
  StylePreset
} from './types';

// Wedding style definitions with enhanced metadata
export interface WeddingStyle {
  id: string;
  name: string;
  description: string;
  category: StyleCategory;
  tags: string[];
  popularity: number; // 1-10 scale
  
  // Visual characteristics
  colorPalette: string[];
  mood: string[];
  setting: string;
  
  // Prompt enhancements
  promptModifiers: PromptModifier[];
  styleVariations: StyleVariation[];
  
  // Assets and resources
  previewImage?: string;
  inspirationImages: string[];
  assets: ThemeAsset[];
  
  // Metadata
  enabled: boolean;
  featured: boolean;
  seasonal?: boolean;
  premiumOnly?: boolean;
}

export type StyleCategory = 
  | 'traditional'
  | 'modern'
  | 'vintage'
  | 'themed'
  | 'seasonal'
  | 'cultural'
  | 'fantasy'
  | 'luxury';

class ThemeManager {
  private styles: Map<string, WeddingStyle> = new Map();
  private customThemes: Map<string, CustomTheme> = new Map();
  private stylePresets: Map<string, StylePreset[]> = new Map();
  private cache: Map<string, any> = new Map();

  constructor() {
    this.initializeDefaultStyles();
  }

  /**
   * Initialize default wedding styles with comprehensive configurations
   */
  private initializeDefaultStyles(): void {
    const defaultStyles: WeddingStyle[] = [
      {
        id: 'classic-timeless',
        name: 'Classic & Timeless Wedding',
        description: 'Elegant, sophisticated, and eternally beautiful',
        category: 'traditional',
        tags: ['elegant', 'sophisticated', 'traditional', 'formal'],
        popularity: 9,
        colorPalette: ['#FFFFFF', '#F8F8FF', '#E6E6FA', '#D3D3D3'],
        mood: ['elegant', 'sophisticated', 'romantic', 'refined'],
        setting: 'Traditional church or elegant venue with classical architecture',
        promptModifiers: [
          {
            type: 'prepend',
            content: 'In an elegant, sophisticated style with classical elements,'
          },
          {
            type: 'append',
            content: 'with timeless elegance, perfect lighting, and refined composition'
          }
        ],
        styleVariations: [
          {
            name: 'Formal Cathedral',
            description: 'Grand cathedral setting with dramatic lighting',
            modifiers: [
              {
                type: 'inject',
                target: 'setting',
                content: 'magnificent cathedral with stained glass windows and dramatic lighting'
              }
            ]
          },
          {
            name: 'Garden Elegance',
            description: 'Classic style in sophisticated garden setting',
            modifiers: [
              {
                type: 'inject',
                target: 'setting',
                content: 'manicured garden with classical fountains and topiaries'
              }
            ]
          }
        ],
        previewImage: '/themes/classic-timeless-preview.jpg',
        inspirationImages: [
          '/themes/classic-timeless-1.jpg',
          '/themes/classic-timeless-2.jpg'
        ],
        assets: [],
        enabled: true,
        featured: true
      },
      
      {
        id: 'rustic-barn',
        name: 'Rustic Barn Wedding',
        description: 'Cozy, natural, and charmingly rustic',
        category: 'traditional',
        tags: ['rustic', 'natural', 'cozy', 'country'],
        popularity: 8,
        colorPalette: ['#8B4513', '#DEB887', '#F5DEB3', '#D2691E'],
        mood: ['cozy', 'natural', 'warm', 'intimate'],
        setting: 'Rustic barn with wooden beams, string lights, and natural elements',
        promptModifiers: [
          {
            type: 'prepend',
            content: 'In a cozy, rustic barn setting with natural wooden elements,'
          },
          {
            type: 'append',
            content: 'with warm lighting, natural textures, and countryside charm'
          }
        ],
        styleVariations: [
          {
            name: 'Country Farmhouse',
            description: 'Traditional farmhouse with vintage elements',
            modifiers: [
              {
                type: 'inject',
                target: 'setting',
                content: 'vintage farmhouse with weathered wood and antique decorations'
              }
            ]
          }
        ],
        previewImage: '/themes/rustic-barn-preview.jpg',
        inspirationImages: ['/themes/rustic-barn-1.jpg'],
        assets: [],
        enabled: true,
        featured: true
      },

      {
        id: 'bohemian-beach',
        name: 'Bohemian Beach Wedding',
        description: 'Free-spirited, natural, and oceanside romance',
        category: 'modern',
        tags: ['bohemian', 'beach', 'natural', 'free-spirited'],
        popularity: 7,
        colorPalette: ['#87CEEB', '#F0E68C', '#DDA0DD', '#98FB98'],
        mood: ['free-spirited', 'natural', 'romantic', 'relaxed'],
        setting: 'Beautiful beach with flowing fabrics, natural flowers, and ocean views',
        promptModifiers: [
          {
            type: 'prepend',
            content: 'In a free-spirited bohemian beach setting with flowing elements,'
          },
          {
            type: 'append',
            content: 'with ocean breeze, natural lighting, and ethereal atmosphere'
          }
        ],
        styleVariations: [
          {
            name: 'Sunset Ceremony',
            description: 'Golden hour beach ceremony with dramatic skies',
            modifiers: [
              {
                type: 'inject',
                target: 'setting',
                content: 'beach at golden hour with dramatic sunset and silhouettes'
              }
            ]
          }
        ],
        previewImage: '/themes/bohemian-beach-preview.jpg',
        inspirationImages: ['/themes/bohemian-beach-1.jpg'],
        assets: [],
        enabled: true,
        featured: true
      },

      {
        id: 'fairytale-castle',
        name: 'Fairytale Castle Wedding',
        description: 'Magical, grand, and storybook romance',
        category: 'fantasy',
        tags: ['fairytale', 'magical', 'grand', 'princess'],
        popularity: 6,
        colorPalette: ['#FFB6C1', '#E6E6FA', '#FFD700', '#F0F8FF'],
        mood: ['magical', 'grand', 'romantic', 'enchanting'],
        setting: 'Majestic castle with towers, grand staircases, and magical atmosphere',
        promptModifiers: [
          {
            type: 'prepend',
            content: 'In a magical fairytale castle with grand architecture,'
          },
          {
            type: 'append',
            content: 'with enchanting atmosphere, regal elegance, and storybook magic'
          }
        ],
        styleVariations: [
          {
            name: 'Royal Ballroom',
            description: 'Grand ballroom with crystal chandeliers',
            modifiers: [
              {
                type: 'inject',
                target: 'setting',
                content: 'opulent ballroom with crystal chandeliers and marble floors'
              }
            ]
          }
        ],
        previewImage: '/themes/fairytale-castle-preview.jpg',
        inspirationImages: ['/themes/fairytale-castle-1.jpg'],
        assets: [],
        enabled: true,
        featured: false,
        premiumOnly: true
      }
    ];

    defaultStyles.forEach(style => {
      this.styles.set(style.id, style);
    });
  }

  /**
   * Get all available wedding styles
   */
  getAvailableStyles(filterOptions?: {
    category?: StyleCategory;
    featured?: boolean;
    enabled?: boolean;
    premiumOnly?: boolean;
  }): WeddingStyle[] {
    let styles = Array.from(this.styles.values());

    if (filterOptions) {
      if (filterOptions.category) {
        styles = styles.filter(s => s.category === filterOptions.category);
      }
      if (filterOptions.featured !== undefined) {
        styles = styles.filter(s => s.featured === filterOptions.featured);
      }
      if (filterOptions.enabled !== undefined) {
        styles = styles.filter(s => s.enabled === filterOptions.enabled);
      }
      if (filterOptions.premiumOnly !== undefined) {
        styles = styles.filter(s => (s.premiumOnly || false) === filterOptions.premiumOnly);
      }
    }

    return styles.sort((a, b) => b.popularity - a.popularity);
  }

  /**
   * Get style by ID
   */
  getStyle(styleId: string): WeddingStyle | null {
    return this.styles.get(styleId) || null;
  }

  /**
   * Get style variations for a specific style
   */
  getStyleVariations(styleId: string): StyleVariation[] {
    const style = this.getStyle(styleId);
    return style?.styleVariations || [];
  }

  /**
   * Create prompt modifiers for a specific style and variation
   */
  getStyleModifiers(styleId: string, variationId?: string): PromptModifier[] {
    const style = this.getStyle(styleId);
    if (!style) return [];

    let modifiers = [...style.promptModifiers];

    if (variationId) {
      const variation = style.styleVariations.find(v => v.name === variationId);
      if (variation) {
        modifiers = [...modifiers, ...variation.modifiers];
      }
    }

    return modifiers;
  }

  /**
   * Apply style modifiers to a base prompt
   */
  applyStyleModifiers(basePrompt: string, modifiers: PromptModifier[]): string {
    let processedPrompt = basePrompt;

    modifiers.forEach(modifier => {
      switch (modifier.type) {
        case 'prepend':
          processedPrompt = `${modifier.content} ${processedPrompt}`;
          break;
        
        case 'append':
          processedPrompt = `${processedPrompt} ${modifier.content}`;
          break;
        
        case 'replace':
          if (modifier.target) {
            processedPrompt = processedPrompt.replace(
              new RegExp(modifier.target, 'gi'), 
              modifier.content
            );
          }
          break;
        
        case 'inject':
          if (modifier.target) {
            // Find {target} placeholder and replace with content
            processedPrompt = processedPrompt.replace(
              `{${modifier.target}}`, 
              modifier.content
            );
          }
          break;
      }
    });

    return processedPrompt.trim();
  }

  /**
   * Create custom theme
   */
  createCustomTheme(theme: CustomTheme): void {
    this.customThemes.set(theme.id, theme);
  }

  /**
   * Get custom theme
   */
  getCustomTheme(themeId: string): CustomTheme | null {
    return this.customThemes.get(themeId) || null;
  }

  /**
   * Get all custom themes
   */
  getCustomThemes(): CustomTheme[] {
    return Array.from(this.customThemes.values());
  }

  /**
   * Create style preset
   */
  createStylePreset(styleId: string, preset: StylePreset): void {
    if (!this.stylePresets.has(styleId)) {
      this.stylePresets.set(styleId, []);
    }
    this.stylePresets.get(styleId)!.push(preset);
  }

  /**
   * Get style presets for a style
   */
  getStylePresets(styleId: string): StylePreset[] {
    return this.stylePresets.get(styleId) || [];
  }

  /**
   * Get random styles for generation
   */
  getRandomStyles(count: number = 3, options?: {
    excludeIds?: string[];
    favorFeatured?: boolean;
    onlyEnabled?: boolean;
  }): WeddingStyle[] {
    let availableStyles = this.getAvailableStyles({
      enabled: options?.onlyEnabled !== false
    });

    if (options?.excludeIds) {
      availableStyles = availableStyles.filter(
        style => !options.excludeIds!.includes(style.id)
      );
    }

    // Weighted random selection favoring featured styles
    if (options?.favorFeatured) {
      const featuredStyles = availableStyles.filter(s => s.featured);
      const regularStyles = availableStyles.filter(s => !s.featured);
      
      // 70% chance to pick featured styles
      const selectedStyles: WeddingStyle[] = [];
      
      for (let i = 0; i < count; i++) {
        const useFeatured = Math.random() < 0.7 && featuredStyles.length > 0;
        const sourceArray = useFeatured ? featuredStyles : regularStyles;
        
        if (sourceArray.length > 0) {
          const randomIndex = Math.floor(Math.random() * sourceArray.length);
          const selectedStyle = sourceArray.splice(randomIndex, 1)[0];
          selectedStyles.push(selectedStyle);
          
          // Remove from the other array too to avoid duplicates
          const otherArray = useFeatured ? regularStyles : featuredStyles;
          const otherIndex = otherArray.findIndex(s => s.id === selectedStyle.id);
          if (otherIndex >= 0) {
            otherArray.splice(otherIndex, 1);
          }
        }
      }
      
      return selectedStyles;
    }

    // Simple random selection
    const shuffled = [...availableStyles].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }

  /**
   * Get style recommendations based on user preferences
   */
  getStyleRecommendations(
    preferences: {
      mood?: string[];
      setting?: string;
      category?: StyleCategory;
      tags?: string[];
    },
    count: number = 5
  ): WeddingStyle[] {
    const styles = this.getAvailableStyles({ enabled: true });
    
    // Score styles based on preferences
    const scoredStyles = styles.map(style => {
      let score = 0;
      
      // Mood matching
      if (preferences.mood) {
        const moodMatches = preferences.mood.filter(mood => 
          style.mood.includes(mood)
        ).length;
        score += moodMatches * 3;
      }
      
      // Category matching
      if (preferences.category && style.category === preferences.category) {
        score += 5;
      }
      
      // Tag matching
      if (preferences.tags) {
        const tagMatches = preferences.tags.filter(tag => 
          style.tags.includes(tag)
        ).length;
        score += tagMatches * 2;
      }
      
      // Setting similarity (simple keyword matching)
      if (preferences.setting) {
        const settingWords = preferences.setting.toLowerCase().split(' ');
        const styleSettingWords = style.setting.toLowerCase().split(' ');
        const commonWords = settingWords.filter(word => 
          styleSettingWords.includes(word)
        ).length;
        score += commonWords;
      }
      
      // Add popularity bonus
      score += style.popularity * 0.5;
      
      return { style, score };
    });
    
    // Sort by score and return top results
    return scoredStyles
      .sort((a, b) => b.score - a.score)
      .slice(0, count)
      .map(item => item.style);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Export theme configuration
   */
  exportThemeConfig(): {
    styles: WeddingStyle[];
    customThemes: CustomTheme[];
    stylePresets: Record<string, StylePreset[]>;
  } {
    return {
      styles: Array.from(this.styles.values()),
      customThemes: Array.from(this.customThemes.values()),
      stylePresets: Object.fromEntries(this.stylePresets)
    };
  }

  /**
   * Import theme configuration
   */
  importThemeConfig(config: {
    styles?: WeddingStyle[];
    customThemes?: CustomTheme[];
    stylePresets?: Record<string, StylePreset[]>;
  }): void {
    if (config.styles) {
      config.styles.forEach(style => {
        this.styles.set(style.id, style);
      });
    }
    
    if (config.customThemes) {
      config.customThemes.forEach(theme => {
        this.customThemes.set(theme.id, theme);
      });
    }
    
    if (config.stylePresets) {
      Object.entries(config.stylePresets).forEach(([styleId, presets]) => {
        this.stylePresets.set(styleId, presets);
      });
    }
  }
}

// Export singleton instance and class
export const themeManager = new ThemeManager();
export { ThemeManager };
export default themeManager;