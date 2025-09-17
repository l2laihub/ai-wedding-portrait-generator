/**
 * Variable Processor
 * Handles variable substitution, validation, and formatting
 */

import {
  TemplateVariable,
  VariableContext,
  VariableFormatting,
  VariableValidation,
  TemplateEngineConfig,
  VariableError
} from './types';

export class VariableProcessor {
  private config: TemplateEngineConfig;

  constructor(config: TemplateEngineConfig) {
    this.config = config;
  }

  /**
   * Process all variables for template compilation
   */
  async processVariables(
    templateVariables: Record<string, TemplateVariable>,
    context: VariableContext
  ): Promise<Record<string, any>> {
    const processedVariables: Record<string, any> = {};
    
    // Start with context variables
    processedVariables.style = context.style;
    processedVariables.customPrompt = context.customPrompt || '';
    processedVariables.photoType = context.photoType;
    
    if (context.familyMemberCount !== undefined) {
      processedVariables.familyMemberCount = context.familyMemberCount;
    }

    // Add user preferences and session data if available
    if (context.userPreferences) {
      Object.assign(processedVariables, context.userPreferences);
    }
    
    if (context.sessionData) {
      Object.assign(processedVariables, context.sessionData);
    }

    // Process template-specific variables
    for (const [variableId, variable] of Object.entries(templateVariables)) {
      try {
        const value = await this.processVariable(variable, context, processedVariables);
        processedVariables[variableId] = value;
      } catch (error) {
        if (variable.required) {
          throw new VariableError(
            `Required variable '${variableId}' could not be processed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            variableId
          );
        }
        
        // Use default value for optional variables
        processedVariables[variableId] = variable.defaultValue;
      }
    }

    // Process dynamic variables if enabled
    if (this.config.enableDebugMode && context.dynamicVariables) {
      for (const [key, value] of Object.entries(context.dynamicVariables)) {
        if (!processedVariables.hasOwnProperty(key)) {
          processedVariables[key] = value;
        }
      }
    }

    return processedVariables;
  }

  /**
   * Process individual variable
   */
  private async processVariable(
    variable: TemplateVariable,
    context: VariableContext,
    existingVariables: Record<string, any>
  ): Promise<any> {
    let value: any;

    // Get value based on variable type
    switch (variable.type) {
      case 'text':
        value = this.getContextValue(variable.id, context) || variable.defaultValue || '';
        break;

      case 'number':
        value = this.getContextValue(variable.id, context) || variable.defaultValue || 0;
        if (typeof value === 'string') {
          value = parseInt(value, 10) || 0;
        }
        break;

      case 'boolean':
        value = this.getContextValue(variable.id, context);
        if (value === undefined) {
          value = variable.defaultValue || false;
        }
        value = Boolean(value);
        break;

      case 'select':
        value = this.getContextValue(variable.id, context) || variable.defaultValue;
        if (variable.options && !variable.options.some(opt => opt.value === value)) {
          value = variable.options[0]?.value || variable.defaultValue;
        }
        break;

      case 'multiselect':
        value = this.getContextValue(variable.id, context) || variable.defaultValue || [];
        if (!Array.isArray(value)) {
          value = [value];
        }
        break;

      case 'style':
        value = context.style || variable.defaultValue || '';
        break;

      case 'theme':
        value = this.getThemeValue(variable, context) || variable.defaultValue || '';
        break;

      case 'conditional':
        value = this.processConditionalVariable(variable, context, existingVariables);
        break;

      case 'dynamic':
        value = await this.processDynamicVariable(variable, context, existingVariables);
        break;

      default:
        value = variable.defaultValue;
    }

    // Validate value
    if (variable.validation) {
      const validationResult = this.validateValue(value, variable.validation);
      if (validationResult !== true) {
        throw new Error(validationResult);
      }
    }

    // Check dependencies
    if (variable.dependencies) {
      const dependencyResult = this.checkDependencies(variable.dependencies, existingVariables);
      if (!dependencyResult.satisfied) {
        if (dependencyResult.action === 'require' && !value) {
          throw new Error(`Variable '${variable.id}' is required based on dependencies`);
        }
      }
    }

    return value;
  }

  /**
   * Substitute variable in template with formatting
   */
  substituteVariable(
    variableId: string,
    variables: Record<string, any>,
    formatting?: VariableFormatting,
    fallback?: string
  ): string {
    let value = variables[variableId];
    
    if (value === undefined || value === null) {
      return fallback || '';
    }

    // Convert to string
    let stringValue = String(value);

    // Apply formatting if specified
    if (formatting) {
      stringValue = this.applyFormatting(stringValue, formatting);
    }

    return stringValue;
  }

  /**
   * Apply formatting to variable value
   */
  private applyFormatting(value: string, formatting: VariableFormatting): string {
    let formatted = value;

    // Apply text transformation
    if (formatting.transform) {
      switch (formatting.transform) {
        case 'uppercase':
          formatted = formatted.toUpperCase();
          break;
        case 'lowercase':
          formatted = formatted.toLowerCase();
          break;
        case 'capitalize':
          formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1).toLowerCase();
          break;
        case 'title_case':
          formatted = formatted.replace(/\w\S*/g, (txt) => 
            txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
          );
          break;
      }
    }

    // Apply prefix/suffix
    if (formatting.prefix) {
      formatted = formatting.prefix + formatted;
    }
    
    if (formatting.suffix) {
      formatted = formatted + formatting.suffix;
    }

    // Apply template formatting
    if (formatting.template) {
      formatted = formatting.template.replace('{value}', formatted);
    }

    return formatted;
  }

  /**
   * Get value from context
   */
  private getContextValue(variableId: string, context: VariableContext): any {
    // Check direct context properties
    if (context.hasOwnProperty(variableId as keyof VariableContext)) {
      return context[variableId as keyof VariableContext];
    }

    // Check user preferences
    if (context.userPreferences && context.userPreferences[variableId] !== undefined) {
      return context.userPreferences[variableId];
    }

    // Check session data
    if (context.sessionData && context.sessionData[variableId] !== undefined) {
      return context.sessionData[variableId];
    }

    // Check dynamic variables
    if (context.dynamicVariables && context.dynamicVariables[variableId] !== undefined) {
      return context.dynamicVariables[variableId];
    }

    return undefined;
  }

  /**
   * Get theme-specific value
   */
  private getThemeValue(variable: TemplateVariable, context: VariableContext): any {
    // Implementation would depend on theme manager integration
    // For now, return style as theme value
    return context.style;
  }

  /**
   * Process conditional variable
   */
  private processConditionalVariable(
    variable: TemplateVariable,
    context: VariableContext,
    existingVariables: Record<string, any>
  ): any {
    // Conditional variables are processed based on other variable values
    // This is a simplified implementation
    
    if (variable.dependencies && variable.dependencies.length > 0) {
      const dependency = variable.dependencies[0];
      const dependencyValue = existingVariables[dependency.variableId] || 
                            this.getContextValue(dependency.variableId, context);
      
      const conditionMet = this.evaluateCondition(
        dependencyValue,
        dependency.condition,
        dependency.value
      );
      
      if (conditionMet) {
        return variable.defaultValue;
      }
    }
    
    return undefined;
  }

  /**
   * Process dynamic variable
   */
  private async processDynamicVariable(
    variable: TemplateVariable,
    context: VariableContext,
    existingVariables: Record<string, any>
  ): Promise<any> {
    // Dynamic variables are computed at runtime
    // This could involve API calls, complex calculations, etc.
    
    // Example: Generate dynamic text based on style
    if (variable.id === 'dynamicStyleText') {
      const style = context.style || '';
      const styleTexts: Record<string, string> = {
        'Classic & Timeless Wedding': 'with timeless elegance',
        'Rustic Barn Wedding': 'with rustic charm',
        'Bohemian Beach Wedding': 'with free-spirited beauty',
        'Fairytale Castle Wedding': 'with magical enchantment'
      };
      
      return styleTexts[style] || 'with beautiful styling';
    }
    
    return variable.defaultValue;
  }

  /**
   * Validate variable value
   */
  private validateValue(value: any, validation: VariableValidation): true | string {
    // String length validation
    if (typeof value === 'string') {
      if (validation.minLength && value.length < validation.minLength) {
        return `Value must be at least ${validation.minLength} characters long`;
      }
      
      if (validation.maxLength && value.length > validation.maxLength) {
        return `Value must be no more than ${validation.maxLength} characters long`;
      }
      
      if (validation.pattern) {
        const regex = new RegExp(validation.pattern);
        if (!regex.test(value)) {
          return `Value does not match required pattern`;
        }
      }
    }

    // Number validation
    if (typeof value === 'number') {
      if (validation.min !== undefined && value < validation.min) {
        return `Value must be at least ${validation.min}`;
      }
      
      if (validation.max !== undefined && value > validation.max) {
        return `Value must be no more than ${validation.max}`;
      }
    }

    // Custom validation
    if (validation.custom) {
      try {
        const result = validation.custom(value);
        if (result !== true) {
          return typeof result === 'string' ? result : 'Custom validation failed';
        }
      } catch (error) {
        return `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    }

    return true;
  }

  /**
   * Check variable dependencies
   */
  private checkDependencies(
    dependencies: any[],
    variables: Record<string, any>
  ): { satisfied: boolean; action?: string } {
    for (const dependency of dependencies) {
      const variableValue = variables[dependency.variableId];
      const conditionMet = this.evaluateCondition(
        variableValue,
        dependency.condition,
        dependency.value
      );
      
      if (!conditionMet) {
        return {
          satisfied: false,
          action: dependency.action
        };
      }
    }
    
    return { satisfied: true };
  }

  /**
   * Evaluate condition for dependencies and conditionals
   */
  private evaluateCondition(value: any, condition: string, expectedValue: any): boolean {
    switch (condition) {
      case 'equals':
        return value === expectedValue;
      case 'not_equals':
        return value !== expectedValue;
      case 'contains':
        return String(value).includes(String(expectedValue));
      case 'greater_than':
        return Number(value) > Number(expectedValue);
      case 'less_than':
        return Number(value) < Number(expectedValue);
      default:
        return false;
    }
  }

  /**
   * Sanitize variable value for security
   */
  private sanitizeValue(value: any): any {
    if (!this.config.allowUnsafeVariables && typeof value === 'string') {
      // Remove potentially dangerous content
      return value
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '');
    }
    
    return value;
  }
}

export default VariableProcessor;