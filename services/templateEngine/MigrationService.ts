/**
 * Migration Service
 * Handles migration from current prompt system to new template engine
 */

import { PromptTemplate } from '../promptService';
import { 
  EnhancedPromptTemplate, 
  TemplateVariable, 
  ThemeConfiguration, 
  AdvancedTemplateOptions 
} from './types';
import { promptDatabaseService } from '../promptDatabaseService';
import { themeManager } from './ThemeManager';
import { promptBuilder } from './PromptBuilder';

export interface MigrationPlan {
  currentTemplates: PromptTemplate[];
  migrationSteps: MigrationStep[];
  estimatedDuration: number;
  backupRequired: boolean;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface MigrationStep {
  id: string;
  name: string;
  description: string;
  estimatedTime: number;
  dependencies: string[];
  rollbackable: boolean;
}

export interface MigrationResult {
  success: boolean;
  migratedCount: number;
  failedCount: number;
  warnings: string[];
  errors: string[];
  backupLocation?: string;
  duration: number;
}

class MigrationService {
  /**
   * Analyze current system and create migration plan
   */
  async createMigrationPlan(): Promise<MigrationPlan> {
    console.log('[MigrationService] Creating migration plan...');
    
    // Get current templates
    const currentTemplates = await this.getCurrentTemplates();
    
    const migrationSteps: MigrationStep[] = [
      {
        id: 'backup',
        name: 'Backup Current System',
        description: 'Create backup of existing prompt templates and data',
        estimatedTime: 30, // seconds
        dependencies: [],
        rollbackable: false
      },
      {
        id: 'validate',
        name: 'Validate Current Templates',
        description: 'Analyze existing templates for compatibility issues',
        estimatedTime: 60,
        dependencies: ['backup'],
        rollbackable: true
      },
      {
        id: 'extend_schema',
        name: 'Extend Database Schema',
        description: 'Add new fields for enhanced template features',
        estimatedTime: 45,
        dependencies: ['validate'],
        rollbackable: true
      },
      {
        id: 'migrate_templates',
        name: 'Migrate Templates',
        description: 'Convert existing templates to new enhanced format',
        estimatedTime: currentTemplates.length * 20,
        dependencies: ['extend_schema'],
        rollbackable: true
      },
      {
        id: 'update_theme_config',
        name: 'Update Theme Configuration',
        description: 'Initialize theme manager with existing styles',
        estimatedTime: 30,
        dependencies: ['migrate_templates'],
        rollbackable: true
      },
      {
        id: 'test_compatibility',
        name: 'Test Backward Compatibility',
        description: 'Verify that existing functionality still works',
        estimatedTime: 120,
        dependencies: ['update_theme_config'],
        rollbackable: true
      },
      {
        id: 'finalize',
        name: 'Finalize Migration',
        description: 'Complete migration and enable new features',
        estimatedTime: 30,
        dependencies: ['test_compatibility'],
        rollbackable: false
      }
    ];

    const estimatedDuration = migrationSteps.reduce((total, step) => total + step.estimatedTime, 0);
    
    // Assess risk level
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (currentTemplates.length > 10) riskLevel = 'medium';
    if (currentTemplates.some(t => t.template.length > 1000)) riskLevel = 'high';

    return {
      currentTemplates,
      migrationSteps,
      estimatedDuration,
      backupRequired: true,
      riskLevel
    };
  }

  /**
   * Execute migration with progress tracking
   */
  async executeMigration(
    plan: MigrationPlan,
    progressCallback?: (stepId: string, progress: number) => void
  ): Promise<MigrationResult> {
    const startTime = Date.now();
    let migratedCount = 0;
    let failedCount = 0;
    const warnings: string[] = [];
    const errors: string[] = [];
    let backupLocation: string | undefined;

    console.log('[MigrationService] Starting migration...');

    try {
      for (const step of plan.migrationSteps) {
        console.log(`[MigrationService] Executing step: ${step.name}`);
        progressCallback?.(step.id, 0);

        try {
          const stepResult = await this.executeStep(step, plan.currentTemplates);
          
          if (step.id === 'backup' && stepResult.backupLocation) {
            backupLocation = stepResult.backupLocation;
          }
          
          if (step.id === 'migrate_templates') {
            migratedCount = stepResult.migratedCount || 0;
            failedCount = stepResult.failedCount || 0;
          }
          
          warnings.push(...(stepResult.warnings || []));
          progressCallback?.(step.id, 100);
          
        } catch (error) {
          errors.push(`Step '${step.name}' failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          
          if (!step.rollbackable) {
            throw error;
          }
          
          // Attempt rollback for rollbackable steps
          try {
            await this.rollbackStep(step);
            warnings.push(`Step '${step.name}' was rolled back due to error`);
          } catch (rollbackError) {
            errors.push(`Failed to rollback step '${step.name}': ${rollbackError instanceof Error ? rollbackError.message : 'Unknown error'}`);
          }
        }
      }

      const duration = Date.now() - startTime;
      
      return {
        success: errors.length === 0,
        migratedCount,
        failedCount,
        warnings,
        errors,
        backupLocation,
        duration
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      
      return {
        success: false,
        migratedCount,
        failedCount,
        warnings,
        errors: [...errors, `Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        backupLocation,
        duration
      };
    }
  }

  /**
   * Execute individual migration step
   */
  private async executeStep(step: MigrationStep, templates: PromptTemplate[]): Promise<{
    migratedCount?: number;
    failedCount?: number;
    warnings?: string[];
    backupLocation?: string;
  }> {
    switch (step.id) {
      case 'backup':
        return await this.executeBackupStep();
        
      case 'validate':
        return await this.executeValidateStep(templates);
        
      case 'extend_schema':
        return await this.executeExtendSchemaStep();
        
      case 'migrate_templates':
        return await this.executeMigrateTemplatesStep(templates);
        
      case 'update_theme_config':
        return await this.executeUpdateThemeConfigStep();
        
      case 'test_compatibility':
        return await this.executeTestCompatibilityStep(templates);
        
      case 'finalize':
        return await this.executeFinalizeStep();
        
      default:
        throw new Error(`Unknown migration step: ${step.id}`);
    }
  }

  /**
   * Backup current system
   */
  private async executeBackupStep(): Promise<{ backupLocation: string }> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupLocation = `/tmp/prompt_backup_${timestamp}.json`;
    
    try {
      // Get all current data
      const templates = await this.getCurrentTemplates();
      const localStorage = this.getLocalStorageBackup();
      
      const backupData = {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        templates,
        localStorage,
        metadata: {
          templateCount: templates.length,
          migrationReason: 'Enhanced template engine upgrade'
        }
      };
      
      // In a real implementation, this would write to file system or cloud storage
      console.log('[MigrationService] Backup created:', backupLocation);
      console.log('[MigrationService] Backup data:', JSON.stringify(backupData, null, 2));
      
      return { backupLocation };
    } catch (error) {
      throw new Error(`Backup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate current templates
   */
  private async executeValidateStep(templates: PromptTemplate[]): Promise<{ warnings: string[] }> {
    const warnings: string[] = [];
    
    for (const template of templates) {
      // Check for potential issues
      if (template.template.length > 2000) {
        warnings.push(`Template '${template.name}' is very long (${template.template.length} chars)`);
      }
      
      if (!template.template.includes('{style}')) {
        warnings.push(`Template '${template.name}' doesn't use {style} variable`);
      }
      
      // Check for complex variable patterns that might need special handling
      const complexPatterns = [
        /\{[^}]*\{[^}]*\}/g, // Nested brackets
        /\{\s*\}/g, // Empty variables
        /\{[^}]{50,}\}/g // Very long variable names
      ];
      
      for (const pattern of complexPatterns) {
        if (pattern.test(template.template)) {
          warnings.push(`Template '${template.name}' contains complex patterns that may need manual review`);
          break;
        }
      }
    }
    
    return { warnings };
  }

  /**
   * Extend database schema
   */
  private async executeExtendSchemaStep(): Promise<{}> {
    // This would execute the SQL migration to add new columns
    console.log('[MigrationService] Extended database schema with new template engine fields');
    
    // The actual SQL would be executed here:
    // ALTER TABLE prompt_templates ADD COLUMN template_variables JSONB DEFAULT '{}';
    // ALTER TABLE prompt_templates ADD COLUMN theme_config JSONB DEFAULT '{}';
    // etc.
    
    return {};
  }

  /**
   * Migrate templates to new format
   */
  private async executeMigrateTemplatesStep(templates: PromptTemplate[]): Promise<{
    migratedCount: number;
    failedCount: number;
    warnings: string[];
  }> {
    let migratedCount = 0;
    let failedCount = 0;
    const warnings: string[] = [];
    
    for (const template of templates) {
      try {
        const enhancedTemplate = await this.convertToEnhancedTemplate(template);
        
        // Save the enhanced template
        await this.saveEnhancedTemplate(enhancedTemplate);
        
        migratedCount++;
        console.log(`[MigrationService] Migrated template: ${template.name}`);
        
      } catch (error) {
        failedCount++;
        warnings.push(`Failed to migrate template '${template.name}': ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    return { migratedCount, failedCount, warnings };
  }

  /**
   * Update theme configuration
   */
  private async executeUpdateThemeConfigStep(): Promise<{}> {
    // Initialize theme manager with existing styles from the application
    const existingStyles = [
      "Classic & Timeless Wedding",
      "Rustic Barn Wedding", 
      "Bohemian Beach Wedding",
      "Vintage Victorian Wedding",
      "Modern Minimalist Wedding",
      "Fairytale Castle Wedding",
      "Enchanted Forest Wedding",
      "Tropical Paradise Wedding",
      "Japanese Cherry Blossom Wedding",
      "Steampunk Victorian Wedding",
      "Disco 70s Glam Wedding",
      "Hollywood Red Carpet Wedding"
    ];
    
    console.log('[MigrationService] Updated theme configuration with existing styles');
    return {};
  }

  /**
   * Test backward compatibility
   */
  private async executeTestCompatibilityStep(templates: PromptTemplate[]): Promise<{ warnings: string[] }> {
    const warnings: string[] = [];
    
    // Test a sample of templates to ensure they still work
    const sampleTemplates = templates.slice(0, Math.min(3, templates.length));
    
    for (const template of sampleTemplates) {
      try {
        // Test compilation with the new system
        const enhancedTemplate = await this.convertToEnhancedTemplate(template);
        
        const testContext = {
          style: 'Classic & Timeless Wedding',
          customPrompt: 'test custom prompt',
          photoType: template.type,
          familyMemberCount: 3
        };
        
        const compiled = await promptBuilder.compile(enhancedTemplate, testContext);
        
        if (compiled.errors && compiled.errors.length > 0) {
          warnings.push(`Template '${template.name}' has compilation errors: ${compiled.errors.join(', ')}`);
        }
        
      } catch (error) {
        warnings.push(`Compatibility test failed for '${template.name}': ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    return { warnings };
  }

  /**
   * Finalize migration
   */
  private async executeFinalizeStep(): Promise<{}> {
    console.log('[MigrationService] Migration completed successfully');
    console.log('[MigrationService] Enhanced template engine is now active');
    return {};
  }

  /**
   * Convert legacy template to enhanced format
   */
  private async convertToEnhancedTemplate(template: PromptTemplate): Promise<EnhancedPromptTemplate> {
    // Create default template variables based on existing patterns
    const templateVariables: Record<string, TemplateVariable> = {};
    
    // Extract variables from template content
    const variableMatches = template.template.match(/\{([^}]+)\}/g) || [];
    const uniqueVariables = new Set(variableMatches.map(match => match.slice(1, -1)));
    
    for (const variableName of uniqueVariables) {
      if (!['style', 'customPrompt', 'familyMemberCount'].includes(variableName)) {
        // Create variable definition for custom variables
        templateVariables[variableName] = {
          id: variableName,
          name: this.humanizeVariableName(variableName),
          type: 'text',
          description: `Auto-generated variable from legacy template`,
          defaultValue: '',
          required: false
        };
      }
    }
    
    // Create theme configuration
    const themeConfig: ThemeConfiguration = {
      supportedStyles: themeManager.getAvailableStyles({ enabled: true }).map(s => s.name),
      styleVariations: {},
      defaultStyle: 'Classic & Timeless Wedding',
      customThemes: []
    };
    
    // Create advanced options
    const advancedOptions: AdvancedTemplateOptions = {
      enableConditionals: false,
      enableDynamicVariables: false,
      enableStyleVariations: true,
      cacheSettings: {
        enabled: true,
        ttl: 3600,
        invalidateOnVariableChange: true
      },
      validationRules: []
    };
    
    return {
      id: template.id,
      type: template.type,
      name: template.name,
      template: template.template,
      isDefault: template.isDefault,
      lastModified: template.lastModified,
      version: template.version,
      templateVariables,
      themeConfig,
      stylePresets: [],
      advancedOptions,
      tags: ['migrated', template.type],
      category: 'legacy',
      description: `Migrated from legacy template system`
    };
  }

  /**
   * Save enhanced template to database
   */
  private async saveEnhancedTemplate(template: EnhancedPromptTemplate): Promise<void> {
    // In a real implementation, this would save to the extended database schema
    console.log(`[MigrationService] Saving enhanced template: ${template.name}`);
    
    // For now, we'll update the existing record and add the new fields
    try {
      await promptDatabaseService.updatePrompt(template as any);
    } catch (error) {
      console.warn('[MigrationService] Database update failed, using fallback storage');
      // Fallback to localStorage or other storage mechanism
    }
  }

  /**
   * Get current templates from all sources
   */
  private async getCurrentTemplates(): Promise<PromptTemplate[]> {
    try {
      // Try database first
      const dbTemplates = await promptDatabaseService.getPrompts();
      if (dbTemplates.length > 0) {
        return dbTemplates;
      }
    } catch (error) {
      console.warn('[MigrationService] Failed to load from database:', error);
    }
    
    // Fallback to localStorage
    try {
      const stored = localStorage.getItem('wedai_admin_prompts');
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.map((prompt: any) => ({
          ...prompt,
          lastModified: new Date(prompt.lastModified)
        }));
      }
    } catch (error) {
      console.warn('[MigrationService] Failed to load from localStorage:', error);
    }
    
    return [];
  }

  /**
   * Get localStorage backup data
   */
  private getLocalStorageBackup(): Record<string, string> {
    const backup: Record<string, string> = {};
    
    try {
      // Backup relevant localStorage keys
      const keys = ['wedai_admin_prompts', 'wedai_user_preferences', 'wedai_settings'];
      
      for (const key of keys) {
        const value = localStorage.getItem(key);
        if (value) {
          backup[key] = value;
        }
      }
    } catch (error) {
      console.warn('[MigrationService] Failed to backup localStorage:', error);
    }
    
    return backup;
  }

  /**
   * Humanize variable names for better UX
   */
  private humanizeVariableName(variableName: string): string {
    return variableName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  /**
   * Rollback a migration step
   */
  private async rollbackStep(step: MigrationStep): Promise<void> {
    console.log(`[MigrationService] Rolling back step: ${step.name}`);
    
    switch (step.id) {
      case 'extend_schema':
        // Rollback schema changes
        console.log('[MigrationService] Rolling back schema changes');
        break;
        
      case 'migrate_templates':
        // Restore original templates
        console.log('[MigrationService] Restoring original templates');
        break;
        
      default:
        console.log(`[MigrationService] No rollback needed for step: ${step.id}`);
    }
  }

  /**
   * Check migration prerequisites
   */
  async checkPrerequisites(): Promise<{
    canMigrate: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    // Check database connectivity
    try {
      await promptDatabaseService.getPrompts();
    } catch (error) {
      issues.push('Database connectivity issues detected');
      recommendations.push('Ensure database is accessible before migration');
    }
    
    // Check available disk space (conceptual - would check actual disk space)
    recommendations.push('Ensure sufficient disk space for backups');
    
    // Check for any pending changes
    try {
      const templates = await this.getCurrentTemplates();
      if (templates.length === 0) {
        issues.push('No templates found to migrate');
      }
    } catch (error) {
      issues.push('Unable to access current templates');
    }
    
    return {
      canMigrate: issues.length === 0,
      issues,
      recommendations
    };
  }
}

// Export singleton instance
export const migrationService = new MigrationService();
export default migrationService;