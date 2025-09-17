/**
 * Prompt Template Processor
 * Handles variable replacement and conditional sections for portrait templates
 */

export interface TemplateVariables {
  style: string;
  customPrompt?: string;
  familyMemberCount?: number;
}

export interface ProcessedTemplate {
  prompt: string;
  variables: TemplateVariables;
}

/**
 * Process a prompt template with variable replacement
 * Handles conditional ENHANCE sections to avoid empty sections
 */
export function processPromptTemplate(
  template: string,
  variables: TemplateVariables
): string {
  let processed = template;
  
  // Replace style variable
  processed = processed.replace(/{style}/g, variables.style);
  
  // Handle conditional enhance section
  const enhanceSection = variables.customPrompt?.trim() 
    ? `\n\nENHANCE: ${variables.customPrompt}` 
    : '';
  processed = processed.replace(/{enhanceSection}/g, enhanceSection);
  
  // Handle family member count (for family templates)
  if (variables.familyMemberCount !== undefined) {
    processed = processed.replace(
      /{familyMemberCount}/g, 
      variables.familyMemberCount.toString()
    );
  }
  
  return processed;
}

/**
 * Validate that a template has all required variables
 */
export function validateTemplate(template: string, type: 'single' | 'couple' | 'family'): {
  isValid: boolean;
  missingVariables: string[];
  warnings: string[];
} {
  const missingVariables: string[] = [];
  const warnings: string[] = [];
  
  // Check for required variables
  if (!template.includes('{style}')) {
    missingVariables.push('{style}');
  }
  
  // Check for enhance section (recommended but not required)
  if (!template.includes('{enhanceSection}') && template.includes('{customPrompt}')) {
    warnings.push('Template uses {customPrompt} instead of {enhanceSection}. Consider updating for cleaner output when custom prompt is empty.');
  }
  
  // Check family-specific variables
  if (type === 'family' && !template.includes('{familyMemberCount}')) {
    warnings.push('Family template should include {familyMemberCount} for better results.');
  }
  
  return {
    isValid: missingVariables.length === 0,
    missingVariables,
    warnings
  };
}

/**
 * Get default template for a portrait type
 */
export function getDefaultTemplate(type: 'single' | 'couple' | 'family'): string {
  switch (type) {
    case 'single':
      return `Edit this photo while preserving facial identity:

PRESERVE: Exact facial features, expressions, skin texture, and all identifying characteristics. The face must be photographically identical to the input.

TRANSFORM:
- Setting: {style} wedding environment with appropriate venue details
- Attire: Elegant wedding [dress/suit] that matches the {style} aesthetic
- Styling: Hair and accessories that complement the theme while preserving facial structure
- Lighting: Professional wedding photography lighting suitable for the setting{enhanceSection}

REQUIREMENTS: Maintain photographic realism, preserve complete facial identity, ensure wedding-appropriate styling.

Output: A professional wedding portrait with unchanged facial identity in the specified theme.`;

    case 'couple':
      return `Edit this photo while preserving all facial identities:

PRESERVE: Exact facial features, expressions, skin texture, and all identifying characteristics for BOTH individuals. Each face must be photographically identical to the input.

TRANSFORM:
- Setting: {style} wedding environment with romantic couple positioning
- Attire: Coordinated wedding attire (dress/suit) that matches the {style} aesthetic
- Positioning: Natural couple poses that showcase connection while maintaining individual identity
- Styling: Hair and accessories that complement the theme while preserving facial structures
- Lighting: Professional wedding photography lighting suitable for romantic couple portraits{enhanceSection}

REQUIREMENTS: Maintain photographic realism for both individuals, preserve complete facial identities, ensure wedding-appropriate styling, create romantic connection between subjects.

Output: A professional wedding portrait with unchanged facial identities showcasing the couple in the specified theme.`;

    case 'family':
      return `Edit this photo while preserving all family member identities:

PRESERVE: Exact facial features, expressions, skin texture, and all identifying characteristics for ALL {familyMemberCount} family members. Every face must be photographically identical to the input.

TRANSFORM:
- Setting: {style} wedding environment with family-appropriate positioning for {familyMemberCount} people
- Attire: Coordinated family wedding attire that matches the {style} aesthetic for all {familyMemberCount} members
- Positioning: Natural family arrangement that showcases relationships while maintaining individual identities for the group of {familyMemberCount}
- Styling: Hair and accessories for each of the {familyMemberCount} people that complement the theme while preserving facial structures
- Lighting: Professional wedding photography lighting suitable for {familyMemberCount}-person family group portraits
- Composition: Balanced family grouping appropriate for {familyMemberCount} members in the venue and theme{enhanceSection}

REQUIREMENTS: Maintain photographic realism for all {familyMemberCount} family members, preserve complete facial identities, ensure wedding-appropriate styling for all ages, create harmonious family composition with proper spacing for {familyMemberCount} people.

Output: A professional family wedding portrait with unchanged facial identities showcasing all {familyMemberCount} family members in the specified theme.`;

    default:
      throw new Error(`Unknown portrait type: ${type}`);
  }
}

/**
 * Migration helper to update old templates to new format
 */
export function migrateTemplate(oldTemplate: string): string {
  // Replace old {customPrompt} pattern with new conditional pattern
  if (oldTemplate.includes('ENHANCE: {customPrompt}')) {
    return oldTemplate.replace(
      /ENHANCE: {customPrompt}/g,
      '{enhanceSection}'
    );
  }
  
  return oldTemplate;
}

/**
 * Generate a preview of how the template will look with sample data
 */
export function generateTemplatePreview(
  template: string,
  type: 'single' | 'couple' | 'family'
): string {
  const sampleVariables: TemplateVariables = {
    style: 'Classic & Timeless Wedding',
    customPrompt: 'Make it romantic and elegant with soft lighting',
    familyMemberCount: type === 'family' ? 5 : undefined
  };
  
  return processPromptTemplate(template, sampleVariables);
}

export default {
  processPromptTemplate,
  validateTemplate,
  getDefaultTemplate,
  migrateTemplate,
  generateTemplatePreview
};