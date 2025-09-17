/**
 * Theme Management Utilities
 * Additional utility functions for theme handling and management
 */

import { ThemeManager, WEDDING_THEMES } from '../config/themes.config.js';

/**
 * Enhanced theme selection utilities
 */
export class ThemeSelector {
  /**
   * Get smart theme recommendations based on user preferences
   * @param {Object} preferences - User preferences
   * @param {string[]} preferences.moods - Preferred moods
   * @param {string[]} preferences.categories - Preferred categories
   * @param {string[]} preferences.colors - Preferred colors
   * @param {number} count - Number of themes to recommend
   * @returns {Object[]} Recommended themes
   */
  static getRecommendedThemes(preferences = {}, count = 3) {
    const { moods = [], categories = [], colors = [] } = preferences;
    const enabledThemes = ThemeManager.getEnabledThemes();
    
    // Score themes based on preferences
    const scoredThemes = enabledThemes.map(theme => {
      let score = 0;
      
      // Mood matching
      if (moods.includes(theme.mood)) {
        score += 3;
      }
      
      // Category matching
      if (categories.includes(theme.category)) {
        score += 3;
      }
      
      // Color matching
      if (theme.colors && colors.length > 0) {
        const colorMatches = theme.colors.filter(color => 
          colors.some(userColor => 
            color.toLowerCase().includes(userColor.toLowerCase()) ||
            userColor.toLowerCase().includes(color.toLowerCase())
          )
        );
        score += colorMatches.length;
      }
      
      return { theme, score };
    });
    
    // Sort by score and return top themes
    scoredThemes.sort((a, b) => b.score - a.score);
    
    // If no preferences match, return random themes
    if (scoredThemes.every(item => item.score === 0)) {
      return ThemeManager.getRandomThemes(count);
    }
    
    return scoredThemes.slice(0, count).map(item => item.theme);
  }

  /**
   * Get complementary themes based on a selected theme
   */
  static getComplementaryThemes(selectedTheme, count = 2) {
    const theme = typeof selectedTheme === 'string' 
      ? ThemeManager.getThemeByName(selectedTheme) || ThemeManager.getThemeById(selectedTheme)
      : selectedTheme;
    
    if (!theme) return ThemeManager.getRandomThemes(count);
    
    const enabledThemes = ThemeManager.getEnabledThemes()
      .filter(t => t.id !== theme.id);
    
    // Find themes with similar characteristics
    const complementaryThemes = enabledThemes.filter(t => {
      // Same category but different mood
      if (t.category === theme.category && t.mood !== theme.mood) return true;
      
      // Same mood but different category
      if (t.mood === theme.mood && t.category !== theme.category) return true;
      
      // Similar color palette
      if (theme.colors && t.colors) {
        const colorOverlap = theme.colors.some(color => 
          t.colors.some(tColor => 
            color.toLowerCase().includes(tColor.toLowerCase()) ||
            tColor.toLowerCase().includes(color.toLowerCase())
          )
        );
        if (colorOverlap) return true;
      }
      
      return false;
    });
    
    if (complementaryThemes.length >= count) {
      return complementaryThemes.slice(0, count);
    }
    
    // Fill with random themes if not enough complementary ones
    const additional = ThemeManager.getRandomThemes(count - complementaryThemes.length);
    return [...complementaryThemes, ...additional].slice(0, count);
  }

  /**
   * Get seasonal theme recommendations
   */
  static getSeasonalThemes(season, count = 3) {
    const seasonalMapping = {
      spring: ['bohemian_beach', 'enchanted_forest', 'japanese_cherry_blossom', 'tropical_paradise'],
      summer: ['bohemian_beach', 'tropical_paradise', 'modern_minimalist', 'hollywood_red_carpet'],
      fall: ['rustic_barn', 'vintage_victorian', 'enchanted_forest', 'steampunk_victorian'],
      winter: ['classic_timeless', 'fairytale_castle', 'vintage_victorian', 'hollywood_red_carpet']
    };
    
    const seasonalIds = seasonalMapping[season.toLowerCase()] || [];
    const seasonalThemes = seasonalIds
      .map(id => ThemeManager.getThemeById(id))
      .filter(theme => theme && theme.enabled);
    
    if (seasonalThemes.length >= count) {
      return seasonalThemes.slice(0, count);
    }
    
    // Fill with random themes
    const additional = ThemeManager.getRandomThemes(count - seasonalThemes.length);
    return [...seasonalThemes, ...additional].slice(0, count);
  }
}

/**
 * Theme validation and compatibility utilities
 */
export class ThemeValidator {
  /**
   * Validate theme configuration
   */
  static validateTheme(theme) {
    const requiredFields = [
      'id', 'name', 'description', 'themeDescription', 
      'clothingDescription', 'atmosphereDescription'
    ];
    
    const errors = [];
    
    requiredFields.forEach(field => {
      if (!theme[field]) {
        errors.push(`Missing required field: ${field}`);
      }
    });
    
    if (theme.colors && !Array.isArray(theme.colors)) {
      errors.push('Colors must be an array');
    }
    
    if (theme.props && !Array.isArray(theme.props)) {
      errors.push('Props must be an array');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Check theme compatibility with portrait type
   */
  static isThemeCompatibleWithPortraitType(theme, portraitType) {
    if (!theme.pose_suggestions) return true;
    
    return theme.pose_suggestions.hasOwnProperty(portraitType);
  }

  /**
   * Get validation report for all themes
   */
  static validateAllThemes() {
    const report = {
      validThemes: [],
      invalidThemes: [],
      warnings: []
    };
    
    Object.values(WEDDING_THEMES).forEach(theme => {
      const validation = this.validateTheme(theme);
      
      if (validation.isValid) {
        report.validThemes.push(theme.id);
      } else {
        report.invalidThemes.push({
          id: theme.id,
          errors: validation.errors
        });
      }
      
      // Check for warnings
      if (!theme.pose_suggestions) {
        report.warnings.push(`Theme ${theme.id} missing pose suggestions`);
      }
      
      if (!theme.colors || theme.colors.length === 0) {
        report.warnings.push(`Theme ${theme.id} missing color palette`);
      }
    });
    
    return report;
  }
}

/**
 * Theme migration and conversion utilities
 */
export class ThemeMigration {
  /**
   * Convert legacy style names to new theme format
   */
  static convertLegacyStyle(styleName) {
    const legacyMapping = {
      'Bohemian Beach Wedding': 'bohemian_beach',
      'Classic & Timeless Wedding': 'classic_timeless',
      'Rustic Barn Wedding': 'rustic_barn',
      'Vintage Victorian Wedding': 'vintage_victorian',
      'Modern Minimalist Wedding': 'modern_minimalist',
      'Fairytale Castle Wedding': 'fairytale_castle',
      'Enchanted Forest Wedding': 'enchanted_forest',
      'Tropical Paradise Wedding': 'tropical_paradise',
      'Japanese Cherry Blossom Wedding': 'japanese_cherry_blossom',
      'Steampunk Victorian Wedding': 'steampunk_victorian',
      'Disco 70s Glam Wedding': 'disco_70s_glam',
      'Hollywood Red Carpet Wedding': 'hollywood_red_carpet'
    };
    
    return legacyMapping[styleName] || styleName.toLowerCase().replace(/\s+/g, '_');
  }

  /**
   * Migrate user preferences from old format
   */
  static migrateUserPreferences(oldPreferences) {
    const migrated = {
      favoriteThemes: [],
      preferredCategories: [],
      preferredMoods: []
    };
    
    if (oldPreferences.favoriteStyles) {
      migrated.favoriteThemes = oldPreferences.favoriteStyles.map(
        style => this.convertLegacyStyle(style)
      );
    }
    
    // Add other migration logic as needed
    
    return migrated;
  }

  /**
   * Generate migration report
   */
  static generateMigrationReport() {
    const enabledThemes = ThemeManager.getEnabledThemes();
    const categories = ThemeManager.getCategories();
    const validation = ThemeValidator.validateAllThemes();
    
    return {
      totalThemes: Object.keys(WEDDING_THEMES).length,
      enabledThemes: enabledThemes.length,
      categories: categories.length,
      categoryBreakdown: categories.map(cat => ({
        category: cat,
        count: ThemeManager.getThemesByCategory(cat).length
      })),
      validation,
      migrationDate: new Date().toISOString()
    };
  }
}

/**
 * Theme analytics and insights
 */
export class ThemeAnalytics {
  /**
   * Analyze theme usage patterns
   */
  static analyzeThemeUsage(usageData = []) {
    const analytics = {
      mostPopular: null,
      categoryPopularity: {},
      moodPopularity: {},
      recommendations: []
    };
    
    if (usageData.length === 0) return analytics;
    
    // Count theme usage
    const themeCounts = {};
    const categoryCounts = {};
    const moodCounts = {};
    
    usageData.forEach(usage => {
      const theme = ThemeManager.getThemeById(usage.themeId);
      if (!theme) return;
      
      themeCounts[theme.id] = (themeCounts[theme.id] || 0) + 1;
      categoryCounts[theme.category] = (categoryCounts[theme.category] || 0) + 1;
      moodCounts[theme.mood] = (moodCounts[theme.mood] || 0) + 1;
    });
    
    // Find most popular theme
    const mostUsedThemeId = Object.keys(themeCounts)
      .reduce((a, b) => themeCounts[a] > themeCounts[b] ? a : b);
    analytics.mostPopular = ThemeManager.getThemeById(mostUsedThemeId);
    
    analytics.categoryPopularity = categoryCounts;
    analytics.moodPopularity = moodCounts;
    
    // Generate recommendations
    const leastUsed = Object.keys(themeCounts)
      .filter(id => themeCounts[id] < 2)
      .map(id => ThemeManager.getThemeById(id))
      .filter(theme => theme);
    
    analytics.recommendations = leastUsed.slice(0, 3);
    
    return analytics;
  }

  /**
   * Get theme statistics
   */
  static getThemeStatistics() {
    const themes = Object.values(WEDDING_THEMES);
    const enabled = themes.filter(t => t.enabled);
    
    return {
      total: themes.length,
      enabled: enabled.length,
      disabled: themes.length - enabled.length,
      categoryCounts: this.getCategoryCounts(),
      moodCounts: this.getMoodCounts(),
      avgColorsPerTheme: this.getAverageColorsPerTheme(),
      themesWithPoses: themes.filter(t => t.pose_suggestions).length
    };
  }

  static getCategoryCounts() {
    const counts = {};
    Object.values(WEDDING_THEMES).forEach(theme => {
      counts[theme.category] = (counts[theme.category] || 0) + 1;
    });
    return counts;
  }

  static getMoodCounts() {
    const counts = {};
    Object.values(WEDDING_THEMES).forEach(theme => {
      counts[theme.mood] = (counts[theme.mood] || 0) + 1;
    });
    return counts;
  }

  static getAverageColorsPerTheme() {
    const themes = Object.values(WEDDING_THEMES);
    const totalColors = themes.reduce((sum, theme) => 
      sum + (theme.colors ? theme.colors.length : 0), 0
    );
    return totalColors / themes.length;
  }
}

/**
 * Export all utilities
 */
export default {
  ThemeSelector,
  ThemeValidator,
  ThemeMigration,
  ThemeAnalytics
};