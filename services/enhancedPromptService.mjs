/**
 * Enhanced Prompt Service (ES Modules version)
 * Provides immediate compatibility for ES modules environment
 */

import { ThemeManager } from '../src/config/themes.config.js';
import { PromptBuilder } from '../src/services/PromptBuilder.js';

class EnhancedPromptService {
  constructor() {
    this.promptBuilder = new PromptBuilder();
    this.useEnhancedByDefault = true;
  }

  /**
   * Generate enhanced prompt with theme support
   */
  async generateEnhancedPrompt(type, style, customPrompt = '', familyMemberCount = 3, options = {}) {
    const {
      useTemplateEngine = this.useEnhancedByDefault,
      selectedTheme,
      additionalVariables = {},
      fallbackToLegacy = true
    } = options;

    try {
      // Resolve theme
      let themeObj;
      if (selectedTheme) {
        themeObj = this.promptBuilder.resolveTheme(selectedTheme);
      } else {
        themeObj = ThemeManager.getThemeByName(style) || 
                   ThemeManager.getThemeById(style) ||
                   this.promptBuilder.resolveTheme(style);
      }

      console.log(`[EnhancedPromptService] Using theme:`, themeObj?.name);

      // Get base template (simplified for immediate use)
      const baseTemplate = this.getBaseTemplate(type);

      // Build enhanced prompt
      const enhancedPrompt = this.promptBuilder.buildPrompt({
        template: baseTemplate,
        selectedTheme: themeObj,
        portraitType: type,
        userInput: customPrompt,
        familyMemberCount,
        additionalVars: additionalVariables
      });

      return enhancedPrompt;

    } catch (error) {
      console.error('[EnhancedPromptService] Error:', error);
      
      if (fallbackToLegacy) {
        return this.generateLegacyPrompt(type, style, customPrompt, familyMemberCount);
      }
      
      throw error;
    }
  }

  /**
   * Generate prompt with theme object
   */
  async generatePromptWithTheme(type, themeObj, customPrompt = '', familyMemberCount = 3) {
    return this.generateEnhancedPrompt(
      type,
      themeObj.name,
      customPrompt,
      familyMemberCount,
      { selectedTheme: themeObj }
    );
  }

  /**
   * Batch generate prompts for multiple themes
   */
  async batchGeneratePrompts(type, themes, customPrompt = '', familyMemberCount = 3) {
    const results = [];

    for (const theme of themes) {
      try {
        const prompt = await this.generatePromptWithTheme(
          type, theme, customPrompt, familyMemberCount
        );
        results.push({ theme, prompt });
      } catch (error) {
        console.error(`Failed to generate prompt for theme ${theme.id}:`, error);
      }
    }

    return results;
  }

  /**
   * Get service statistics
   */
  getServiceStats() {
    return {
      enhancedByDefault: this.useEnhancedByDefault,
      availableThemes: ThemeManager.getEnabledThemes().length,
      totalThemes: Object.keys(ThemeManager.WEDDING_THEMES || {}).length,
      supportedTypes: ['single', 'couple', 'family']
    };
  }

  /**
   * Get base template for prompt type
   */
  getBaseTemplate(type) {
    const templates = {
      single: `{facePreservationInstructions} Transform this photo into a beautiful {theme} wedding portrait. {themeDescription} The person should be wearing {clothingDescription}. {atmosphereDescription} {userInput ? ENHANCE: Include this user request: {userInput} : ''}`,
      
      couple: `{facePreservationInstructions} Transform this photo into a beautiful {theme} wedding portrait of a couple. {themeDescription} The couple should be wearing {clothingDescription}. {atmosphereDescription} {userInput ? ENHANCE: Include this user request: {userInput} : ''}`,
      
      family: `{facePreservationInstructions} Transform this photo into a beautiful {theme} wedding portrait of a family with {familyMemberCount} members. {themeDescription} The family should be wearing {clothingDescription}. {atmosphereDescription} {userInput ? ENHANCE: Include this user request: {userInput} : ''}`
    };

    return templates[type] || templates.couple;
  }

  /**
   * Fallback to legacy prompt generation
   */
  generateLegacyPrompt(type, style, customPrompt = '', familyMemberCount = 3) {
    console.log('[EnhancedPromptService] Using legacy prompt generation');
    
    const templates = {
      single: `CRITICAL: Preserve the person's facial identity exactly. Transform this photo into a beautiful ${style} wedding portrait. ${customPrompt}`,
      couple: `CRITICAL: Preserve BOTH people's facial identities exactly. Transform this photo into a beautiful ${style} wedding portrait. ${customPrompt}`,
      family: `CRITICAL: Preserve ALL family members' facial identities exactly. Transform this photo into a beautiful ${style} wedding portrait with ${familyMemberCount} family members. ${customPrompt}`
    };

    return Promise.resolve(templates[type] || templates.couple);
  }

  /**
   * Configure the service
   */
  configure(options) {
    if (options.useEnhancedByDefault !== undefined) {
      this.useEnhancedByDefault = options.useEnhancedByDefault;
    }
    
    if (options.promptBuilderOptions) {
      this.promptBuilder.configure(options.promptBuilderOptions);
    }
    
    return this;
  }
}

// Export singleton instance
export const enhancedPromptService = new EnhancedPromptService();
export { EnhancedPromptService };