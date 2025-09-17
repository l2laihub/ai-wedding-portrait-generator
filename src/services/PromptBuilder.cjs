/**
 * PromptBuilder - Advanced Template Engine for Portrait Generation (CommonJS)
 * 
 * Handles template variable substitution, theme management, and prompt construction
 * with backward compatibility for existing admin Prompt Management system
 */

const { ThemeManager } = require('../config/themes.config.cjs');

class PromptBuilder {
  constructor() {
    this.templateVariables = new Map();
    this.validateParams = true;
    this.fallbackEnabled = true;
  }

  /**
   * Build complete prompt using template engine
   */
  buildPrompt({
    template,
    selectedTheme,
    portraitType = 'couple',
    userInput = '',
    familyMemberCount = 0,
    additionalVars = {}
  }) {
    try {
      // Validate required parameters
      if (!template) {
        throw new Error('Template is required');
      }

      // Resolve theme object from various input types
      const themeObj = this.resolveTheme(selectedTheme);
      
      // Build variable map
      const variables = this.buildVariableMap({
        themeObj,
        portraitType,
        userInput,
        familyMemberCount,
        additionalVars
      });

      // Process template with variables
      const processedPrompt = this.processTemplate(template, variables);

      // Apply post-processing and validation
      return this.postProcessPrompt(processedPrompt, themeObj, portraitType);

    } catch (error) {
      console.error('PromptBuilder error:', error);
      
      // Fallback to simple replacement for backward compatibility
      if (this.fallbackEnabled) {
        return this.fallbackPromptGeneration({
          template,
          selectedTheme,
          portraitType,
          userInput,
          familyMemberCount
        });
      }
      
      throw error;
    }
  }

  /**
   * Resolve theme object from various input formats
   */
  resolveTheme(themeInput) {
    if (!themeInput) {
      // Return random theme if none specified
      const randomThemes = ThemeManager.getRandomThemes(1);
      return randomThemes[0] || this.getDefaultTheme();
    }

    // If already a theme object
    if (typeof themeInput === 'object' && themeInput.id) {
      return themeInput;
    }

    // If theme name or ID string
    if (typeof themeInput === 'string') {
      // Try by ID first
      let theme = ThemeManager.getThemeById(themeInput);
      if (theme) return theme;

      // Try by name (legacy support)
      theme = ThemeManager.getThemeByName(themeInput);
      if (theme) return theme;

      // Try to find partial match
      theme = Object.values(ThemeManager.WEDDING_THEMES).find(t => 
        t.name.toLowerCase().includes(themeInput.toLowerCase()) ||
        themeInput.toLowerCase().includes(t.name.toLowerCase())
      );
      if (theme) return theme;
    }

    // Fallback to default theme
    console.warn('Theme not found, using default:', themeInput);
    return this.getDefaultTheme();
  }

  /**
   * Build comprehensive variable map for template substitution
   */
  buildVariableMap({
    themeObj,
    portraitType,
    userInput,
    familyMemberCount,
    additionalVars
  }) {
    const variables = new Map();

    // Core theme variables
    variables.set('theme', themeObj.name);
    variables.set('themeDescription', themeObj.themeDescription);
    variables.set('clothingDescription', themeObj.clothingDescription);
    variables.set('atmosphereDescription', themeObj.atmosphereDescription);

    // Portrait type variables
    variables.set('portraitType', this.getPortraitTypeText(portraitType));
    variables.set('portraitTypeRaw', portraitType);

    // User input handling
    variables.set('userInput', userInput || '');
    variables.set('customPrompt', userInput || ''); // Legacy compatibility

    // Family-specific variables
    if (portraitType === 'family') {
      variables.set('familyMemberCount', familyMemberCount.toString());
      variables.set('familyMemberText', this.getFamilyMemberText(familyMemberCount));
    }

    // Theme-specific variables
    variables.set('colors', themeObj.colors ? themeObj.colors.join(', ') : '');
    variables.set('props', themeObj.props ? themeObj.props.join(', ') : '');
    variables.set('lighting', themeObj.lighting || 'natural lighting');
    variables.set('mood', themeObj.mood || 'romantic');
    variables.set('category', themeObj.category || 'traditional');

    // Legacy style variable (for backward compatibility)
    variables.set('style', themeObj.name);

    // Pose suggestions
    if (themeObj.pose_suggestions && themeObj.pose_suggestions[portraitType]) {
      const poses = themeObj.pose_suggestions[portraitType];
      variables.set('poseSuggestions', poses.join(' or '));
    }

    // Face preservation instructions
    variables.set('facePreservationInstructions', this.getFacePreservationText(portraitType));

    // Conditional variables
    variables.set('hasUserInput', userInput ? 'true' : 'false');
    variables.set('isFamily', portraitType === 'family' ? 'true' : 'false');
    variables.set('isCouple', portraitType === 'couple' ? 'true' : 'false');
    variables.set('isSingle', portraitType === 'single' ? 'true' : 'false');

    // Additional custom variables
    Object.entries(additionalVars).forEach(([key, value]) => {
      variables.set(key, value);
    });

    return variables;
  }

  /**
   * Process template with advanced variable substitution
   */
  processTemplate(template, variables) {
    let processedTemplate = template;

    // Handle conditional blocks: {?variableName}content{/variableName}
    processedTemplate = this.processConditionalBlocks(processedTemplate, variables);

    // Handle enhanced variables: {userInput ? ENHANCE: {userInput} : ''}
    processedTemplate = this.processEnhancedConditionals(processedTemplate, variables);

    // Standard variable replacement: {variableName}
    variables.forEach((value, key) => {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      processedTemplate = processedTemplate.replace(regex, value);
    });

    // Clean up any remaining unmatched variables
    processedTemplate = this.cleanUnmatchedVariables(processedTemplate);

    return processedTemplate;
  }

  /**
   * Process conditional blocks in templates
   */
  processConditionalBlocks(template, variables) {
    const conditionalRegex = /\{\?(\w+)\}(.*?)\{\/\1\}/gs;
    
    return template.replace(conditionalRegex, (match, varName, content) => {
      const value = variables.get(varName);
      const shouldShow = value && value !== 'false' && value !== '0' && value.trim() !== '';
      return shouldShow ? content : '';
    });
  }

  /**
   * Process enhanced conditional expressions
   */
  processEnhancedConditionals(template, variables) {
    // Pattern: {variable ? trueContent : falseContent}
    const enhancedRegex = /\{(\w+)\s*\?\s*([^:}]+)\s*:\s*([^}]*)\}/g;
    
    return template.replace(enhancedRegex, (match, varName, trueContent, falseContent) => {
      const value = variables.get(varName);
      const hasValue = value && value !== 'false' && value !== '0' && value.trim() !== '';
      
      if (hasValue) {
        // Replace any {varName} in trueContent with actual value
        return trueContent.replace(new RegExp(`\\{${varName}\\}`, 'g'), value);
      } else {
        return falseContent || '';
      }
    });
  }

  /**
   * Clean up unmatched variables
   */
  cleanUnmatchedVariables(template) {
    // Remove any remaining {variableName} that weren't matched
    return template.replace(/\{\w+\}/g, '').replace(/\s+/g, ' ').trim();
  }

  /**
   * Post-process prompt for final formatting
   */
  postProcessPrompt(prompt, themeObj, portraitType) {
    // Ensure proper spacing
    let processed = prompt.replace(/\s+/g, ' ').trim();

    // Add theme-specific enhancements based on category
    processed = this.addCategorySpecificEnhancements(processed, themeObj, portraitType);

    // Ensure face preservation is emphasized
    processed = this.emphasizeFacePreservation(processed, portraitType);

    return processed;
  }

  /**
   * Add category-specific prompt enhancements
   */
  addCategorySpecificEnhancements(prompt, themeObj, portraitType) {
    const category = themeObj.category;
    const enhancements = [];

    switch (category) {
      case 'outdoor':
        enhancements.push('Ensure natural outdoor lighting and environmental elements are realistic.');
        break;
      case 'vintage':
        enhancements.push('Pay attention to period-accurate details and authentic vintage styling.');
        break;
      case 'fantasy':
        enhancements.push('Create magical elements while maintaining photorealistic quality.');
        break;
      case 'cultural':
        enhancements.push('Respect cultural traditions and authentic styling elements.');
        break;
    }

    if (enhancements.length > 0) {
      return `${prompt} ${enhancements.join(' ')}`;
    }

    return prompt;
  }

  /**
   * Emphasize face preservation in prompt
   */
  emphasizeFacePreservation(prompt, portraitType) {
    const preservationText = this.getFacePreservationText(portraitType);
    
    // If face preservation isn't already emphasized, add it
    if (!prompt.toLowerCase().includes('face') && !prompt.toLowerCase().includes('preserve')) {
      return `${preservationText} ${prompt}`;
    }
    
    return prompt;
  }

  /**
   * Get face preservation text based on portrait type
   */
  getFacePreservationText(portraitType) {
    switch (portraitType) {
      case 'single':
        return 'CRITICAL: Preserve the person\'s facial identity exactly - maintain all facial features, expressions, and complete likeness.';
      case 'couple':
        return 'CRITICAL: Preserve BOTH people\'s facial identities exactly - maintain all facial features, expressions, and complete likeness for both subjects.';
      case 'family':
        return 'CRITICAL: Preserve ALL family members\' facial identities exactly - maintain facial features, expressions, and complete likeness for every person in the photo.';
      default:
        return 'CRITICAL: Preserve facial identity exactly - maintain all facial features and expressions.';
    }
  }

  /**
   * Get portrait type descriptive text
   */
  getPortraitTypeText(portraitType) {
    switch (portraitType) {
      case 'single': return 'single person';
      case 'couple': return 'couple';
      case 'family': return 'family';
      default: return portraitType;
    }
  }

  /**
   * Get family member count as descriptive text
   */
  getFamilyMemberText(count) {
    if (count <= 1) return 'single person';
    if (count === 2) return 'couple';
    if (count <= 4) return 'small family';
    if (count <= 6) return 'family group';
    return 'large family';
  }

  /**
   * Get default theme for fallback scenarios
   */
  getDefaultTheme() {
    return ThemeManager.getThemeById('classic_timeless') || {
      id: 'default',
      name: 'Classic Wedding',
      themeDescription: 'A beautiful traditional wedding setting',
      clothingDescription: 'Elegant wedding attire',
      atmosphereDescription: 'Romantic and timeless atmosphere',
      category: 'traditional',
      mood: 'romantic'
    };
  }

  /**
   * Fallback prompt generation for backward compatibility
   */
  fallbackPromptGeneration({
    template,
    selectedTheme,
    portraitType,
    userInput,
    familyMemberCount
  }) {
    console.warn('Using fallback prompt generation');
    
    let prompt = template;
    
    // Simple variable replacement (legacy behavior)
    const themeName = typeof selectedTheme === 'object' ? selectedTheme.name : selectedTheme;
    prompt = prompt.replace(/\{style\}/g, themeName || 'Classic Wedding');
    prompt = prompt.replace(/\{customPrompt\}/g, userInput || '');
    
    if (portraitType === 'family') {
      prompt = prompt.replace(/\{familyMemberCount\}/g, familyMemberCount?.toString() || '');
    }
    
    return prompt;
  }

  /**
   * Set configuration options
   */
  configure(options = {}) {
    if (options.validateParams !== undefined) {
      this.validateParams = options.validateParams;
    }
    if (options.fallbackEnabled !== undefined) {
      this.fallbackEnabled = options.fallbackEnabled;
    }
    return this;
  }
}

// Export for CommonJS
module.exports = {
  PromptBuilder
};