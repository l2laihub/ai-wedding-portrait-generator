/**
 * Unified Theme Service
 * Bridges legacy theme config with enhanced database themes
 */

import { supabase } from './supabaseClient';
import { WEDDING_THEMES, ThemeManager } from '../src/config/themes.config.js';
import { PhotoPackagesService, type PackageTheme } from './photoPackagesService';

export interface WeddingStyle {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  popularity: number;
  color_palette: string[];
  mood: string[];
  setting: string;
  prompt_modifiers: any[];
  style_variations: any[];
  preview_image?: string;
  inspiration_images: string[];
  enabled: boolean;
  featured: boolean;
  seasonal: boolean;
  premium_only: boolean;
  created_at: string;
  updated_at: string;
  source: 'database' | 'legacy' | 'package';
  
  // Package-specific fields
  package_id?: string;
  prompt_template?: string;
  prompt_variables?: Record<string, any>;
  conditional_sections?: any[];
  style_complexity?: 'simple' | 'standard' | 'complex' | 'advanced';
  generation_time_estimate?: number;
  quality_score?: number;
}

export interface LegacyTheme {
  id: string;
  name: string;
  description: string;
  category: string;
  mood: string;
  enabled: boolean;
  source: 'legacy';
}

class UnifiedThemeService {
  private useEnhancedMode = false;
  private usePackageMode = false;
  
  constructor() {
    // Check if enhanced mode preference is stored
    this.useEnhancedMode = localStorage.getItem('wedai_enhanced_theme_mode') === 'true';
    // Check if package mode preference is stored
    this.usePackageMode = localStorage.getItem('wedai_package_mode') === 'true';
  }

  /**
   * Set enhanced mode preference
   */
  setEnhancedMode(enabled: boolean) {
    this.useEnhancedMode = enabled;
    localStorage.setItem('wedai_enhanced_theme_mode', enabled.toString());
  }

  /**
   * Get enhanced mode preference
   */
  getEnhancedMode(): boolean {
    return this.useEnhancedMode;
  }

  /**
   * Set package mode preference
   */
  setPackageMode(enabled: boolean) {
    this.usePackageMode = enabled;
    localStorage.setItem('wedai_package_mode', enabled.toString());
  }

  /**
   * Get package mode preference
   */
  getPackageMode(): boolean {
    return this.usePackageMode;
  }

  /**
   * Get themes for a specific package
   */
  async getPackageThemes(packageId: string): Promise<WeddingStyle[]> {
    try {
      const themes = await PhotoPackagesService.getPackageThemes(packageId, true);
      return themes.map(theme => this.convertPackageThemeToUnified(theme));
    } catch (error) {
      console.error('Error loading package themes:', error);
      return [];
    }
  }

  /**
   * Get all themes from all sources (package, database, legacy)
   */
  async getAllThemes(packageId?: string): Promise<WeddingStyle[]> {
    const themes: WeddingStyle[] = [];

    // If package mode is enabled and packageId is provided, prioritize package themes
    if (this.usePackageMode && packageId) {
      try {
        const packageThemes = await this.getPackageThemes(packageId);
        if (packageThemes.length > 0) {
          themes.push(...packageThemes);
          return themes; // Return only package themes in package mode
        }
      } catch (error) {
        console.warn('Could not load package themes, falling back to enhanced/legacy:', error);
      }
    }

    if (this.useEnhancedMode) {
      // Try to get database themes first
      try {
        const { data: dbThemes, error } = await supabase
          .from('wedding_styles')
          .select('*')
          .eq('enabled', true)
          .order('popularity', { ascending: false });

        if (!error && dbThemes) {
          themes.push(...dbThemes.map(theme => ({
            ...theme,
            source: 'database' as const
          })));
        }
      } catch (error) {
        console.warn('Could not load database themes, falling back to legacy:', error);
      }
    }

    // If we don't have database themes or enhanced mode is off, use legacy themes
    if (themes.length === 0 || (!this.useEnhancedMode && !this.usePackageMode)) {
      const legacyThemes = Object.values(WEDDING_THEMES)
        .filter(theme => theme.enabled)
        .map(theme => this.convertLegacyToUnified(theme));
      
      themes.push(...legacyThemes);
    }

    return themes;
  }

  /**
   * Convert package theme to unified format
   */
  private convertPackageThemeToUnified(packageTheme: PackageTheme): WeddingStyle {
    return {
      id: packageTheme.id,
      name: packageTheme.name,
      description: packageTheme.description || '',
      category: packageTheme.category,
      tags: packageTheme.mood_tags,
      popularity: packageTheme.popularity_score,
      color_palette: packageTheme.color_palette,
      mood: packageTheme.mood_tags,
      setting: packageTheme.description || '',
      prompt_modifiers: [],
      style_variations: [],
      preview_image: packageTheme.preview_image,
      inspiration_images: [],
      enabled: packageTheme.enabled,
      featured: !packageTheme.premium_only,
      seasonal: packageTheme.seasonal,
      premium_only: packageTheme.premium_only,
      created_at: packageTheme.created_at,
      updated_at: packageTheme.updated_at,
      source: 'package' as const,
      
      // Package-specific fields
      package_id: packageTheme.package_id,
      prompt_template: packageTheme.prompt_template,
      prompt_variables: packageTheme.prompt_variables,
      conditional_sections: packageTheme.conditional_sections,
      style_complexity: packageTheme.style_complexity,
      generation_time_estimate: packageTheme.generation_time_estimate,
      quality_score: packageTheme.quality_score
    };
  }

  /**
   * Convert legacy theme to unified format
   */
  private convertLegacyToUnified(legacyTheme: any): WeddingStyle {
    return {
      id: legacyTheme.id,
      name: legacyTheme.name,
      description: legacyTheme.description,
      category: legacyTheme.category,
      tags: [legacyTheme.mood, legacyTheme.category],
      popularity: 5, // Default popularity
      color_palette: legacyTheme.colors || [],
      mood: [legacyTheme.mood],
      setting: legacyTheme.themeDescription || '',
      prompt_modifiers: [],
      style_variations: [],
      preview_image: undefined,
      inspiration_images: [],
      enabled: legacyTheme.enabled,
      featured: false,
      seasonal: false,
      premium_only: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      source: 'legacy' as const
    };
  }

  /**
   * Get themes by category
   */
  async getThemesByCategory(category: string, packageId?: string): Promise<WeddingStyle[]> {
    const allThemes = await this.getAllThemes(packageId);
    return allThemes.filter(theme => theme.category === category);
  }

  /**
   * Get themes by mood
   */
  async getThemesByMood(mood: string, packageId?: string): Promise<WeddingStyle[]> {
    const allThemes = await this.getAllThemes(packageId);
    return allThemes.filter(theme => theme.mood.includes(mood));
  }

  /**
   * Get theme by ID (package-aware)
   */
  async getThemeById(id: string, packageId?: string): Promise<WeddingStyle | null> {
    // First try to get from package themes if packageId is provided
    if (packageId) {
      try {
        const packageTheme = await PhotoPackagesService.getThemeById(id);
        if (packageTheme && packageTheme.package_id === packageId) {
          return this.convertPackageThemeToUnified(packageTheme);
        }
      } catch (error) {
        console.warn('Error loading package theme by ID:', error);
      }
    }

    // Fallback to all themes
    const allThemes = await this.getAllThemes(packageId);
    return allThemes.find(theme => theme.id === id) || null;
  }

  /**
   * Get theme by name (for legacy compatibility)
   */
  async getThemeByName(name: string, packageId?: string): Promise<WeddingStyle | null> {
    const allThemes = await this.getAllThemes(packageId);
    return allThemes.find(theme => theme.name === name) || null;
  }

  /**
   * Get available categories
   */
  async getCategories(packageId?: string): Promise<string[]> {
    const allThemes = await this.getAllThemes(packageId);
    const categories = new Set(allThemes.map(theme => theme.category));
    return Array.from(categories);
  }

  /**
   * Get available moods
   */
  async getMoods(packageId?: string): Promise<string[]> {
    const allThemes = await this.getAllThemes(packageId);
    const moods = new Set();
    allThemes.forEach(theme => {
      theme.mood.forEach(m => moods.add(m));
    });
    return Array.from(moods);
  }

  /**
   * Get theme names for backward compatibility
   */
  async getThemeNames(packageId?: string): Promise<string[]> {
    const allThemes = await this.getAllThemes(packageId);
    return allThemes.map(theme => theme.name);
  }

  /**
   * Get random themes for generation (package-aware)
   */
  async getRandomThemes(count = 3, packageId?: string): Promise<WeddingStyle[]> {
    const allThemes = await this.getAllThemes(packageId);
    const shuffled = [...allThemes].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  /**
   * Generate enhanced prompt with theme data
   */
  async generateEnhancedPrompt(
    baseTemplate: string,
    themeName: string,
    customPrompt: string = '',
    familyMemberCount?: number
  ): Promise<string> {
    const theme = await this.getThemeByName(themeName);
    
    if (!theme) {
      // Fallback to simple replacement
      return baseTemplate
        .replace('{style}', themeName)
        .replace('{customPrompt}', customPrompt)
        .replace('{familyMemberCount}', familyMemberCount?.toString() || '');
    }

    let enhancedTemplate = baseTemplate;

    // Apply prompt modifiers if available (database themes)
    if (theme.source === 'database' && theme.prompt_modifiers.length > 0) {
      theme.prompt_modifiers.forEach((modifier: any) => {
        if (modifier.type === 'prepend') {
          enhancedTemplate = modifier.content + ' ' + enhancedTemplate;
        } else if (modifier.type === 'append') {
          enhancedTemplate = enhancedTemplate + ' ' + modifier.content;
        }
      });
    }

    // Enhanced replacements with theme data
    enhancedTemplate = enhancedTemplate
      .replace('{style}', theme.name)
      .replace('{themeDescription}', theme.setting || theme.description)
      .replace('{customPrompt}', customPrompt)
      .replace('{familyMemberCount}', familyMemberCount?.toString() || '');

    // Add mood and atmosphere details for legacy themes
    if (theme.source === 'legacy') {
      const legacyTheme = WEDDING_THEMES[theme.id];
      if (legacyTheme) {
        enhancedTemplate = enhancedTemplate.replace(
          theme.name,
          `${theme.name}. ${legacyTheme.themeDescription || ''} ${legacyTheme.atmosphereDescription || ''}`
        );
      }
    }

    return enhancedTemplate;
  }

  /**
   * Check if database themes are available
   */
  async isDatabaseAvailable(): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('wedding_styles')
        .select('id')
        .limit(1);
      
      return !error && data !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if package themes are available
   */
  async isPackageAvailable(packageId?: string): Promise<boolean> {
    if (!packageId) return false;
    try {
      const packageThemes = await this.getPackageThemes(packageId);
      return packageThemes.length > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get system status including package information
   */
  async getSystemStatus(packageId?: string) {
    const databaseAvailable = await this.isDatabaseAvailable();
    const packageAvailable = packageId ? await this.isPackageAvailable(packageId) : false;
    const allThemes = await this.getAllThemes(packageId);
    const databaseThemes = allThemes.filter(t => t.source === 'database').length;
    const packageThemes = allThemes.filter(t => t.source === 'package').length;
    const legacyThemes = allThemes.filter(t => t.source === 'legacy').length;

    let activeSource = 'legacy';
    if (this.usePackageMode && packageAvailable && packageId) {
      activeSource = 'package';
    } else if (this.useEnhancedMode && databaseAvailable) {
      activeSource = 'database';
    }

    return {
      enhancedMode: this.useEnhancedMode,
      packageMode: this.usePackageMode,
      databaseAvailable,
      packageAvailable,
      currentPackageId: packageId,
      totalThemes: allThemes.length,
      databaseThemes,
      packageThemes,
      legacyThemes,
      activeSource
    };
  }
}

export const unifiedThemeService = new UnifiedThemeService();
export default unifiedThemeService;