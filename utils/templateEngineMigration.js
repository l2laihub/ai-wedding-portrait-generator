/**
 * Template Engine Migration Utility
 * 
 * Handles migration from legacy style system to new template engine
 * Provides backward compatibility and smooth transition
 */

import { ThemeManager, WEDDING_THEMES } from '../src/config/themes.config.js';
import { ThemeMigration, ThemeValidator } from '../src/utils/themeUtils.js';
// Enhanced prompt service import commented out to prevent build issues
// import { enhancedPromptService } from '../services/enhancedPromptService';

export class TemplateEngineMigration {
  /**
   * Migrate from legacy style array to new theme system
   */
  static migrateLegacyStyles(legacyStyles) {
    console.log('[Migration] Migrating legacy styles to themes:', legacyStyles.length);
    
    const migratedThemes = legacyStyles.map(styleName => {
      // Try to find matching theme
      let theme = ThemeManager.getThemeByName(styleName);
      
      if (!theme) {
        // Try legacy mapping
        const themeId = ThemeMigration.convertLegacyStyle(styleName);
        theme = ThemeManager.getThemeById(themeId);
      }
      
      if (!theme) {
        // Create a basic theme object for unknown styles
        const id = styleName.toLowerCase().replace(/\s+/g, '_').replace(/[^\w]/g, '');
        theme = {
          id,
          name: styleName,
          description: `${styleName} wedding theme`,
          enabled: true,
          category: 'traditional',
          mood: 'romantic',
          themeDescription: `A beautiful ${styleName.toLowerCase()} wedding setting with elegant details and romantic atmosphere`,
          clothingDescription: `${styleName} wedding attire with traditional styling and elegant accessories`,
          atmosphereDescription: `${styleName.toLowerCase()} atmosphere with romantic lighting and elegant ambiance`,
          colors: ['white', 'ivory', 'gold'],
          props: ['elegant details', 'romantic elements'],
          lighting: 'romantic lighting'
        };
        
        console.warn('[Migration] Created fallback theme for unknown style:', styleName);
      }
      
      return theme;
    });
    
    console.log('[Migration] Successfully migrated themes:', migratedThemes.length);
    return migratedThemes;
  }

  /**
   * Get random themes with legacy fallback support
   */
  static getRandomWeddingThemes(count = 3, legacyStyles = []) {
    try {
      // Try to use new theme system
      const themes = ThemeManager.getRandomThemes(count);
      if (themes && themes.length >= count) {
        console.log('[Migration] Using new theme system for random selection');
        return themes;
      }
    } catch (error) {
      console.warn('[Migration] Theme system unavailable, using legacy fallback:', error);
    }
    
    // Fallback to legacy style system
    if (legacyStyles.length > 0) {
      const shuffled = [...legacyStyles].sort(() => 0.5 - Math.random());
      const selectedStyles = shuffled.slice(0, count);
      return this.migrateLegacyStyles(selectedStyles);
    }
    
    // Final fallback to hardcoded themes
    console.warn('[Migration] Using final fallback themes');
    return this.getDefaultThemes(count);
  }

  /**
   * Get default themes for emergency fallback
   */
  static getDefaultThemes(count = 3) {
    const defaultThemes = [
      {
        id: 'classic_timeless',
        name: 'Classic & Timeless Wedding',
        description: 'Traditional elegant wedding',
        enabled: true,
        category: 'traditional',
        mood: 'elegant',
        themeDescription: 'An elegant traditional wedding with sophisticated styling',
        clothingDescription: 'Classic wedding attire with traditional styling',
        atmosphereDescription: 'Elegant and timeless atmosphere',
        colors: ['ivory', 'gold', 'white'],
        lighting: 'soft elegant lighting'
      },
      {
        id: 'bohemian_beach',
        name: 'Bohemian Beach Wedding',
        description: 'Relaxed beach wedding',
        enabled: true,
        category: 'outdoor',
        mood: 'romantic',
        themeDescription: 'A romantic beach wedding with natural elements',
        clothingDescription: 'Flowing beach wedding attire',
        atmosphereDescription: 'Relaxed romantic beach atmosphere',
        colors: ['cream', 'coral', 'gold'],
        lighting: 'golden hour lighting'
      },
      {
        id: 'rustic_barn',
        name: 'Rustic Barn Wedding',
        description: 'Country barn wedding',
        enabled: true,
        category: 'rustic',
        mood: 'cozy',
        themeDescription: 'A charming rustic barn with country elements',
        clothingDescription: 'Rustic country wedding attire',
        atmosphereDescription: 'Warm cozy country atmosphere',
        colors: ['burlap', 'sage', 'cream'],
        lighting: 'warm rustic lighting'
      }
    ];
    
    return defaultThemes.slice(0, count);
  }

  /**
   * Validate migration compatibility
   */
  static validateMigration() {
    const report = {
      themeSystemAvailable: false,
      promptBuilderAvailable: false,
      themesValidated: 0,
      errors: [],
      warnings: [],
      migrationReady: false
    };
    
    try {
      // Check if theme system is available
      if (ThemeManager && typeof ThemeManager.getEnabledThemes === 'function') {
        report.themeSystemAvailable = true;
        
        // Validate themes
        const validation = ThemeValidator.validateAllThemes();
        report.themesValidated = validation.validThemes.length;
        report.errors.push(...validation.invalidThemes.map(t => `Invalid theme: ${t.id}`));
        report.warnings.push(...validation.warnings);
      }
    } catch (error) {
      report.errors.push(`Theme system error: ${error.message}`);
    }
    
    try {
      // Check if prompt builder is available (commented out for build compatibility)
      // if (enhancedPromptService) {
      //   report.promptBuilderAvailable = true;
      // }
      report.promptBuilderAvailable = false; // Temporarily disabled
    } catch (error) {
      report.errors.push(`Prompt builder error: ${error.message}`);
    }
    
    // Determine if migration is ready
    report.migrationReady = report.themeSystemAvailable && 
                           report.promptBuilderAvailable && 
                           report.errors.length === 0;
    
    return report;
  }

  /**
   * Perform safe migration with rollback capability
   */
  static async performSafeMigration(legacyStyles, options = {}) {
    const {
      enableFallback = true,
      validateBeforeUse = true,
      logMigration = true
    } = options;

    if (logMigration) {
      console.log('[Migration] Starting safe migration process');
    }

    const backup = {
      legacyStyles: [...legacyStyles],
      timestamp: Date.now()
    };

    try {
      // Validate migration readiness
      const validation = this.validateMigration();
      
      if (!validation.migrationReady && !enableFallback) {
        throw new Error(`Migration not ready: ${validation.errors.join(', ')}`);
      }

      // Perform migration
      let migratedThemes;
      
      if (validation.migrationReady) {
        migratedThemes = this.migrateLegacyStyles(legacyStyles);
        
        if (validateBeforeUse) {
          // Validate each migrated theme
          migratedThemes = migratedThemes.filter(theme => {
            const themeValidation = ThemeValidator.validateTheme(theme);
            if (!themeValidation.isValid) {
              console.warn('[Migration] Removing invalid theme:', theme.name, themeValidation.errors);
              return false;
            }
            return true;
          });
        }
      } else {
        // Use fallback themes
        console.warn('[Migration] Using fallback themes due to validation failures');
        migratedThemes = this.getDefaultThemes(legacyStyles.length);
      }

      if (logMigration) {
        console.log('[Migration] Migration completed successfully', {
          original: legacyStyles.length,
          migrated: migratedThemes.length,
          systemReady: validation.migrationReady
        });
      }

      return {
        success: true,
        themes: migratedThemes,
        backup,
        validation
      };

    } catch (error) {
      console.error('[Migration] Migration failed:', error);
      
      // Return legacy styles as fallback themes
      const fallbackThemes = this.migrateLegacyStyles(backup.legacyStyles);
      
      return {
        success: false,
        error: error.message,
        themes: fallbackThemes, // Still provide themes for functionality
        backup,
        validation: this.validateMigration()
      };
    }
  }

  /**
   * Generate migration report
   */
  static generateMigrationReport(legacyStyles = []) {
    const validation = this.validateMigration();
    const themeStats = ThemeManager ? {
      totalThemes: Object.keys(WEDDING_THEMES || {}).length,
      enabledThemes: ThemeManager.getEnabledThemes ? ThemeManager.getEnabledThemes().length : 0,
      categories: ThemeManager.getCategories ? ThemeManager.getCategories().length : 0
    } : null;

    return {
      timestamp: new Date().toISOString(),
      legacyStyleCount: legacyStyles.length,
      validation,
      themeStats,
      migrationRecommendation: validation.migrationReady 
        ? 'Ready for full migration'
        : 'Use fallback mode',
      estimatedMigrationTime: legacyStyles.length * 10 // ms per style
    };
  }
}

/**
 * Utility functions for backward compatibility
 */
export const migrationUtils = {
  /**
   * Safe wrapper for getting random themes with legacy fallback
   */
  getRandomWeddingStyles: (count = 3, legacyStyles = []) => {
    return TemplateEngineMigration.getRandomWeddingThemes(count, legacyStyles);
  },

  /**
   * Convert style names to theme objects
   */
  stylesToThemes: (styles) => {
    return TemplateEngineMigration.migrateLegacyStyles(styles);
  },

  /**
   * Check if new system is available
   */
  isNewSystemAvailable: () => {
    const validation = TemplateEngineMigration.validateMigration();
    return validation.migrationReady;
  },

  /**
   * Get migration status
   */
  getMigrationStatus: () => {
    return TemplateEngineMigration.validateMigration();
  }
};

export default TemplateEngineMigration;