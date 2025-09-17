/**
 * PromptBuilder Class
 * Core class for building and compiling prompt templates with advanced features
 */

import {
  EnhancedPromptTemplate,
  TemplateVariable,
  VariableContext,
  CompiledTemplate,
  ParsedTemplate,
  TemplateSegment,
  PromptModifier,
  CompilationMetadata,
  TemplateEngineConfig,
  TemplateEngineError,
  VariableError,
  CompilationError,
  ValidationError
} from './types';
import { themeManager } from './ThemeManager';
import { TemplateParser } from './TemplateParser';
import { VariableProcessor } from './VariableProcessor';
import { TemplateValidator } from './TemplateValidator';
import { TemplateCache } from './TemplateCache';

export class PromptBuilder {
  private parser: TemplateParser;
  private variableProcessor: VariableProcessor;
  private validator: TemplateValidator;
  private cache: TemplateCache;
  private config: TemplateEngineConfig;

  constructor(config?: Partial<TemplateEngineConfig>) {
    this.config = {
      enableCaching: true,
      cacheProvider: 'memory',
      validationLevel: 'normal',
      allowUnsafeVariables: false,
      maxTemplateSize: 10000,
      maxVariableCount: 50,
      enableDebugMode: false,
      ...config
    };

    this.parser = new TemplateParser(this.config);
    this.variableProcessor = new VariableProcessor(this.config);
    this.validator = new TemplateValidator(this.config);
    this.cache = new TemplateCache(this.config);
  }

  /**
   * Compile a template with given variables and context
   */
  async compile(
    template: EnhancedPromptTemplate,
    context: VariableContext,
    options?: {
      useCache?: boolean;
      validation?: boolean;
      styleVariation?: string;
    }
  ): Promise<CompiledTemplate> {
    const startTime = Date.now();
    const useCache = options?.useCache !== false && this.config.enableCaching;
    const enableValidation = options?.validation !== false;
    
    try {
      // Generate cache key
      const cacheKey = this.generateCacheKey(template, context, options);
      
      // Check cache first
      if (useCache) {
        const cached = await this.cache.get(cacheKey);
        if (cached) {
          return {
            ...cached,
            metadata: {
              ...cached.metadata,
              cacheHit: true
            }
          };
        }
      }

      // Validate template if enabled
      if (enableValidation) {
        const validationResult = await this.validator.validateTemplate(template);
        if (!validationResult.isValid) {
          throw new ValidationError(
            `Template validation failed: ${validationResult.errors.join(', ')}`,
            template.id
          );
        }
      }

      // Parse template
      const parsed = await this.parser.parse(template.template);
      
      // Process variables
      const processedVariables = await this.variableProcessor.processVariables(
        template.templateVariables,
        context
      );

      // Apply theme modifications
      let processedTemplate = template.template;
      if (context.style) {
        const styleModifiers = themeManager.getStyleModifiers(
          this.normalizeStyleId(context.style),
          options?.styleVariation
        );
        processedTemplate = themeManager.applyStyleModifiers(
          processedTemplate,
          styleModifiers
        );
      }

      // Compile template segments
      const compiledPrompt = await this.compileSegments(
        await this.parser.parse(processedTemplate),
        processedVariables,
        context
      );

      // Create compilation metadata
      const compilationTime = Date.now() - startTime;
      const metadata: CompilationMetadata = {
        templateId: template.id,
        version: template.version,
        variables: processedVariables,
        style: context.style,
        compiledAt: new Date(),
        compilationTime,
        cacheHit: false
      };

      const result: CompiledTemplate = {
        prompt: compiledPrompt.trim(),
        metadata,
        warnings: [],
        errors: []
      };

      // Cache result if enabled
      if (useCache) {
        await this.cache.set(cacheKey, result, template.advancedOptions.cacheSettings);
      }

      // Log compilation in debug mode
      if (this.config.enableDebugMode) {
        console.log('[PromptBuilder] Compilation completed:', {
          templateId: template.id,
          compilationTime,
          promptLength: result.prompt.length,
          variableCount: Object.keys(processedVariables).length
        });
      }

      return result;

    } catch (error) {
      const compilationTime = Date.now() - startTime;
      
      if (error instanceof TemplateEngineError) {
        throw error;
      }
      
      throw new CompilationError(
        `Template compilation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        template.id
      );
    }
  }

  /**
   * Compile template segments into final prompt
   */
  private async compileSegments(
    parsed: ParsedTemplate,
    variables: Record<string, any>,
    context: VariableContext
  ): Promise<string> {
    const compiledSegments: string[] = [];

    for (const segment of parsed.segments) {
      const compiledSegment = await this.compileSegment(segment, variables, context);
      if (compiledSegment) {
        compiledSegments.push(compiledSegment);
      }
    }

    return compiledSegments.join('');
  }

  /**
   * Compile individual template segment
   */
  private async compileSegment(
    segment: TemplateSegment,
    variables: Record<string, any>,
    context: VariableContext
  ): Promise<string> {
    switch (segment.type) {
      case 'text':
        return segment.content;

      case 'variable':
        return this.variableProcessor.substituteVariable(
          segment.variableId,
          variables,
          segment.formatting,
          segment.fallback
        );

      case 'conditional':
        const conditionMet = this.evaluateCondition(
          segment.condition,
          variables,
          context
        );
        
        const contentToCompile = conditionMet 
          ? segment.trueContent 
          : (segment.falseContent || []);
        
        const compiledContent: string[] = [];
        for (const contentSegment of contentToCompile) {
          const compiled = await this.compileSegment(contentSegment, variables, context);
          if (compiled) {
            compiledContent.push(compiled);
          }
        }
        return compiledContent.join('');

      case 'dynamic':
        return this.processDynamicSegment(segment, variables, context);

      default:
        throw new CompilationError(`Unknown segment type: ${(segment as any).type}`, '');
    }
  }

  /**
   * Evaluate conditional rule
   */
  private evaluateCondition(
    condition: any,
    variables: Record<string, any>,
    context: VariableContext
  ): boolean {
    const variableValue = variables[condition.variable] || context[condition.variable as keyof VariableContext];
    
    switch (condition.operator) {
      case 'equals':
        return variableValue === condition.value;
      case 'not_equals':
        return variableValue !== condition.value;
      case 'contains':
        return String(variableValue).includes(String(condition.value));
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(variableValue);
      case 'not_in':
        return Array.isArray(condition.value) && !condition.value.includes(variableValue);
      default:
        return false;
    }
  }

  /**
   * Process dynamic segment
   */
  private processDynamicSegment(
    segment: any,
    variables: Record<string, any>,
    context: VariableContext
  ): string {
    // Dynamic generators for common use cases
    const generators: Record<string, (params: any, vars: any, ctx: any) => string> = {
      'randomPhrase': (params) => {
        const phrases = params.phrases || [];
        return phrases[Math.floor(Math.random() * phrases.length)] || '';
      },
      
      'conditionalText': (params, vars, ctx) => {
        const conditions = params.conditions || [];
        for (const cond of conditions) {
          if (this.evaluateCondition(cond.condition, vars, ctx)) {
            return cond.text;
          }
        }
        return params.defaultText || '';
      },
      
      'styleSpecificText': (params, vars, ctx) => {
        const styleTexts = params.styleTexts || {};
        const normalizedStyle = this.normalizeStyleId(ctx.style);
        return styleTexts[normalizedStyle] || params.defaultText || '';
      },
      
      'numberToWord': (params, vars, ctx) => {
        const number = vars[params.variable] || params.defaultValue || 0;
        return this.numberToWord(number);
      }
    };

    const generator = generators[segment.generator];
    if (generator) {
      return generator(segment.parameters, variables, context);
    }

    return '';
  }

  /**
   * Generate cache key for template compilation
   */
  private generateCacheKey(
    template: EnhancedPromptTemplate,
    context: VariableContext,
    options?: any
  ): string {
    const keyData = {
      templateId: template.id,
      version: template.version,
      context: {
        style: context.style,
        customPrompt: context.customPrompt,
        familyMemberCount: context.familyMemberCount,
        photoType: context.photoType
      },
      options: options || {}
    };
    
    return `prompt_${this.hashObject(keyData)}`;
  }

  /**
   * Hash object for cache key generation
   */
  private hashObject(obj: any): string {
    const str = JSON.stringify(obj, Object.keys(obj).sort());
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Normalize style ID for consistent lookups
   */
  private normalizeStyleId(style: string): string {
    return style
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Convert number to word for better AI understanding
   */
  private numberToWord(num: number): string {
    const words = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
    return words[num] || num.toString();
  }

  /**
   * Validate template structure and variables
   */
  async validateTemplate(template: EnhancedPromptTemplate): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    return this.validator.validateTemplate(template);
  }

  /**
   * Get template complexity analysis
   */
  async analyzeComplexity(template: EnhancedPromptTemplate): Promise<{
    complexity: 'simple' | 'moderate' | 'complex';
    variableCount: number;
    conditionalCount: number;
    dynamicSegmentCount: number;
    estimatedCompilationTime: number;
  }> {
    const parsed = await this.parser.parse(template.template);
    
    const variableCount = parsed.variables.size;
    const conditionalCount = parsed.conditionals.length;
    const dynamicSegmentCount = parsed.segments.filter(s => s.type === 'dynamic').length;
    
    let complexity: 'simple' | 'moderate' | 'complex' = 'simple';
    if (variableCount > 10 || conditionalCount > 3 || dynamicSegmentCount > 2) {
      complexity = 'complex';
    } else if (variableCount > 5 || conditionalCount > 1 || dynamicSegmentCount > 0) {
      complexity = 'moderate';
    }
    
    // Rough estimation based on complexity
    const estimatedCompilationTime = {
      simple: 5,
      moderate: 15,
      complex: 30
    }[complexity];

    return {
      complexity,
      variableCount,
      conditionalCount,
      dynamicSegmentCount,
      estimatedCompilationTime
    };
  }

  /**
   * Get available template variables
   */
  getAvailableVariables(template: EnhancedPromptTemplate): TemplateVariable[] {
    return Object.values(template.templateVariables);
  }

  /**
   * Clear compilation cache
   */
  async clearCache(): Promise<void> {
    await this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    size: number;
    hitRate: number;
    totalRequests: number;
  }> {
    return this.cache.getStats();
  }

  /**
   * Export template as portable format
   */
  exportTemplate(template: EnhancedPromptTemplate): string {
    return JSON.stringify({
      ...template,
      exportedAt: new Date().toISOString(),
      engineVersion: '1.0.0'
    }, null, 2);
  }

  /**
   * Import template from portable format
   */
  importTemplate(templateData: string): EnhancedPromptTemplate {
    try {
      const parsed = JSON.parse(templateData);
      
      // Validate required fields
      const requiredFields = ['id', 'type', 'name', 'template'];
      for (const field of requiredFields) {
        if (!parsed[field]) {
          throw new Error(`Missing required field: ${field}`);
        }
      }
      
      // Set defaults for new fields if missing
      return {
        templateVariables: {},
        themeConfig: { supportedStyles: [], styleVariations: {}, defaultStyle: '', customThemes: [] },
        stylePresets: [],
        advancedOptions: {
          enableConditionals: false,
          enableDynamicVariables: false,
          enableStyleVariations: false,
          cacheSettings: { enabled: true, ttl: 3600, invalidateOnVariableChange: true },
          validationRules: []
        },
        lastModified: new Date(parsed.lastModified || Date.now()),
        ...parsed
      };
    } catch (error) {
      throw new ValidationError(
        `Invalid template format: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

// Export singleton instance with default configuration
export const promptBuilder = new PromptBuilder();
export default promptBuilder;