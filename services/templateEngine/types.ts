/**
 * Template Engine Types
 * Core interfaces and types for the prompt template engine
 */

// Base template variable types
export type VariableType = 
  | 'text' 
  | 'number' 
  | 'select' 
  | 'multiselect' 
  | 'boolean' 
  | 'style' 
  | 'theme' 
  | 'conditional'
  | 'dynamic';

// Variable definition interface
export interface TemplateVariable {
  id: string;
  name: string;
  type: VariableType;
  description?: string;
  defaultValue?: any;
  required?: boolean;
  validation?: VariableValidation;
  options?: VariableOption[];
  dependencies?: VariableDependency[];
  formatting?: VariableFormatting;
}

// Variable validation rules
export interface VariableValidation {
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  min?: number;
  max?: number;
  custom?: (value: any) => boolean | string;
}

// Variable options for select/multiselect
export interface VariableOption {
  value: string;
  label: string;
  description?: string;
  metadata?: Record<string, any>;
}

// Variable dependencies for conditional logic
export interface VariableDependency {
  variableId: string;
  condition: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
  value: any;
  action: 'show' | 'hide' | 'enable' | 'disable' | 'require';
}

// Variable formatting options
export interface VariableFormatting {
  transform?: 'uppercase' | 'lowercase' | 'capitalize' | 'title_case';
  prefix?: string;
  suffix?: string;
  template?: string;
}

// Extended prompt template interface
export interface EnhancedPromptTemplate {
  id: string;
  type: 'single' | 'couple' | 'family';
  name: string;
  template: string;
  isDefault: boolean;
  lastModified: Date;
  version: number;
  
  // New template engine fields
  templateVariables: Record<string, TemplateVariable>;
  themeConfig: ThemeConfiguration;
  stylePresets: StylePreset[];
  advancedOptions: AdvancedTemplateOptions;
  
  // Metadata
  tags?: string[];
  category?: string;
  author?: string;
  description?: string;
}

// Theme configuration
export interface ThemeConfiguration {
  supportedStyles: string[];
  styleVariations: Record<string, StyleVariation>;
  defaultStyle: string;
  customThemes: CustomTheme[];
}

// Style variation for theme customization
export interface StyleVariation {
  name: string;
  description: string;
  modifiers: PromptModifier[];
  assets?: ThemeAsset[];
}

// Custom theme definition
export interface CustomTheme {
  id: string;
  name: string;
  description: string;
  baseStyle: string;
  overrides: PromptModifier[];
  variables: Record<string, any>;
}

// Prompt modifiers for style variations
export interface PromptModifier {
  type: 'prepend' | 'append' | 'replace' | 'inject';
  target?: string; // For replace/inject operations
  content: string;
  conditional?: ConditionalRule;
}

// Conditional rule for dynamic content
export interface ConditionalRule {
  variable: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'in' | 'not_in';
  value: any;
}

// Theme assets (images, styles, etc.)
export interface ThemeAsset {
  id: string;
  type: 'image' | 'style' | 'template' | 'config';
  url: string;
  metadata: Record<string, any>;
}

// Style presets for quick selection
export interface StylePreset {
  id: string;
  name: string;
  description: string;
  style: string;
  variables: Record<string, any>;
  preview?: string;
}

// Advanced template options
export interface AdvancedTemplateOptions {
  enableConditionals: boolean;
  enableDynamicVariables: boolean;
  enableStyleVariations: boolean;
  cacheSettings: CacheSettings;
  validationRules: ValidationRule[];
}

// Cache settings for template compilation
export interface CacheSettings {
  enabled: boolean;
  ttl: number; // Time to live in seconds
  invalidateOnVariableChange: boolean;
}

// Template validation rules
export interface ValidationRule {
  id: string;
  type: 'required_variables' | 'variable_combination' | 'template_structure' | 'custom';
  rule: any;
  message: string;
}

// Template compilation result
export interface CompiledTemplate {
  prompt: string;
  metadata: CompilationMetadata;
  warnings?: string[];
  errors?: string[];
}

// Compilation metadata
export interface CompilationMetadata {
  templateId: string;
  version: number;
  variables: Record<string, any>;
  style: string;
  compiledAt: Date;
  compilationTime: number; // milliseconds
  cacheHit: boolean;
}

// Variable context for template compilation
export interface VariableContext {
  style: string;
  customPrompt: string;
  familyMemberCount?: number;
  photoType: 'single' | 'couple' | 'family';
  
  // Extended context variables
  userPreferences?: Record<string, any>;
  sessionData?: Record<string, any>;
  dynamicVariables?: Record<string, any>;
}

// Template engine configuration
export interface TemplateEngineConfig {
  enableCaching: boolean;
  cacheProvider: 'memory' | 'redis' | 'database';
  validationLevel: 'strict' | 'normal' | 'permissive';
  allowUnsafeVariables: boolean;
  maxTemplateSize: number;
  maxVariableCount: number;
  enableDebugMode: boolean;
}

// Template parsing result
export interface ParsedTemplate {
  segments: TemplateSegment[];
  variables: Set<string>;
  conditionals: ConditionalBlock[];
  metadata: ParseMetadata;
}

// Template segment types
export type TemplateSegment = 
  | TextSegment 
  | VariableSegment 
  | ConditionalSegment 
  | DynamicSegment;

export interface TextSegment {
  type: 'text';
  content: string;
}

export interface VariableSegment {
  type: 'variable';
  variableId: string;
  formatting?: VariableFormatting;
  fallback?: string;
}

export interface ConditionalSegment {
  type: 'conditional';
  condition: ConditionalRule;
  trueContent: TemplateSegment[];
  falseContent?: TemplateSegment[];
}

export interface DynamicSegment {
  type: 'dynamic';
  generator: string; // Function name or identifier
  parameters: Record<string, any>;
}

// Conditional block for complex logic
export interface ConditionalBlock {
  id: string;
  conditions: ConditionalRule[];
  operator: 'and' | 'or';
  content: TemplateSegment[];
}

// Parse metadata
export interface ParseMetadata {
  templateId: string;
  parseTime: number;
  complexity: 'simple' | 'moderate' | 'complex';
  warnings: string[];
}

// Error types for template engine
export class TemplateEngineError extends Error {
  constructor(
    message: string,
    public code: string,
    public templateId?: string,
    public variableId?: string
  ) {
    super(message);
    this.name = 'TemplateEngineError';
  }
}

export class VariableError extends TemplateEngineError {
  constructor(message: string, variableId: string, templateId?: string) {
    super(message, 'VARIABLE_ERROR', templateId, variableId);
    this.name = 'VariableError';
  }
}

export class CompilationError extends TemplateEngineError {
  constructor(message: string, templateId: string) {
    super(message, 'COMPILATION_ERROR', templateId);
    this.name = 'CompilationError';
  }
}

export class ValidationError extends TemplateEngineError {
  constructor(message: string, templateId?: string) {
    super(message, 'VALIDATION_ERROR', templateId);
    this.name = 'ValidationError';
  }
}