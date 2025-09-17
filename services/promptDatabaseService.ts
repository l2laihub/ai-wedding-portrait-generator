/**
 * Prompt Database Service
 * Handles CRUD operations for prompt templates in Supabase
 */

import { supabase } from './supabaseClient';
import { PromptTemplate } from './promptService';

export interface DatabasePromptTemplate {
  id: string;
  type: 'single' | 'couple' | 'family';
  name: string;
  template: string;
  is_default: boolean;
  version: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

class PromptDatabaseService {
  /**
   * Get all prompt templates from database
   */
  public async getPrompts(): Promise<PromptTemplate[]> {
    try {
      const { data, error } = await supabase
        .from('prompt_templates')
        .select('*')
        .order('type', { ascending: true })
        .order('is_default', { ascending: false });

      if (error) {
        console.error('Error fetching prompts from database:', error);
        throw new Error(`Failed to fetch prompts: ${error.message}`);
      }

      // Convert database format to PromptTemplate format
      return (data || []).map(this.convertDatabaseToPromptTemplate);
    } catch (error) {
      console.error('Failed to get prompts from database:', error);
      throw error;
    }
  }

  /**
   * Get prompt template by ID
   */
  public async getPromptById(id: string): Promise<PromptTemplate | null> {
    try {
      const { data, error } = await supabase
        .from('prompt_templates')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Not found
        }
        throw new Error(`Failed to fetch prompt: ${error.message}`);
      }

      return data ? this.convertDatabaseToPromptTemplate(data) : null;
    } catch (error) {
      console.error('Failed to get prompt by ID:', error);
      throw error;
    }
  }

  /**
   * Get prompt templates by type
   */
  public async getPromptsByType(type: 'single' | 'couple' | 'family'): Promise<PromptTemplate[]> {
    try {
      const { data, error } = await supabase
        .from('prompt_templates')
        .select('*')
        .eq('type', type)
        .order('is_default', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch prompts by type: ${error.message}`);
      }

      return (data || []).map(this.convertDatabaseToPromptTemplate);
    } catch (error) {
      console.error('Failed to get prompts by type:', error);
      throw error;
    }
  }

  /**
   * Create new prompt template
   */
  public async createPrompt(prompt: Omit<PromptTemplate, 'lastModified'>): Promise<PromptTemplate> {
    try {
      const { data, error } = await supabase
        .from('prompt_templates')
        .insert({
          id: prompt.id,
          type: prompt.type,
          name: prompt.name,
          template: prompt.template,
          is_default: prompt.isDefault,
          version: prompt.version
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create prompt: ${error.message}`);
      }

      return this.convertDatabaseToPromptTemplate(data);
    } catch (error) {
      console.error('Failed to create prompt:', error);
      throw error;
    }
  }

  /**
   * Update existing prompt template
   */
  public async updatePrompt(prompt: PromptTemplate): Promise<PromptTemplate> {
    try {
      const { data, error } = await supabase
        .from('prompt_templates')
        .update({
          name: prompt.name,
          template: prompt.template,
          is_default: prompt.isDefault,
          version: prompt.version + 1 // Increment version
        })
        .eq('id', prompt.id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update prompt: ${error.message}`);
      }

      return this.convertDatabaseToPromptTemplate(data);
    } catch (error) {
      console.error('Failed to update prompt:', error);
      throw error;
    }
  }

  /**
   * Delete prompt template
   */
  public async deletePrompt(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('prompt_templates')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(`Failed to delete prompt: ${error.message}`);
      }
    } catch (error) {
      console.error('Failed to delete prompt:', error);
      throw error;
    }
  }

  /**
   * Reset prompt to default version
   */
  public async resetPromptToDefault(id: string): Promise<PromptTemplate> {
    try {
      // Get the current prompt to determine its type
      const currentPrompt = await this.getPromptById(id);
      if (!currentPrompt) {
        throw new Error('Prompt not found');
      }

      // Get the default template for this type from the initial data
      const defaultTemplates = {
        single: 'Transform the SINGLE PERSON in this image into a FULL BODY wedding portrait with a "{style}" theme. This is a SINGLE PERSON portrait - NOT a couple. Create a professional bridal/groom portrait showing them ALONE. Keep their face EXACTLY identical to the original - preserve ALL facial features, expressions, and complete likeness. Show the complete wedding outfit from head to toe, including dress/suit details, shoes, and accessories. {customPrompt}. Ensure their face remains perfectly consistent and unchanged from the original photo while creating a stunning full-length INDIVIDUAL portrait.',
        couple: 'Transform the TWO PEOPLE (couple) in this image into a beautiful wedding portrait with a "{style}" theme. This is a COUPLE portrait - there should be TWO people in the result. Keep BOTH their faces EXACTLY identical to the original - preserve their facial features, expressions, and likeness completely. Maintain BOTH subjects\' identity while transforming only their clothing and background to match the wedding style. {customPrompt}. Make them look like they are dressed for a wedding in that style, but ensure BOTH faces remain perfectly consistent and unchanged from the original photo.',
        family: 'Transform this family of {familyMemberCount} people into a beautiful wedding portrait with a "{style}" theme. Crucially, preserve the exact likeness of EACH and EVERY family member\'s face and unique facial features. Only transform their clothing and the environment. Ensure all {familyMemberCount} individuals from the original photo are present and their identity is clearly recognizable. {customPrompt}.'
      };

      const defaultTemplate = defaultTemplates[currentPrompt.type];

      const { data, error } = await supabase
        .from('prompt_templates')
        .update({
          template: defaultTemplate,
          version: currentPrompt.version + 1
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to reset prompt: ${error.message}`);
      }

      return this.convertDatabaseToPromptTemplate(data);
    } catch (error) {
      console.error('Failed to reset prompt to default:', error);
      throw error;
    }
  }

  /**
   * Sync localStorage prompts to database (migration helper)
   */
  public async syncLocalStorageToDatabase(): Promise<void> {
    try {
      const localPrompts = localStorage.getItem('wedai_admin_prompts');
      if (!localPrompts) {
        console.log('No localStorage prompts to sync');
        return;
      }

      const parsed = JSON.parse(localPrompts);
      const prompts = parsed.map((prompt: any) => ({
        ...prompt,
        lastModified: new Date(prompt.lastModified)
      }));

      console.log('Syncing localStorage prompts to database:', prompts.length);

      for (const prompt of prompts) {
        try {
          // Check if prompt exists
          const existing = await this.getPromptById(prompt.id);
          
          if (existing) {
            // Update existing
            await this.updatePrompt(prompt);
            console.log(`Updated prompt: ${prompt.id}`);
          } else {
            // Create new
            await this.createPrompt(prompt);
            console.log(`Created prompt: ${prompt.id}`);
          }
        } catch (error) {
          console.error(`Failed to sync prompt ${prompt.id}:`, error);
        }
      }

      console.log('Finished syncing localStorage prompts to database');
    } catch (error) {
      console.error('Failed to sync localStorage to database:', error);
      throw error;
    }
  }

  /**
   * Convert database format to PromptTemplate format
   */
  private convertDatabaseToPromptTemplate(dbPrompt: DatabasePromptTemplate): PromptTemplate {
    return {
      id: dbPrompt.id,
      type: dbPrompt.type,
      name: dbPrompt.name,
      template: dbPrompt.template,
      isDefault: dbPrompt.is_default,
      version: dbPrompt.version,
      lastModified: new Date(dbPrompt.updated_at)
    };
  }

  /**
   * Check if user has admin permissions
   */
  public async checkAdminPermissions(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error checking admin permissions:', error);
        return false;
      }

      return data && ['admin', 'super_admin'].includes(data.role);
    } catch (error) {
      console.error('Failed to check admin permissions:', error);
      return false;
    }
  }
}

// Export singleton instance
export const promptDatabaseService = new PromptDatabaseService();
export default promptDatabaseService;