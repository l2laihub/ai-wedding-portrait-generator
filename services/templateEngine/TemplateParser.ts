/**
 * Template Parser
 * Parses template strings into structured segments for compilation
 */

import {
  ParsedTemplate,
  TemplateSegment,
  TextSegment,
  VariableSegment,
  ConditionalSegment,
  DynamicSegment,
  ConditionalBlock,
  ParseMetadata,
  TemplateEngineConfig,
  CompilationError
} from './types';

export class TemplateParser {
  private config: TemplateEngineConfig;

  constructor(config: TemplateEngineConfig) {
    this.config = config;
  }

  /**
   * Parse template string into structured segments
   */
  async parse(template: string): Promise<ParsedTemplate> {
    const startTime = Date.now();
    
    try {
      // Validate template size
      if (template.length > this.config.maxTemplateSize) {
        throw new CompilationError(
          `Template exceeds maximum size of ${this.config.maxTemplateSize} characters`,
          'template-size-exceeded'
        );
      }

      const segments: TemplateSegment[] = [];
      const variables = new Set<string>();
      const conditionals: ConditionalBlock[] = [];
      
      let position = 0;
      let segmentId = 0;

      while (position < template.length) {
        // Look for variable patterns: {variableName}
        const variableMatch = template.substring(position).match(/^\{([^}]+)\}/);
        
        // Look for conditional patterns: {{#if condition}}...{{/if}}
        const conditionalMatch = template.substring(position).match(/^\{\{#if\s+([^}]+)\}\}/);
        
        // Look for dynamic patterns: {{generator:params}}
        const dynamicMatch = template.substring(position).match(/^\{\{([^:]+):([^}]*)\}\}/);

        if (variableMatch) {
          // Process variable segment
          const variableId = variableMatch[1].trim();
          variables.add(variableId);
          
          const segment: VariableSegment = {
            type: 'variable',
            variableId,
            formatting: this.parseVariableFormatting(variableId),
            fallback: this.parseVariableFallback(variableId)
          };
          
          segments.push(segment);
          position += variableMatch[0].length;
          
        } else if (conditionalMatch && this.config.enableDebugMode) {
          // Process conditional segment (advanced feature)
          const { segment: conditionalSegment, endPosition } = await this.parseConditional(
            template,
            position,
            segmentId++
          );
          
          if (conditionalSegment) {
            segments.push(conditionalSegment);
            conditionals.push({
              id: `conditional_${segmentId}`,
              conditions: [conditionalSegment.condition],
              operator: 'and',
              content: conditionalSegment.trueContent
            });
          }
          
          position = endPosition;
          
        } else if (dynamicMatch && this.config.enableDebugMode) {
          // Process dynamic segment (advanced feature)
          const segment: DynamicSegment = {
            type: 'dynamic',
            generator: dynamicMatch[1].trim(),
            parameters: this.parseDynamicParameters(dynamicMatch[2])
          };
          
          segments.push(segment);
          position += dynamicMatch[0].length;
          
        } else {
          // Process text segment
          const nextSpecialChar = this.findNextSpecialPosition(template, position);
          const textContent = template.substring(position, nextSpecialChar);
          
          if (textContent.length > 0) {
            const segment: TextSegment = {
              type: 'text',
              content: textContent
            };
            segments.push(segment);
          }
          
          position = nextSpecialChar;
        }
      }

      // Validate variable count
      if (variables.size > this.config.maxVariableCount) {
        throw new CompilationError(
          `Template contains ${variables.size} variables, exceeding maximum of ${this.config.maxVariableCount}`,
          'variable-count-exceeded'
        );
      }

      const parseTime = Date.now() - startTime;
      const complexity = this.determineComplexity(segments, variables, conditionals);

      const metadata: ParseMetadata = {
        templateId: 'unknown',
        parseTime,
        complexity,
        warnings: []
      };

      return {
        segments,
        variables,
        conditionals,
        metadata
      };

    } catch (error) {
      if (error instanceof CompilationError) {
        throw error;
      }
      throw new CompilationError(
        `Template parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'parse-error'
      );
    }
  }

  /**
   * Parse conditional block
   */
  private async parseConditional(
    template: string,
    startPosition: number,
    segmentId: number
  ): Promise<{ segment: ConditionalSegment | null; endPosition: number }> {
    const conditionalPattern = /\{\{#if\s+([^}]+)\}\}(.*?)\{\{\/if\}\}/s;
    const conditionalWithElsePattern = /\{\{#if\s+([^}]+)\}\}(.*?)\{\{else\}\}(.*?)\{\{\/if\}\}/s;
    
    const remainingTemplate = template.substring(startPosition);
    
    // Try pattern with else first
    let match = remainingTemplate.match(conditionalWithElsePattern);
    let hasElse = true;
    
    if (!match) {
      // Try pattern without else
      match = remainingTemplate.match(conditionalPattern);
      hasElse = false;
    }
    
    if (!match) {
      return { segment: null, endPosition: startPosition + 1 };
    }

    const conditionStr = match[1].trim();
    const trueContent = match[2];
    const falseContent = hasElse ? match[3] : '';
    
    // Parse condition
    const condition = this.parseCondition(conditionStr);
    
    // Parse content segments
    const trueSegments = await this.parseContentSegments(trueContent);
    const falseSegments = falseContent.length > 0 
      ? await this.parseContentSegments(falseContent)
      : undefined;

    const segment: ConditionalSegment = {
      type: 'conditional',
      condition,
      trueContent: trueSegments,
      falseContent: falseSegments
    };

    return {
      segment,
      endPosition: startPosition + match[0].length
    };
  }

  /**
   * Parse content segments recursively
   */
  private async parseContentSegments(content: string): Promise<TemplateSegment[]> {
    if (!content.trim()) {
      return [];
    }
    
    const parsed = await this.parse(content);
    return parsed.segments;
  }

  /**
   * Parse condition string into structured condition
   */
  private parseCondition(conditionStr: string): any {
    // Simple condition parsing: variable operator value
    const parts = conditionStr.split(/\s+/);
    
    if (parts.length >= 3) {
      return {
        variable: parts[0],
        operator: parts[1],
        value: parts.slice(2).join(' ').replace(/['"]/g, '')
      };
    }
    
    // Default boolean condition
    return {
      variable: conditionStr,
      operator: 'equals',
      value: true
    };
  }

  /**
   * Parse dynamic parameters
   */
  private parseDynamicParameters(paramStr: string): Record<string, any> {
    if (!paramStr.trim()) {
      return {};
    }
    
    try {
      // Try to parse as JSON
      return JSON.parse(`{${paramStr}}`);
    } catch {
      // Fallback to simple key=value parsing
      const params: Record<string, any> = {};
      const pairs = paramStr.split(',');
      
      for (const pair of pairs) {
        const [key, ...valueParts] = pair.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim().replace(/['"]/g, '');
          params[key.trim()] = value;
        }
      }
      
      return params;
    }
  }

  /**
   * Parse variable formatting and options
   */
  private parseVariableFormatting(variableId: string): any {
    // Check for formatting options: {variable|format}
    const formatMatch = variableId.match(/^([^|]+)\|(.+)$/);
    
    if (formatMatch) {
      const actualVariableId = formatMatch[1];
      const formatOptions = formatMatch[2];
      
      return this.parseFormatOptions(formatOptions);
    }
    
    return undefined;
  }

  /**
   * Parse variable fallback value
   */
  private parseVariableFallback(variableId: string): string | undefined {
    // Check for fallback: {variable:fallback}
    const fallbackMatch = variableId.match(/^([^:]+):(.+)$/);
    
    if (fallbackMatch) {
      return fallbackMatch[2];
    }
    
    return undefined;
  }

  /**
   * Parse format options
   */
  private parseFormatOptions(formatStr: string): any {
    const options: any = {};
    const parts = formatStr.split('|');
    
    for (const part of parts) {
      const trimmed = part.trim();
      
      if (trimmed === 'uppercase') {
        options.transform = 'uppercase';
      } else if (trimmed === 'lowercase') {
        options.transform = 'lowercase';
      } else if (trimmed === 'capitalize') {
        options.transform = 'capitalize';
      } else if (trimmed.startsWith('prefix:')) {
        options.prefix = trimmed.substring(7);
      } else if (trimmed.startsWith('suffix:')) {
        options.suffix = trimmed.substring(7);
      }
    }
    
    return Object.keys(options).length > 0 ? options : undefined;
  }

  /**
   * Find next special character position
   */
  private findNextSpecialPosition(template: string, startPosition: number): number {
    const remaining = template.substring(startPosition);
    
    // Look for variable start
    const variableIndex = remaining.search(/\{[^}]*\}/);
    
    // Look for conditional start (if enabled)
    const conditionalIndex = this.config.enableDebugMode 
      ? remaining.search(/\{\{#if/)
      : -1;
    
    // Look for dynamic start (if enabled)
    const dynamicIndex = this.config.enableDebugMode 
      ? remaining.search(/\{\{[^#][^}]*:/)
      : -1;
    
    // Find the closest special character
    const indices = [variableIndex, conditionalIndex, dynamicIndex]
      .filter(index => index >= 0)
      .sort((a, b) => a - b);
    
    if (indices.length > 0) {
      return startPosition + indices[0];
    }
    
    return template.length;
  }

  /**
   * Determine template complexity
   */
  private determineComplexity(
    segments: TemplateSegment[],
    variables: Set<string>,
    conditionals: ConditionalBlock[]
  ): 'simple' | 'moderate' | 'complex' {
    const variableCount = variables.size;
    const conditionalCount = conditionals.length;
    const dynamicCount = segments.filter(s => s.type === 'dynamic').length;
    
    if (variableCount > 10 || conditionalCount > 3 || dynamicCount > 2) {
      return 'complex';
    } else if (variableCount > 5 || conditionalCount > 1 || dynamicCount > 0) {
      return 'moderate';
    }
    
    return 'simple';
  }
}

export default TemplateParser;