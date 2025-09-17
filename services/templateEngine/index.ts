/**
 * Template Engine Index
 * Main entry point for the enhanced prompt template engine
 */

// Core engine exports
export { PromptBuilder, promptBuilder } from './PromptBuilder';
export { ThemeManager, themeManager } from './ThemeManager';
export { TemplateParser } from './TemplateParser';
export { VariableProcessor } from './VariableProcessor';
export { TemplateValidator } from './TemplateValidator';
export { TemplateCache } from './TemplateCache';
export { MigrationService, migrationService } from './MigrationService';

// Type exports
export type {
  // Core types
  EnhancedPromptTemplate,
  TemplateVariable,
  VariableContext,
  CompiledTemplate,
  TemplateEngineConfig,
  
  // Variable types
  VariableType,
  VariableValidation,
  VariableOption,
  VariableDependency,
  VariableFormatting,
  
  // Theme types
  ThemeConfiguration,
  StyleVariation,
  CustomTheme,
  ThemeAsset,
  PromptModifier,
  StylePreset,
  
  // Template structure types
  ParsedTemplate,
  TemplateSegment,
  TextSegment,
  VariableSegment,
  ConditionalSegment,
  DynamicSegment,
  
  // Migration types
  MigrationPlan,
  MigrationStep,
  MigrationResult,
  
  // Error types
  TemplateEngineError,
  VariableError,
  CompilationError,
  ValidationError
} from './types';

// Wedding style types from ThemeManager
export type { WeddingStyle, StyleCategory } from './ThemeManager';

// Validation types
export type { ValidationResult } from './TemplateValidator';

/**
 * Enhanced Prompt Service
 * Integrates the new template engine with the existing prompt service
 */
import { PromptTemplate } from '../promptService';
import { promptBuilder } from './PromptBuilder';
import { themeManager } from './ThemeManager';
import { migrationService } from './MigrationService';
import {
  EnhancedPromptTemplate,
  VariableContext,
  CompiledTemplate,
  TemplateEngineConfig
} from './types';

class EnhancedPromptService {
  private config: TemplateEngineConfig;
  private migrationCompleted: boolean = false;

  constructor(config?: Partial<TemplateEngineConfig>) {
    this.config = {
      enableCaching: true,
      cacheProvider: 'memory',
      validationLevel: 'normal',
      allowUnsafeVariables: false,
      maxTemplateSize: 10000,
      maxVariableCount: 50,
      enableDebugMode: process.env.NODE_ENV === 'development',
      ...config
    };
  }

  /**
   * Initialize the enhanced prompt service
   */
  async initialize(): Promise<void> {
    console.log('[EnhancedPromptService] Initializing...');
    
    try {
      // Check if migration is needed
      const migrationNeeded = await this.checkMigrationNeeded();
      
      if (migrationNeeded) {
        console.log('[EnhancedPromptService] Migration required, running automatic migration...');
        await this.runMigration();
      }
      
      this.migrationCompleted = true;
      console.log('[EnhancedPromptService] Initialization complete');
    } catch (error) {
      console.error('[EnhancedPromptService] Initialization failed:', error);
      // Continue with legacy mode
      this.migrationCompleted = false;
    }
  }

  /**
   * Generate prompt using enhanced template engine
   */
  async generateEnhancedPrompt(
    templateId: string,
    context: VariableContext,
    options?: {
      useCache?: boolean;
      validation?: boolean;
      styleVariation?: string;
    }
  ): Promise<CompiledTemplate> {
    // If migration not completed, fall back to legacy method
    if (!this.migrationCompleted) {
      return this.generateLegacyPrompt(templateId, context);
    }

    try {
      // Get enhanced template
      const template = await this.getEnhancedTemplate(templateId, context.photoType);
      
      if (!template) {
        throw new Error(`Enhanced template not found: ${templateId}`);
      }

      // Compile using enhanced engine
      return await promptBuilder.compile(template, context, options);
    } catch (error) {
      console.warn('[EnhancedPromptService] Enhanced generation failed, falling back to legacy:', error);
      return this.generateLegacyPrompt(templateId, context);
    }
  }

  /**
   * Get available wedding styles with enhanced metadata
   */
  getEnhancedStyles(options?: {
    category?: string;
    featured?: boolean;
    premiumOnly?: boolean;
  }): Array<{
    id: string;
    name: string;
    description: string;
    category: string;
    tags: string[];
    popularity: number;
    featured: boolean;
    premiumOnly?: boolean;
    previewImage?: string;
  }> {
    const styles = themeManager.getAvailableStyles({
      category: options?.category as any,
      featured: options?.featured,
      premiumOnly: options?.premiumOnly
    });

    return styles.map(style => ({
      id: style.id,
      name: style.name,
      description: style.description,
      category: style.category,
      tags: style.tags,
      popularity: style.popularity,
      featured: style.featured,
      premiumOnly: style.premiumOnly,
      previewImage: style.previewImage
    }));
  }

  /**
   * Get style recommendations based on user preferences
   */
  getStyleRecommendations(
    preferences: {
      mood?: string[];
      setting?: string;
      category?: string;
      tags?: string[];
    },
    count: number = 5
  ): Array<{
    id: string;
    name: string;
    description: string;
    score: number;
  }> {
    const recommendations = themeManager.getStyleRecommendations(preferences, count);
    
    return recommendations.map(style => ({
      id: style.id,
      name: style.name,
      description: style.description,
      score: style.popularity // Simplified score for now
    }));
  }

  /**
   * Get random wedding styles for generation
   */
  getRandomStyles(
    count: number = 3,
    options?: {
      excludeIds?: string[];
      favorFeatured?: boolean;
    }
  ): string[] {
    const styles = themeManager.getRandomStyles(count, {
      ...options,
      onlyEnabled: true
    });
    
    return styles.map(style => style.name);
  }

  /**
   * Validate template compatibility
   */
  async validateTemplate(template: TemplateTemplate | EnhancedPromptTemplate): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    canMigrate: boolean;
  }> {
    try {
      if (this.isEnhancedTemplate(template)) {
        const result = await promptBuilder.validateTemplate(template);
        return {
          ...result,
          canMigrate: true
        };
      } else {
        // Basic validation for legacy templates
        const errors: string[] = [];
        const warnings: string[] = [];
        
        if (!template.template || template.template.trim().length === 0) {
          errors.push('Template content is empty');
        }
        
        if (template.template.length > 5000) {
          warnings.push('Template is very long and may benefit from optimization');
        }
        
        return {
          isValid: errors.length === 0,
          errors,
          warnings,
          canMigrate: true
        };
      }
    } catch (error) {
      return {
        isValid: false,
        errors: [`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: [],
        canMigrate: false
      };
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    size: number;
    hitRate: number;
    totalRequests: number;
    memoryUsage: number;
  }> {
    return await promptBuilder.getCacheStats();
  }

  /**
   * Clear template cache
   */
  async clearCache(): Promise<void> {
    await promptBuilder.clearCache();
  }

  /**
   * Check if migration is needed
   */
  private async checkMigrationNeeded(): Promise<boolean> {
    try {
      const prerequisites = await migrationService.checkPrerequisites();
      return prerequisites.canMigrate && prerequisites.issues.length === 0;
    } catch (error) {
      console.warn('[EnhancedPromptService] Migration check failed:', error);
      return false;
    }
  }

  /**
   * Run automatic migration
   */
  private async runMigration(): Promise<void> {
    try {
      const plan = await migrationService.createMigrationPlan();
      
      // Only run migration if it's low risk and has few templates
      if (plan.riskLevel === 'low' && plan.currentTemplates.length <= 10) {
        const result = await migrationService.executeMigration(plan);
        
        if (!result.success) {
          throw new Error(`Migration failed: ${result.errors.join(', ')}`);
        }
        
        console.log('[EnhancedPromptService] Migration completed successfully');
      } else {
        console.log('[EnhancedPromptService] Migration skipped due to risk/complexity');
        throw new Error('Migration requires manual intervention');
      }
    } catch (error) {
      console.error('[EnhancedPromptService] Migration failed:', error);
      throw error;
    }
  }

  /**
   * Generate prompt using legacy method
   */
  private async generateLegacyPrompt(
    templateId: string,
    context: VariableContext
  ): Promise<CompiledTemplate> {
    // Import legacy prompt service
    const { promptService } = await import('../promptService');
    
    try {
      const prompt = await promptService.generatePrompt(
        context.photoType,
        context.style,
        context.customPrompt,
        context.familyMemberCount
      );
      
      return {
        prompt,
        metadata: {
          templateId,
          version: 1,
          variables: {
            style: context.style,
            customPrompt: context.customPrompt,
            familyMemberCount: context.familyMemberCount
          },
          style: context.style,
          compiledAt: new Date(),
          compilationTime: 0,
          cacheHit: false
        },
        warnings: ['Using legacy prompt generation'],
        errors: []
      };
    } catch (error) {
      throw new Error(`Legacy prompt generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get enhanced template
   */
  private async getEnhancedTemplate(
    templateId: string,
    photoType: 'single' | 'couple' | 'family'
  ): Promise<EnhancedPromptTemplate | null> {
    // In a real implementation, this would query the enhanced template database
    // For now, return null to indicate template not found
    return null;
  }

  /**
   * Check if template is enhanced format
   */
  private isEnhancedTemplate(template: any): template is EnhancedPromptTemplate {
    return template && 
           typeof template === 'object' &&
           'templateVariables' in template &&
           'themeConfig' in template &&
           'advancedOptions' in template;
  }
}

// Create singleton instance
export const enhancedPromptService = new EnhancedPromptService();

// Export configuration helper
export const createTemplateEngineConfig = (overrides?: Partial<TemplateEngineConfig>): TemplateEngineConfig => {
  return {
    enableCaching: true,
    cacheProvider: 'memory',
    validationLevel: 'normal',
    allowUnsafeVariables: false,
    maxTemplateSize: 10000,
    maxVariableCount: 50,
    enableDebugMode: process.env.NODE_ENV === 'development',
    ...overrides
  };
};

// Export backward compatibility helper
export const createLegacyPromptAdapter = () => {
  return {
    async generatePrompt(
      type: 'single' | 'couple' | 'family',
      style: string,
      customPrompt: string = '',
      familyMemberCount: number = 3
    ): Promise<string> {
      const context: VariableContext = {
        photoType: type,
        style,
        customPrompt,
        familyMemberCount
      };
      
      const result = await enhancedPromptService.generateEnhancedPrompt(
        `${type}_default`,
        context
      );
      
      return result.prompt;
    }
  };
};

// Export default instance
export default enhancedPromptService;