/**
 * Unified Theme Service
 * Bridges legacy theme config with enhanced database themes
 */

import { supabase } from './supabaseClient';
import { WEDDING_THEMES, ThemeManager } from '../src/config/themes.config.js';

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
  source: 'database' | 'legacy';
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
  
  constructor() {
    // Check if enhanced mode preference is stored
    this.useEnhancedMode = localStorage.getItem('wedai_enhanced_theme_mode') === 'true';
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
   * Get all themes from both sources
   */
  async getAllThemes(): Promise<WeddingStyle[]> {
    const themes: WeddingStyle[] = [];

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
    if (themes.length === 0 || !this.useEnhancedMode) {
      const legacyThemes = Object.values(WEDDING_THEMES)
        .filter(theme => theme.enabled)
        .map(theme => this.convertLegacyToUnified(theme));
      
      themes.push(...legacyThemes);
    }

    return themes;
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
  async getThemesByCategory(category: string): Promise<WeddingStyle[]> {
    const allThemes = await this.getAllThemes();
    return allThemes.filter(theme => theme.category === category);
  }

  /**
   * Get themes by mood
   */
  async getThemesByMood(mood: string): Promise<WeddingStyle[]> {
    const allThemes = await this.getAllThemes();
    return allThemes.filter(theme => theme.mood.includes(mood));
  }

  /**
   * Get theme by ID
   */
  async getThemeById(id: string): Promise<WeddingStyle | null> {
    const allThemes = await this.getAllThemes();
    return allThemes.find(theme => theme.id === id) || null;
  }

  /**
   * Get theme by name (for legacy compatibility)
   */
  async getThemeByName(name: string): Promise<WeddingStyle | null> {
    const allThemes = await this.getAllThemes();
    return allThemes.find(theme => theme.name === name) || null;
  }

  /**
   * Get available categories
   */
  async getCategories(): Promise<string[]> {
    const allThemes = await this.getAllThemes();
    const categories = new Set(allThemes.map(theme => theme.category));
    return Array.from(categories);
  }

  /**
   * Get available moods
   */
  async getMoods(): Promise<string[]> {
    const allThemes = await this.getAllThemes();
    const moods = new Set();
    allThemes.forEach(theme => {
      theme.mood.forEach(m => moods.add(m));
    });
    return Array.from(moods);
  }

  /**
   * Get theme names for backward compatibility
   */
  async getThemeNames(): Promise<string[]> {
    const allThemes = await this.getAllThemes();
    return allThemes.map(theme => theme.name);
  }

  /**
   * Get random themes for generation
   */
  async getRandomThemes(count = 3): Promise<WeddingStyle[]> {
    const allThemes = await this.getAllThemes();
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
   * Get system status
   */
  async getSystemStatus() {
    const databaseAvailable = await this.isDatabaseAvailable();
    const allThemes = await this.getAllThemes();
    const databaseThemes = allThemes.filter(t => t.source === 'database').length;
    const legacyThemes = allThemes.filter(t => t.source === 'legacy').length;

    return {
      enhancedMode: this.useEnhancedMode,
      databaseAvailable,
      totalThemes: allThemes.length,
      databaseThemes,
      legacyThemes,
      activeSource: this.useEnhancedMode && databaseAvailable ? 'database' : 'legacy'
    };
  }
}

export const unifiedThemeService = new UnifiedThemeService();
export default unifiedThemeService;