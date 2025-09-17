/**
 * Template Validator
 * Validates template structure, variables, and configurations
 */

import {
  EnhancedPromptTemplate,
  TemplateVariable,
  ValidationRule,
  TemplateEngineConfig,
  ValidationError
} from './types';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  score: number; // 0-100 quality score
}

export class TemplateValidator {
  private config: TemplateEngineConfig;

  constructor(config: TemplateEngineConfig) {
    this.config = config;
  }

  /**
   * Validate complete template
   */
  async validateTemplate(template: EnhancedPromptTemplate): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let score = 100;

    try {
      // Basic structure validation
      const structureResult = this.validateStructure(template);
      errors.push(...structureResult.errors);
      warnings.push(...structureResult.warnings);
      score -= structureResult.penaltyPoints;

      // Template content validation
      const contentResult = this.validateContent(template.template);
      errors.push(...contentResult.errors);
      warnings.push(...contentResult.warnings);
      score -= contentResult.penaltyPoints;

      // Variables validation
      const variablesResult = this.validateVariables(template.templateVariables);
      errors.push(...variablesResult.errors);
      warnings.push(...variablesResult.warnings);
      score -= variablesResult.penaltyPoints;

      // Theme configuration validation
      const themeResult = this.validateThemeConfig(template.themeConfig);
      errors.push(...themeResult.errors);
      warnings.push(...themeResult.warnings);
      score -= themeResult.penaltyPoints;

      // Advanced options validation
      const advancedResult = this.validateAdvancedOptions(template.advancedOptions);
      errors.push(...advancedResult.errors);
      warnings.push(...advancedResult.warnings);
      score -= advancedResult.penaltyPoints;

      // Cross-reference validation
      const crossRefResult = this.validateCrossReferences(template);
      errors.push(...crossRefResult.errors);
      warnings.push(...crossRefResult.warnings);
      score -= crossRefResult.penaltyPoints;

      // Custom validation rules
      if (template.advancedOptions.validationRules.length > 0) {
        const customResult = await this.validateCustomRules(template);
        errors.push(...customResult.errors);
        warnings.push(...customResult.warnings);
        score -= customResult.penaltyPoints;
      }

      // Ensure score doesn't go below 0
      score = Math.max(0, score);

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        score
      };

    } catch (error) {
      return {
        isValid: false,
        errors: [`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings,
        score: 0
      };
    }
  }

  /**
   * Validate basic template structure
   */
  private validateStructure(template: EnhancedPromptTemplate): {
    errors: string[];
    warnings: string[];
    penaltyPoints: number;
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    let penaltyPoints = 0;

    // Required fields
    if (!template.id || template.id.trim().length === 0) {
      errors.push('Template ID is required');
      penaltyPoints += 20;
    }

    if (!template.name || template.name.trim().length === 0) {
      errors.push('Template name is required');
      penaltyPoints += 15;
    }

    if (!template.template || template.template.trim().length === 0) {
      errors.push('Template content is required');
      penaltyPoints += 25;
    }

    if (!['single', 'couple', 'family'].includes(template.type)) {
      errors.push('Template type must be single, couple, or family');
      penaltyPoints += 20;
    }

    // ID format validation
    if (template.id && !/^[a-zA-Z0-9_-]+$/.test(template.id)) {
      warnings.push('Template ID should only contain letters, numbers, underscores, and hyphens');
      penaltyPoints += 5;
    }

    // Name length validation
    if (template.name && template.name.length > 100) {
      warnings.push('Template name is longer than recommended (100 characters)');
      penaltyPoints += 3;
    }

    // Version validation
    if (template.version < 1) {
      warnings.push('Template version should be 1 or higher');
      penaltyPoints += 2;
    }

    return { errors, warnings, penaltyPoints };
  }

  /**
   * Validate template content
   */
  private validateContent(template: string): {
    errors: string[];
    warnings: string[];
    penaltyPoints: number;
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    let penaltyPoints = 0;

    // Length validation
    if (template.length > this.config.maxTemplateSize) {
      errors.push(`Template exceeds maximum size of ${this.config.maxTemplateSize} characters`);
      penaltyPoints += 25;
    }

    if (template.length < 50) {
      warnings.push('Template is very short, consider adding more detailed instructions');
      penaltyPoints += 5;
    }

    // Variable syntax validation
    const variableMatches = template.match(/\{[^}]*\}/g) || [];
    const invalidVariables = variableMatches.filter(match => {
      const content = match.slice(1, -1).trim();
      return content.length === 0 || /[{}]/.test(content);
    });

    if (invalidVariables.length > 0) {
      errors.push(`Invalid variable syntax found: ${invalidVariables.join(', ')}`);
      penaltyPoints += 15;
    }

    // Bracket balance validation
    const openBrackets = (template.match(/\{/g) || []).length;
    const closeBrackets = (template.match(/\}/g) || []).length;
    
    if (openBrackets !== closeBrackets) {
      errors.push('Mismatched brackets in template');
      penaltyPoints += 20;
    }

    // Check for required variables
    const requiredVariables = ['style'];
    const templateVariables = this.extractVariableNames(template);
    
    for (const required of requiredVariables) {
      if (!templateVariables.includes(required)) {
        warnings.push(`Template missing recommended variable: {${required}}`);
        penaltyPoints += 5;
      }
    }

    // Check for potentially problematic content
    const problematicPatterns = [
      { pattern: /\b(unsafe|dangerous|harmful)\b/i, message: 'Template contains potentially problematic language' },
      { pattern: /\{[^}]*\{[^}]*\}/g, message: 'Nested brackets detected, may cause parsing issues' },
      { pattern: /\{\s*\}/g, message: 'Empty variable brackets found' }
    ];

    for (const { pattern, message } of problematicPatterns) {
      if (pattern.test(template)) {
        warnings.push(message);
        penaltyPoints += 3;
      }
    }

    return { errors, warnings, penaltyPoints };
  }

  /**
   * Validate template variables
   */
  private validateVariables(variables: Record<string, TemplateVariable>): {
    errors: string[];
    warnings: string[];
    penaltyPoints: number;
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    let penaltyPoints = 0;

    const variableCount = Object.keys(variables).length;
    
    if (variableCount > this.config.maxVariableCount) {
      errors.push(`Too many variables (${variableCount}), maximum allowed: ${this.config.maxVariableCount}`);
      penaltyPoints += 30;
    }

    for (const [variableId, variable] of Object.entries(variables)) {
      // Variable ID validation
      if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(variableId)) {
        errors.push(`Invalid variable ID '${variableId}': must start with letter and contain only letters, numbers, and underscores`);
        penaltyPoints += 10;
      }

      // Variable structure validation
      if (!variable.name || variable.name.trim().length === 0) {
        errors.push(`Variable '${variableId}' missing name`);
        penaltyPoints += 8;
      }

      if (!variable.type) {
        errors.push(`Variable '${variableId}' missing type`);
        penaltyPoints += 10;
      }

      // Type-specific validation
      if (variable.type === 'select' || variable.type === 'multiselect') {
        if (!variable.options || variable.options.length === 0) {
          errors.push(`Variable '${variableId}' of type ${variable.type} must have options`);
          penaltyPoints += 10;
        }
      }

      // Validation rules check
      if (variable.validation) {
        const validationResult = this.validateVariableValidation(variableId, variable.validation);
        errors.push(...validationResult.errors);
        warnings.push(...validationResult.warnings);
        penaltyPoints += validationResult.penaltyPoints;
      }

      // Dependencies validation
      if (variable.dependencies && variable.dependencies.length > 0) {
        for (const dependency of variable.dependencies) {
          if (!variables[dependency.variableId]) {
            errors.push(`Variable '${variableId}' depends on non-existent variable '${dependency.variableId}'`);
            penaltyPoints += 12;
          }
        }
      }
    }

    // Check for circular dependencies
    const circularDeps = this.detectCircularDependencies(variables);
    if (circularDeps.length > 0) {
      errors.push(`Circular dependencies detected: ${circularDeps.join(' -> ')}`);
      penaltyPoints += 25;
    }

    return { errors, warnings, penaltyPoints };
  }

  /**
   * Validate variable validation rules
   */
  private validateVariableValidation(variableId: string, validation: VariableValidation): {
    errors: string[];
    warnings: string[];
    penaltyPoints: number;
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    let penaltyPoints = 0;

    // Pattern validation
    if (validation.pattern) {
      try {
        new RegExp(validation.pattern);
      } catch (error) {
        errors.push(`Variable '${variableId}' has invalid regex pattern`);
        penaltyPoints += 8;
      }
    }

    // Range validation
    if (validation.min !== undefined && validation.max !== undefined) {
      if (validation.min > validation.max) {
        errors.push(`Variable '${variableId}' min value (${validation.min}) is greater than max value (${validation.max})`);
        penaltyPoints += 10;
      }
    }

    if (validation.minLength !== undefined && validation.maxLength !== undefined) {
      if (validation.minLength > validation.maxLength) {
        errors.push(`Variable '${variableId}' minLength (${validation.minLength}) is greater than maxLength (${validation.maxLength})`);
        penaltyPoints += 10;
      }
    }

    return { errors, warnings, penaltyPoints };
  }

  /**
   * Validate theme configuration
   */
  private validateThemeConfig(themeConfig: any): {
    errors: string[];
    warnings: string[];
    penaltyPoints: number;
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    let penaltyPoints = 0;

    if (!themeConfig) {
      warnings.push('No theme configuration provided');
      penaltyPoints += 2;
      return { errors, warnings, penaltyPoints };
    }

    // Supported styles validation
    if (!Array.isArray(themeConfig.supportedStyles)) {
      warnings.push('Theme configuration missing supported styles array');
      penaltyPoints += 3;
    }

    // Default style validation
    if (themeConfig.defaultStyle && themeConfig.supportedStyles) {
      if (!themeConfig.supportedStyles.includes(themeConfig.defaultStyle)) {
        warnings.push('Default style is not in supported styles list');
        penaltyPoints += 5;
      }
    }

    return { errors, warnings, penaltyPoints };
  }

  /**
   * Validate advanced options
   */
  private validateAdvancedOptions(advancedOptions: any): {
    errors: string[];
    warnings: string[];
    penaltyPoints: number;
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    let penaltyPoints = 0;

    if (!advancedOptions) {
      warnings.push('No advanced options provided, using defaults');
      penaltyPoints += 1;
      return { errors, warnings, penaltyPoints };
    }

    // Cache settings validation
    if (advancedOptions.cacheSettings) {
      const cache = advancedOptions.cacheSettings;
      
      if (cache.ttl && (cache.ttl < 60 || cache.ttl > 86400)) {
        warnings.push('Cache TTL should be between 60 seconds and 24 hours');
        penaltyPoints += 2;
      }
    }

    return { errors, warnings, penaltyPoints };
  }

  /**
   * Validate cross-references between template parts
   */
  private validateCrossReferences(template: EnhancedPromptTemplate): {
    errors: string[];
    warnings: string[];
    penaltyPoints: number;
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    let penaltyPoints = 0;

    // Extract variables used in template
    const usedVariables = this.extractVariableNames(template.template);
    const definedVariables = Object.keys(template.templateVariables);

    // Check for undefined variables
    for (const usedVar of usedVariables) {
      if (!definedVariables.includes(usedVar) && !this.isBuiltInVariable(usedVar)) {
        warnings.push(`Template uses undefined variable: {${usedVar}}`);
        penaltyPoints += 5;
      }
    }

    // Check for unused variables
    for (const definedVar of definedVariables) {
      if (!usedVariables.includes(definedVar)) {
        warnings.push(`Defined variable '${definedVar}' is not used in template`);
        penaltyPoints += 3;
      }
    }

    return { errors, warnings, penaltyPoints };
  }

  /**
   * Validate custom validation rules
   */
  private async validateCustomRules(template: EnhancedPromptTemplate): Promise<{
    errors: string[];
    warnings: string[];
    penaltyPoints: number;
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let penaltyPoints = 0;

    for (const rule of template.advancedOptions.validationRules) {
      try {
        const result = await this.executeCustomRule(rule, template);
        if (!result.passed) {
          if (rule.type === 'required_variables') {
            errors.push(rule.message || 'Required variables validation failed');
            penaltyPoints += 15;
          } else {
            warnings.push(rule.message || 'Custom validation warning');
            penaltyPoints += 5;
          }
        }
      } catch (error) {
        warnings.push(`Custom validation rule '${rule.id}' failed to execute`);
        penaltyPoints += 3;
      }
    }

    return { errors, warnings, penaltyPoints };
  }

  /**
   * Execute custom validation rule
   */
  private async executeCustomRule(rule: ValidationRule, template: EnhancedPromptTemplate): Promise<{
    passed: boolean;
    message?: string;
  }> {
    switch (rule.type) {
      case 'required_variables':
        const requiredVars = rule.rule.variables || [];
        const templateVars = this.extractVariableNames(template.template);
        
        for (const required of requiredVars) {
          if (!templateVars.includes(required)) {
            return { passed: false, message: `Required variable '${required}' not found` };
          }
        }
        return { passed: true };

      case 'variable_combination':
        // Check if certain variables are used together
        const combinations = rule.rule.combinations || [];
        for (const combo of combinations) {
          const hasAll = combo.variables.every((v: string) => 
            Object.keys(template.templateVariables).includes(v)
          );
          if (combo.required && !hasAll) {
            return { passed: false, message: `Required variable combination not met: ${combo.variables.join(', ')}` };
          }
        }
        return { passed: true };

      case 'template_structure':
        // Validate template structure rules
        const structureRules = rule.rule;
        const templateContent = template.template;
        
        if (structureRules.minLength && templateContent.length < structureRules.minLength) {
          return { passed: false, message: `Template too short (minimum ${structureRules.minLength} characters)` };
        }
        
        if (structureRules.maxLength && templateContent.length > structureRules.maxLength) {
          return { passed: false, message: `Template too long (maximum ${structureRules.maxLength} characters)` };
        }
        
        return { passed: true };

      case 'custom':
        // Execute custom validation function
        if (typeof rule.rule === 'function') {
          try {
            const result = await rule.rule(template);
            return { passed: Boolean(result) };
          } catch (error) {
            return { passed: false, message: 'Custom validation function failed' };
          }
        }
        return { passed: true };

      default:
        return { passed: true };
    }
  }

  /**
   * Extract variable names from template string
   */
  private extractVariableNames(template: string): string[] {
    const matches = template.match(/\{([^}]+)\}/g) || [];
    return matches.map(match => {
      const content = match.slice(1, -1).trim();
      // Handle formatted variables like {variable|format}
      const pipeIndex = content.indexOf('|');
      const colonIndex = content.indexOf(':');
      
      let variableName = content;
      if (pipeIndex > 0) {
        variableName = content.substring(0, pipeIndex);
      } else if (colonIndex > 0) {
        variableName = content.substring(0, colonIndex);
      }
      
      return variableName.trim();
    });
  }

  /**
   * Check if variable is a built-in system variable
   */
  private isBuiltInVariable(variableName: string): boolean {
    const builtInVariables = [
      'style',
      'customPrompt',
      'familyMemberCount',
      'photoType',
      'timestamp',
      'userId',
      'sessionId'
    ];
    
    return builtInVariables.includes(variableName);
  }

  /**
   * Detect circular dependencies in variables
   */
  private detectCircularDependencies(variables: Record<string, TemplateVariable>): string[] {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const path: string[] = [];

    const hasCycle = (variableId: string): boolean => {
      if (recursionStack.has(variableId)) {
        const cycleStart = path.indexOf(variableId);
        return path.slice(cycleStart).concat(variableId);
      }

      if (visited.has(variableId)) {
        return false;
      }

      visited.add(variableId);
      recursionStack.add(variableId);
      path.push(variableId);

      const variable = variables[variableId];
      if (variable && variable.dependencies) {
        for (const dependency of variable.dependencies) {
          const result = hasCycle(dependency.variableId);
          if (result) {
            return result;
          }
        }
      }

      recursionStack.delete(variableId);
      path.pop();
      return false;
    };

    for (const variableId of Object.keys(variables)) {
      if (!visited.has(variableId)) {
        const cycle = hasCycle(variableId);
        if (cycle) {
          return Array.isArray(cycle) ? cycle : [];
        }
      }
    }

    return [];
  }
}

export default TemplateValidator;