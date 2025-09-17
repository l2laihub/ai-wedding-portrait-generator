/**
 * Enhanced Prompt Service with Template Engine Integration
 * 
 * Extends the existing promptService with advanced template capabilities
 * while maintaining full backward compatibility with the admin system
 */

import { promptService, PromptTemplate } from './promptService';
import { PromptBuilder } from '../src/services/PromptBuilder.js';
import { ThemeManager } from '../src/config/themes.config.js';

export interface EnhancedPromptOptions {
  useTemplateEngine?: boolean;
  selectedTheme?: string | object;
  portraitType?: 'single' | 'couple' | 'family';
  userInput?: string;
  familyMemberCount?: number;
  additionalVariables?: Record<string, any>;
  fallbackToLegacy?: boolean;
}

class EnhancedPromptService {
  private promptBuilder: PromptBuilder;
  private useEnhancedByDefault: boolean = true;

  constructor() {
    this.promptBuilder = new PromptBuilder().configure({
      validateParams: false, // For backward compatibility
      fallbackEnabled: true
    });
  }

  /**
   * Enhanced prompt generation with template engine support
   * Maintains backward compatibility with existing generatePrompt method
   */
  public async generateEnhancedPrompt(
    type: 'single' | 'couple' | 'family',
    style: string,
    customPrompt: string = '',
    familyMemberCount: number = 3,
    options: EnhancedPromptOptions = {}
  ): Promise<string> {
    const {
      useTemplateEngine = this.useEnhancedByDefault,
      selectedTheme,
      additionalVariables = {},
      fallbackToLegacy = true
    } = options;

    try {
      // Get the base template from the existing admin system
      const template = await promptService.getPromptByType(type);
      if (!template) {
        throw new Error(`No template found for type: ${type}`);
      }

      // If template engine is disabled, use legacy method
      if (!useTemplateEngine) {
        return this.generateLegacyPrompt(type, style, customPrompt, familyMemberCount);
      }

      // Resolve theme - prefer selectedTheme over style parameter
      let themeObj;
      if (selectedTheme) {
        themeObj = this.promptBuilder.resolveTheme(selectedTheme);
      } else {
        // Try to match style parameter to theme
        themeObj = ThemeManager.getThemeByName(style) || 
                   ThemeManager.getThemeById(style) ||
                   this.promptBuilder.resolveTheme(style);
      }

      console.log(`[EnhancedPromptService] Using template engine for ${type} with theme:`, themeObj?.name);

      // Build enhanced prompt using template engine
      const enhancedPrompt = this.promptBuilder.buildPrompt({
        template: template.template,
        selectedTheme: themeObj,
        portraitType: type,
        userInput: customPrompt,
        familyMemberCount,
        additionalVars: {
          ...additionalVariables,
          templateVersion: template.version,
          templateId: template.id
        }
      });

      return enhancedPrompt;

    } catch (error) {
      console.error('[EnhancedPromptService] Template engine error:', error);

      // Fallback to legacy method if enabled
      if (fallbackToLegacy) {
        console.warn('[EnhancedPromptService] Falling back to legacy prompt generation');
        return this.generateLegacyPrompt(type, style, customPrompt, familyMemberCount);
      }

      throw error;
    }
  }

  /**
   * Generate prompt using legacy method (for backward compatibility)
   */
  public async generateLegacyPrompt(
    type: 'single' | 'couple' | 'family',
    style: string,
    customPrompt: string = '',
    familyMemberCount: number = 3
  ): Promise<string> {
    console.log('[EnhancedPromptService] Using legacy prompt generation');
    return promptService.generatePrompt(type, style, customPrompt, familyMemberCount);
  }

  /**
   * Generate prompt with theme object instead of style string
   */
  public async generatePromptWithTheme(
    type: 'single' | 'couple' | 'family',
    themeObj: any,
    customPrompt: string = '',
    familyMemberCount: number = 3,
    additionalVariables: Record<string, any> = {}
  ): Promise<string> {
    return this.generateEnhancedPrompt(
      type,
      themeObj.name || 'Classic Wedding', // Fallback style name
      customPrompt,
      familyMemberCount,
      {
        useTemplateEngine: true,
        selectedTheme: themeObj,
        additionalVariables
      }
    );
  }

  /**
   * Batch generate prompts for multiple themes
   */
  public async batchGeneratePrompts(
    type: 'single' | 'couple' | 'family',
    themes: any[],
    customPrompt: string = '',
    familyMemberCount: number = 3
  ): Promise<Array<{ theme: any; prompt: string }>> {
    const results = [];

    for (const theme of themes) {
      try {
        const prompt = await this.generatePromptWithTheme(
          type,
          theme,
          customPrompt,
          familyMemberCount
        );
        results.push({ theme, prompt });
      } catch (error) {
        console.error(`Failed to generate prompt for theme ${theme.id}:`, error);
        // Continue with other themes
      }
    }

    return results;
  }

  /**
   * Get recommended themes and generate their prompts
   */
  public async generateRecommendedPrompts(
    type: 'single' | 'couple' | 'family',
    preferences: any = {},
    customPrompt: string = '',
    familyMemberCount: number = 3,
    count: number = 3
  ): Promise<Array<{ theme: any; prompt: string }>> {
    // This would require importing ThemeSelector from themeUtils
    // For now, use random themes
    const themes = ThemeManager.getRandomThemes(count);
    return this.batchGeneratePrompts(type, themes, customPrompt, familyMemberCount);
  }

  /**
   * Preview prompt with different themes (for admin interface)
   */
  public async previewPromptWithThemes(
    templateContent: string,
    type: 'single' | 'couple' | 'family',
    themes: any[],
    customPrompt: string = '',
    familyMemberCount: number = 3
  ): Promise<Array<{ theme: any; preview: string }>> {
    const results = [];

    for (const theme of themes) {
      try {
        const preview = this.promptBuilder.buildPrompt({
          template: templateContent,
          selectedTheme: theme,
          portraitType: type,
          userInput: customPrompt,
          familyMemberCount
        });
        results.push({ theme, preview });
      } catch (error) {
        console.error(`Failed to preview prompt for theme ${theme.id}:`, error);
        results.push({ 
          theme, 
          preview: `Error generating preview: ${error.message}` 
        });
      }
    }

    return results;
  }

  /**
   * Get all available template variables including new enhanced ones
   */
  public getAvailableVariables(type: 'single' | 'couple' | 'family'): string[] {
    // Get legacy variables
    const legacyVariables = promptService.getAvailableVariables(type);
    
    // Add enhanced template engine variables
    const enhancedVariables = [
      '{theme}',
      '{themeDescription}',
      '{clothingDescription}',
      '{atmosphereDescription}',
      '{portraitType}',
      '{userInput}',
      '{colors}',
      '{props}',
      '{lighting}',
      '{mood}',
      '{category}',
      '{facePreservationInstructions}',
      '{poseSuggestions}',
      '{hasUserInput}',
      '{isFamily}',
      '{isCouple}',
      '{isSingle}'
    ];

    // Combine and deduplicate
    return [...new Set([...legacyVariables, ...enhancedVariables])];
  }

  /**
   * Get variable descriptions for admin interface
   */
  public getVariableDescriptions(): Record<string, string> {
    return {
      // Legacy variables
      '{style}': 'Wedding style name (legacy, use {theme} for new templates)',
      '{customPrompt}': 'User\'s custom prompt input (legacy, use {userInput} for new)',
      '{familyMemberCount}': 'Number of family members (for family portraits)',

      // Enhanced variables
      '{theme}': 'Wedding theme name',
      '{themeDescription}': 'Detailed description of the wedding setting and environment',
      '{clothingDescription}': 'Theme-specific clothing and attire descriptions',
      '{atmosphereDescription}': 'Mood, lighting, and atmosphere details',
      '{portraitType}': 'Type of portrait: single person, couple, or family',
      '{userInput}': 'User\'s custom enhancement request',
      '{colors}': 'Theme color palette (comma-separated)',
      '{props}': 'Theme-specific props and accessories (comma-separated)',
      '{lighting}': 'Lighting style for the theme',
      '{mood}': 'Overall mood of the theme',
      '{category}': 'Theme category (outdoor, vintage, modern, etc.)',
      '{facePreservationInstructions}': 'Specific face preservation instructions',
      '{poseSuggestions}': 'Suggested poses for the portrait type and theme',
      
      // Conditional variables
      '{hasUserInput}': 'true/false - whether user provided custom input',
      '{isFamily}': 'true/false - whether this is a family portrait',
      '{isCouple}': 'true/false - whether this is a couple portrait',
      '{isSingle}': 'true/false - whether this is a single person portrait'
    };
  }

  /**
   * Validate template with enhanced variables
   */
  public validateTemplate(templateContent: string, type: 'single' | 'couple' | 'family'): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    usedVariables: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const usedVariables: string[] = [];

    // Find all variables in template
    const variableMatches = templateContent.match(/\{[^}]+\}/g) || [];
    const availableVariables = this.getAvailableVariables(type);

    variableMatches.forEach(variable => {
      usedVariables.push(variable);
      
      if (!availableVariables.includes(variable)) {
        warnings.push(`Unknown variable: ${variable}`);
      }
    });

    // Check for required elements
    if (!templateContent.toLowerCase().includes('face') && 
        !templateContent.toLowerCase().includes('preserve')) {
      warnings.push('Template should include face preservation instructions');
    }

    // Check for type-specific requirements
    if (type === 'family' && !templateContent.includes('{familyMemberCount}')) {
      warnings.push('Family templates should use {familyMemberCount} variable');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      usedVariables: [...new Set(usedVariables)]
    };
  }

  /**
   * Configure the enhanced prompt service
   */
  public configure(options: {
    useEnhancedByDefault?: boolean;
    promptBuilderOptions?: any;
  }) {
    if (options.useEnhancedByDefault !== undefined) {
      this.useEnhancedByDefault = options.useEnhancedByDefault;
    }

    if (options.promptBuilderOptions) {
      this.promptBuilder.configure(options.promptBuilderOptions);
    }

    return this;
  }

  /**
   * Get service statistics
   */
  public getServiceStats() {
    return {
      enhancedByDefault: this.useEnhancedByDefault,
      availableThemes: ThemeManager.getEnabledThemes().length,
      totalThemes: Object.keys(ThemeManager.WEDDING_THEMES || {}).length,
      supportedVariables: this.getAvailableVariables('couple').length
    };
  }

  // Proxy methods for backward compatibility
  public async getPrompts(forceReload?: boolean) {
    return promptService.getPrompts(forceReload);
  }

  public async getPromptByType(type: 'single' | 'couple' | 'family') {
    return promptService.getPromptByType(type);
  }

  public async savePrompts(prompts: PromptTemplate[]) {
    return promptService.savePrompts(prompts);
  }

  public async updatePrompt(updatedPrompt: PromptTemplate) {
    return promptService.updatePrompt(updatedPrompt);
  }

  public async resetToDefault(promptId: string) {
    return promptService.resetToDefault(promptId);
  }

  public async exportPrompts() {
    return promptService.exportPrompts();
  }

  public async importPrompts(jsonData: string) {
    return promptService.importPrompts(jsonData);
  }

  public clearCache() {
    promptService.clearCache();
  }
}

// Export singleton instance
export const enhancedPromptService = new EnhancedPromptService();
export default enhancedPromptService;