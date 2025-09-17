/**
 * Prompt Service
 * Manages AI prompt templates for different portrait types
 * Now supports both localStorage and database storage
 */

import { promptDatabaseService } from './promptDatabaseService';

export interface PromptTemplate {
  id: string;
  type: 'single' | 'couple' | 'family';
  name: string;
  template: string;
  isDefault: boolean;
  lastModified: Date;
  version: number;
}

class PromptService {
  private readonly STORAGE_KEY = 'wedai_admin_prompts';
  private promptsCache: PromptTemplate[] | null = null;
  
  private defaultPrompts: Record<string, PromptTemplate> = {
    single: {
      id: 'single_default',
      type: 'single',
      name: 'Single Person Default',
      template: `Transform the SINGLE PERSON in this image into a FULL BODY wedding portrait with a "{style}" theme. This is a SINGLE PERSON portrait - NOT a couple. Create a professional bridal/groom portrait showing them ALONE. Keep their face EXACTLY identical to the original - preserve ALL facial features, expressions, and complete likeness. Show the complete wedding outfit from head to toe, including dress/suit details, shoes, and accessories. {customPrompt}. Ensure their face remains perfectly consistent and unchanged from the original photo while creating a stunning full-length INDIVIDUAL portrait.`,
      isDefault: true,
      lastModified: new Date(),
      version: 1
    },
    couple: {
      id: 'couple_default',
      type: 'couple',
      name: 'Couple Default',
      template: `Transform the TWO PEOPLE (couple) in this image into a beautiful wedding portrait with a "{style}" theme. This is a COUPLE portrait - there should be TWO people in the result. Keep BOTH their faces EXACTLY identical to the original - preserve their facial features, expressions, and likeness completely. Maintain BOTH subjects' identity while transforming only their clothing and background to match the wedding style. {customPrompt}. Make them look like they are dressed for a wedding in that style, but ensure BOTH faces remain perfectly consistent and unchanged from the original photo.`,
      isDefault: true,
      lastModified: new Date(),
      version: 1
    },
    family: {
      id: 'family_default',
      type: 'family',
      name: 'Family Default',
      template: `Transform this family of {familyMemberCount} people into a beautiful wedding portrait with a "{style}" theme. Crucially, preserve the exact likeness of EACH and EVERY family member's face and unique facial features. Only transform their clothing and the environment. Ensure all {familyMemberCount} individuals from the original photo are present and their identity is clearly recognizable. {customPrompt}.`,
      isDefault: true,
      lastModified: new Date(),
      version: 1
    }
  };

  /**
   * Get all prompt templates (database first, localStorage fallback)
   */
  public async getPrompts(forceReload: boolean = false): Promise<PromptTemplate[]> {
    // Clear cache if force reload requested
    if (forceReload) {
      this.promptsCache = null;
    }
    
    // Return cached prompts if available and not forcing reload
    if (this.promptsCache && !forceReload) {
      console.log('[PromptService] Returning cached prompts');
      return this.promptsCache;
    }
    
    try {
      // Try to load from database first
      console.log('[PromptService] Loading prompts from database');
      const databasePrompts = await promptDatabaseService.getPrompts();
      
      if (databasePrompts.length > 0) {
        console.log('[PromptService] Loaded prompts from database:', databasePrompts.length);
        this.promptsCache = databasePrompts;
        return databasePrompts;
      }
    } catch (error) {
      console.warn('[PromptService] Failed to load from database, falling back to localStorage:', error);
    }
    
    // Fallback to localStorage
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      console.log('[PromptService] Loading prompts from localStorage');
      
      if (stored) {
        const parsed = JSON.parse(stored);
        // Convert date strings back to Date objects
        this.promptsCache = parsed.map((prompt: any) => ({
          ...prompt,
          lastModified: new Date(prompt.lastModified)
        }));
        return this.promptsCache;
      } else {
        // Initialize with defaults
        const defaultPromptList = Object.values(this.defaultPrompts);
        await this.savePrompts(defaultPromptList);
        this.promptsCache = defaultPromptList;
        return defaultPromptList;
      }
    } catch (error) {
      console.error('Failed to load prompts from localStorage:', error);
      const defaults = Object.values(this.defaultPrompts);
      this.promptsCache = defaults;
      return defaults;
    }
  }

  /**
   * Get all prompt templates (synchronous version for backward compatibility)
   */
  public getPromptsSync(forceReload: boolean = false): PromptTemplate[] {
    // Clear cache if force reload requested
    if (forceReload) {
      this.promptsCache = null;
    }
    
    // Return cached prompts if available and not forcing reload
    if (this.promptsCache && !forceReload) {
      console.log('[PromptService] Returning cached prompts (sync)');
      return this.promptsCache;
    }
    
    // Fallback to localStorage only for sync version
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      console.log('[PromptService] Loading prompts from localStorage (sync)');
      
      if (stored) {
        const parsed = JSON.parse(stored);
        // Convert date strings back to Date objects
        this.promptsCache = parsed.map((prompt: any) => ({
          ...prompt,
          lastModified: new Date(prompt.lastModified)
        }));
        return this.promptsCache;
      } else {
        // Initialize with defaults
        const defaultPromptList = Object.values(this.defaultPrompts);
        this.promptsCache = defaultPromptList;
        return defaultPromptList;
      }
    } catch (error) {
      console.error('Failed to load prompts from localStorage (sync):', error);
      const defaults = Object.values(this.defaultPrompts);
      this.promptsCache = defaults;
      return defaults;
    }
  }

  /**
   * Get prompt template by type (returns the first/default one for that type)
   */
  public async getPromptByType(type: 'single' | 'couple' | 'family'): Promise<PromptTemplate | null> {
    try {
      // Try database first
      console.log(`[PromptService] Attempting to load ${type} prompt from database...`);
      const databasePrompts = await promptDatabaseService.getPromptsByType(type);
      console.log(`[PromptService] Database returned ${databasePrompts.length} prompts for ${type}`);
      
      if (databasePrompts.length > 0) {
        const selectedPrompt = databasePrompts.find(p => p.isDefault) || databasePrompts[0];
        console.log(`[PromptService] Loading ${type} prompt from database - Version: ${selectedPrompt.version}`);
        return selectedPrompt;
      } else {
        console.warn(`[PromptService] No prompts found in database for type: ${type}`);
      }
    } catch (error) {
      console.error(`[PromptService] Database error for ${type} prompt:`, error);
      console.warn(`[PromptService] Failed to load ${type} prompt from database, using localStorage:`, error);
    }

    // Fallback to localStorage
    const prompts = this.getPromptsSync(true);
    const typePrompts = prompts.filter(p => p.type === type);
    const selectedPrompt = typePrompts.find(p => p.isDefault) || typePrompts[0] || null;
    
    if (selectedPrompt) {
      console.log(`[PromptService] Loading ${type} prompt from localStorage - Version: ${selectedPrompt.version}, Last Modified: ${selectedPrompt.lastModified}`);
    }
    
    return selectedPrompt;
  }

  public getPromptByTypeSync(type: 'single' | 'couple' | 'family'): PromptTemplate | null {
    // Synchronous version using only localStorage
    const prompts = this.getPromptsSync(true);
    const typePrompts = prompts.filter(p => p.type === type);
    const selectedPrompt = typePrompts.find(p => p.isDefault) || typePrompts[0] || null;
    
    if (selectedPrompt) {
      console.log(`[PromptService] Loading ${type} prompt sync - Version: ${selectedPrompt.version}, Last Modified: ${selectedPrompt.lastModified}`);
    }
    
    return selectedPrompt;
  }

  /**
   * Save prompt templates
   */
  public async savePrompts(prompts: PromptTemplate[]): Promise<void> {
    try {
      // Save to both database and localStorage
      console.log('[PromptService] Saving prompts to database and localStorage');
      
      // Save to localStorage first (for immediate fallback)
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(prompts));
      
      // Try to save to database
      try {
        for (const prompt of prompts) {
          try {
            await promptDatabaseService.updatePrompt(prompt);
          } catch (error) {
            console.warn(`Failed to save prompt ${prompt.id} to database:`, error);
          }
        }
        console.log('[PromptService] Saved prompts to database');
      } catch (error) {
        console.warn('[PromptService] Failed to save to database, using localStorage only:', error);
      }
      
      // Clear cache when saving new prompts
      this.promptsCache = null;
      console.log('[PromptService] Saved prompts and cleared cache');
    } catch (error) {
      console.error('Failed to save prompts:', error);
      throw new Error('Failed to save prompt templates');
    }
  }

  public savePromptsSync(prompts: PromptTemplate[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(prompts));
      // Clear cache when saving new prompts
      this.promptsCache = null;
      console.log('[PromptService] Saved prompts to localStorage (sync) and cleared cache');
    } catch (error) {
      console.error('Failed to save prompts:', error);
      throw new Error('Failed to save prompt templates');
    }
  }

  /**
   * Update a specific prompt template
   */
  public async updatePrompt(updatedPrompt: PromptTemplate): Promise<void> {
    try {
      // Try database first
      await promptDatabaseService.updatePrompt(updatedPrompt);
      console.log('[PromptService] Updated prompt in database');
      
      // Clear cache to force reload
      this.promptsCache = null;
    } catch (error) {
      console.warn('[PromptService] Failed to update in database, using localStorage:', error);
      
      // Fallback to localStorage
      const prompts = this.getPromptsSync();
      const index = prompts.findIndex(p => p.id === updatedPrompt.id);
      
      if (index !== -1) {
        prompts[index] = {
          ...updatedPrompt,
          lastModified: new Date(),
          version: prompts[index].version + 1
        };
        this.savePromptsSync(prompts);
      } else {
        throw new Error('Prompt template not found');
      }
    }
  }

  /**
   * Reset prompt to default
   */
  public async resetToDefault(promptId: string): Promise<void> {
    try {
      // Try database first
      await promptDatabaseService.resetPromptToDefault(promptId);
      console.log('[PromptService] Reset prompt to default in database');
      
      // Clear cache to force reload
      this.promptsCache = null;
    } catch (error) {
      console.warn('[PromptService] Failed to reset in database, using localStorage:', error);
      
      // Fallback to localStorage
      const prompts = this.getPromptsSync();
      const prompt = prompts.find(p => p.id === promptId);
      
      if (!prompt) {
        throw new Error('Prompt template not found');
      }

      const defaultPrompt = this.defaultPrompts[prompt.type];
      if (!defaultPrompt) {
        throw new Error('Default prompt not found');
      }

      prompt.template = defaultPrompt.template;
      prompt.lastModified = new Date();
      prompt.version = prompt.version + 1;

      this.savePromptsSync(prompts);
    }
  }

  /**
   * Generate a prompt for a specific style and parameters
   */
  public async generatePrompt(
    type: 'single' | 'couple' | 'family',
    style: string,
    customPrompt: string = '',
    familyMemberCount: number = 3
  ): Promise<string> {
    // Try to get fresh template from database first
    let template: PromptTemplate | null = null;
    
    try {
      template = await this.getPromptByType(type);
      console.log(`[PromptService] Using database template version ${template?.version} for ${type}`);
    } catch (error) {
      console.warn(`[PromptService] Failed to get template from database, using localStorage:`, error);
      template = this.getPromptByTypeSync(type);
    }
    
    if (!template) {
      throw new Error(`No prompt template found for type: ${type}`);
    }

    let prompt = template.template
      .replace(/\{style\}/g, style)
      .replace(/\{customPrompt\}/g, customPrompt);

    if (type === 'family') {
      prompt = prompt.replace(/\{familyMemberCount\}/g, familyMemberCount.toString());
    }

    console.log(`[PromptService] Using template version ${template.version} for ${type}, modified: ${template.lastModified}`);
    console.log(`[PromptService] First 150 chars of prompt:`, prompt.substring(0, 150));
    
    return prompt;
  }
  
  /**
   * Generate a prompt for a specific style and parameters (sync version for backward compatibility)
   */
  public generatePromptSync(
    type: 'single' | 'couple' | 'family',
    style: string,
    customPrompt: string = '',
    familyMemberCount: number = 3
  ): string {
    // Use sync version for backward compatibility
    const template = this.getPromptByTypeSync(type);
    if (!template) {
      throw new Error(`No prompt template found for type: ${type}`);
    }

    let prompt = template.template
      .replace(/\{style\}/g, style)
      .replace(/\{customPrompt\}/g, customPrompt);

    if (type === 'family') {
      prompt = prompt.replace(/\{familyMemberCount\}/g, familyMemberCount.toString());
    }

    console.log(`[PromptService] Using template version ${template.version} for ${type} (sync), modified: ${template.lastModified}`);
    
    return prompt;
  }

  /**
   * Get available variables for a prompt type
   */
  public getAvailableVariables(type: 'single' | 'couple' | 'family'): string[] {
    const baseVariables = ['{style}', '{customPrompt}'];
    
    if (type === 'family') {
      baseVariables.push('{familyMemberCount}');
    }
    
    return baseVariables;
  }

  /**
   * Clear cache and force reload prompts
   */
  public clearCache(): void {
    this.promptsCache = null;
    console.log('[PromptService] Cache cleared');
  }

  /**
   * Export prompts as JSON
   */
  public async exportPrompts(): Promise<string> {
    const prompts = await this.getPrompts();
    return JSON.stringify(prompts, null, 2);
  }
  
  /**
   * Export prompts as JSON (sync version)
   */
  public exportPromptsSync(): string {
    const prompts = this.getPromptsSync();
    return JSON.stringify(prompts, null, 2);
  }

  /**
   * Import prompts from JSON
   */
  public async importPrompts(jsonData: string): Promise<void> {
    try {
      const imported = JSON.parse(jsonData);
      
      if (!Array.isArray(imported)) {
        throw new Error('Invalid format: expected array of prompts');
      }

      // Validate each prompt
      for (const prompt of imported) {
        if (!prompt.id || !prompt.type || !prompt.template) {
          throw new Error('Invalid prompt format: missing required fields');
        }
        
        if (!['single', 'couple', 'family'].includes(prompt.type)) {
          throw new Error(`Invalid prompt type: ${prompt.type}`);
        }
      }

      // Convert date strings and set version info
      const prompts = imported.map((prompt: any) => ({
        ...prompt,
        lastModified: new Date(prompt.lastModified || Date.now()),
        version: prompt.version || 1
      }));

      await this.savePrompts(prompts);
    } catch (error) {
      console.error('Failed to import prompts:', error);
      throw new Error('Failed to import prompt templates');
    }
  }
}

// Export singleton instance
export const promptService = new PromptService();
export default promptService;