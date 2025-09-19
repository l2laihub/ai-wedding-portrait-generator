import React, { useState, useEffect } from 'react';
import Icon from '../../../components/Icon';
import { promptDatabaseService } from '../../../services/promptDatabaseService';
import { supabase } from '../../../services/supabaseClient';
import { ThemeManager, WEDDING_THEMES } from '../../config/themes.config.js';
import { unifiedThemeService } from '../../../services/unifiedThemeService';
// Enhanced prompt service import temporarily commented for build compatibility
// import { enhancedPromptService } from '../../../services/enhancedPromptService';

// Icon paths
const iconPaths = {
  save: "M19 21H5c-1.1 0-2-.9-2-2V5c0-1.1.9-2 2-2h11l5 5v11c0 1.1-.9 2-2 2zM17 21v-8H7v8h10zM12 1L7 6h5V1z",
  edit: "M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z",
  copy: "M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z",
  reset: "M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z",
  test: "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z",
  warning: "M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z",
  download: "M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z",
  upload: "M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z"
};

interface PromptTemplate {
  id: string;
  type: 'single' | 'couple' | 'family';
  name: string;
  template: string;
  isDefault: boolean;
  lastModified: Date;
  version: number;
}

const defaultPrompts: Record<string, PromptTemplate> = {
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

// Helper component for async prompt display
const TestPromptDisplay: React.FC<{ generatePrompt: () => Promise<string>; dependencies: any[] }> = ({ generatePrompt, dependencies }) => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const updatePrompt = async () => {
      setLoading(true);
      try {
        const newPrompt = await generatePrompt();
        setPrompt(newPrompt);
      } catch (error) {
        console.error('Failed to generate prompt:', error);
        setPrompt('Error generating prompt');
      } finally {
        setLoading(false);
      }
    };

    updatePrompt();
  }, dependencies);

  if (loading) {
    return (
      <div className="bg-gray-900 border border-gray-600 rounded-lg p-3 text-gray-400 text-sm max-h-32 overflow-y-auto">
        Generating prompt...
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-600 rounded-lg p-3 text-gray-300 text-sm max-h-32 overflow-y-auto">
      {prompt}
    </div>
  );
};

const PromptManagement: React.FC = () => {
  const [prompts, setPrompts] = useState<PromptTemplate[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<PromptTemplate | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editedTemplate, setEditedTemplate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [testMode, setTestMode] = useState(false);
  const [testStyle, setTestStyle] = useState('Classic & Timeless Wedding');
  const [testCustomPrompt, setTestCustomPrompt] = useState('');
  
  // Package-related state
  const [activeTab, setActiveTab] = useState<'legacy' | 'packages'>('packages');
  const [packages, setPackages] = useState<any[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<any | null>(null);
  const [packagePrompts, setPackagePrompts] = useState<{
    single_prompt_template: string;
    couple_prompt_template: string;
    family_prompt_template: string;
  }>({
    single_prompt_template: '',
    couple_prompt_template: '',
    family_prompt_template: ''
  });
  const [testFamilyCount, setTestFamilyCount] = useState(3);

  const [weddingStyles, setWeddingStyles] = useState<string[]>([]);
  const [selectedTheme, setSelectedTheme] = useState(null);
  const [enhancedMode, setEnhancedMode] = useState(false);
  const [systemStatus, setSystemStatus] = useState<any>(null);

  useEffect(() => {
    loadPrompts();
    loadPackages();
    checkAdminStatus();
    initializeThemeSystem();
  }, []);


  const initializeThemeSystem = async () => {
    try {
      // Get saved enhanced mode preference
      const isEnhanced = unifiedThemeService.getEnhancedMode();
      setEnhancedMode(isEnhanced);
      
      // Load themes and system status
      const themes = await unifiedThemeService.getThemeNames();
      const status = await unifiedThemeService.getSystemStatus();
      
      setWeddingStyles(themes);
      setSystemStatus(status);
    } catch (error) {
      console.error('Failed to initialize theme system:', error);
      // Fallback to legacy themes
      setWeddingStyles(Object.values(WEDDING_THEMES).map(theme => theme.name));
    }
  };

  const handleEnhancedModeToggle = async (enabled: boolean) => {
    try {
      setEnhancedMode(enabled);
      unifiedThemeService.setEnhancedMode(enabled);
      
      // Reload themes with new mode
      const themes = await unifiedThemeService.getThemeNames();
      const status = await unifiedThemeService.getSystemStatus();
      
      setWeddingStyles(themes);
      setSystemStatus(status);
      
      setSuccess(enabled ? 
        'Enhanced mode enabled - Using database themes' : 
        'Enhanced mode disabled - Using legacy themes'
      );
      
      // Clear any previous errors
      setError(null);
    } catch (error) {
      console.error('Error toggling enhanced mode:', error);
      setError('Failed to switch theme mode');
      // Revert the mode on error
      setEnhancedMode(!enabled);
    }
  };

  const checkAdminStatus = async () => {
    try {
      const isAdmin = await promptDatabaseService.checkAdminPermissions();
      if (!isAdmin) {
        setError('You need admin permissions to manage prompts');
      }
    } catch (error) {
      console.warn('Could not verify admin status:', error);
    }
  };

  const loadPrompts = async () => {
    setLoading(true);
    try {
      // Try to load from database first
      const databasePrompts = await promptDatabaseService.getPrompts();
      
      if (databasePrompts.length > 0) {
        console.log('Loaded prompts from database:', databasePrompts.length);
        setPrompts(databasePrompts);
      } else {
        // Fallback to localStorage and sync to database
        const stored = localStorage.getItem('wedai_admin_prompts');
        if (stored) {
          const parsed = JSON.parse(stored);
          const prompts = parsed.map((prompt: any) => ({
            ...prompt,
            lastModified: new Date(prompt.lastModified)
          }));
          setPrompts(prompts);
          
          // Sync localStorage to database
          try {
            await promptDatabaseService.syncLocalStorageToDatabase();
            console.log('Synced localStorage prompts to database');
          } catch (syncError) {
            console.warn('Failed to sync to database:', syncError);
          }
        } else {
          // Initialize with default prompts
          const defaultPromptList = Object.values(defaultPrompts);
          setPrompts(defaultPromptList);
          
          // Try to save defaults to database
          try {
            for (const prompt of defaultPromptList) {
              await promptDatabaseService.createPrompt(prompt);
            }
            console.log('Created default prompts in database');
          } catch (createError) {
            console.warn('Failed to create defaults in database:', createError);
            // Fallback to localStorage
            localStorage.setItem('wedai_admin_prompts', JSON.stringify(defaultPromptList));
          }
        }
      }
    } catch (error) {
      console.error('Failed to load prompts:', error);
      setError('Failed to load prompt templates');
      
      // Final fallback to localStorage only
      try {
        const stored = localStorage.getItem('wedai_admin_prompts');
        if (stored) {
          const parsed = JSON.parse(stored);
          const prompts = parsed.map((prompt: any) => ({
            ...prompt,
            lastModified: new Date(prompt.lastModified)
          }));
          setPrompts(prompts);
        } else {
          setPrompts(Object.values(defaultPrompts));
        }
      } catch (localError) {
        setPrompts(Object.values(defaultPrompts));
      }
    } finally {
      setLoading(false);
    }
  };

  const savePrompts = async (updatedPrompts: PromptTemplate[]) => {
    setLoading(true);
    try {
      // Save to database first
      for (const prompt of updatedPrompts) {
        try {
          const existing = await promptDatabaseService.getPromptById(prompt.id);
          if (existing) {
            await promptDatabaseService.updatePrompt(prompt);
          } else {
            await promptDatabaseService.createPrompt(prompt);
          }
        } catch (dbError) {
          console.warn(`Failed to save prompt ${prompt.id} to database:`, dbError);
        }
      }
      
      // Also save to localStorage as backup
      localStorage.setItem('wedai_admin_prompts', JSON.stringify(updatedPrompts));
      setPrompts(updatedPrompts);
      setSuccess('Prompts saved to database successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Failed to save prompts:', error);
      setError('Failed to save prompt templates');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePrompt = async () => {
    if (!selectedPrompt || !editedTemplate.trim()) return;

    setLoading(true);
    try {
      const updatedPrompt: PromptTemplate = {
        ...selectedPrompt,
        template: editedTemplate,
        lastModified: new Date(),
        version: selectedPrompt.version + 1
      };

      // Save single prompt to database
      try {
        const savedPrompt = await promptDatabaseService.updatePrompt(updatedPrompt);
        console.log('Prompt saved to database:', savedPrompt);
        
        // Update local state
        const updatedPrompts = prompts.map(p => 
          p.id === selectedPrompt.id ? savedPrompt : p
        );
        setPrompts(updatedPrompts);
        setSelectedPrompt(savedPrompt);
        
        // Also update localStorage backup
        localStorage.setItem('wedai_admin_prompts', JSON.stringify(updatedPrompts));
        
        setSuccess('Prompt saved to database successfully');
      } catch (dbError) {
        console.warn('Failed to save to database, using localStorage:', dbError);
        
        // Fallback to localStorage only
        const updatedPrompts = prompts.map(p => 
          p.id === selectedPrompt.id ? updatedPrompt : p
        );
        localStorage.setItem('wedai_admin_prompts', JSON.stringify(updatedPrompts));
        setPrompts(updatedPrompts);
        setSelectedPrompt(updatedPrompt);
        
        setSuccess('Prompt saved to localStorage (database unavailable)');
      }
      
      setEditMode(false);
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Failed to save prompt:', error);
      setError('Failed to save prompt');
    } finally {
      setLoading(false);
    }
  };

  const handleResetToDefault = async () => {
    if (!selectedPrompt) return;

    setLoading(true);
    try {
      // Try database reset first
      try {
        const resetPrompt = await promptDatabaseService.resetPromptToDefault(selectedPrompt.id);
        console.log('Prompt reset to default in database:', resetPrompt);
        
        // Update local state
        const updatedPrompts = prompts.map(p => 
          p.id === selectedPrompt.id ? resetPrompt : p
        );
        setPrompts(updatedPrompts);
        setSelectedPrompt(resetPrompt);
        setEditedTemplate(resetPrompt.template);
        
        // Update localStorage backup
        localStorage.setItem('wedai_admin_prompts', JSON.stringify(updatedPrompts));
        
        setSuccess('Prompt reset to default in database');
      } catch (dbError) {
        console.warn('Failed to reset in database, using localStorage:', dbError);
        
        // Fallback to local reset
        const defaultPrompt = defaultPrompts[selectedPrompt.type];
        if (!defaultPrompt) return;

        const resetPrompt: PromptTemplate = {
          ...selectedPrompt,
          template: defaultPrompt.template,
          lastModified: new Date(),
          version: selectedPrompt.version + 1
        };

        const updatedPrompts = prompts.map(p => 
          p.id === selectedPrompt.id ? resetPrompt : p
        );

        localStorage.setItem('wedai_admin_prompts', JSON.stringify(updatedPrompts));
        setPrompts(updatedPrompts);
        setSelectedPrompt(resetPrompt);
        setEditedTemplate(resetPrompt.template);
        
        setSuccess('Prompt reset to default (localStorage only)');
      }
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Failed to reset prompt:', error);
      setError('Failed to reset prompt to default');
    } finally {
      setLoading(false);
    }
  };

  const generateTestPrompt = async () => {
    if (!selectedPrompt) return '';

    if (enhancedMode && selectedTheme) {
      try {
        // Enhanced prompt service temporarily disabled for build compatibility
        // const enhanced = await enhancedPromptService.generatePromptWithTheme(
        //   selectedPrompt.type,
        //   selectedTheme,
        //   testCustomPrompt,
        //   selectedPrompt.type === 'family' ? testFamilyCount : undefined
        // );
        // return enhanced;
        console.warn('Enhanced prompt generation temporarily disabled');
        return 'Enhanced mode temporarily unavailable';
      } catch (error) {
        console.error('Enhanced prompt generation failed:', error);
      }
    }

    let testPrompt = selectedPrompt.template
      .replace('{style}', testStyle)
      .replace('{customPrompt}', testCustomPrompt);

    if (selectedPrompt.type === 'family') {
      testPrompt = testPrompt.replace(/\{familyMemberCount\}/g, testFamilyCount.toString());
    }

    return testPrompt;
  };


  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setSuccess('Copied to clipboard');
      setTimeout(() => setSuccess(null), 2000);
    }).catch(() => {
      setError('Failed to copy to clipboard');
    });
  };

  const handleExportPrompts = () => {
    try {
      const exportData = JSON.stringify(prompts, null, 2);
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wedai-prompts-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setSuccess('Prompts exported successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      setError('Failed to export prompts');
    }
  };

  const handleImportPrompts = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const imported = JSON.parse(content);
        
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

        // Convert dates and save
        const processedPrompts = imported.map((prompt: any) => ({
          ...prompt,
          lastModified: new Date(prompt.lastModified || Date.now()),
          version: prompt.version || 1
        }));

        setPrompts(processedPrompts);
        await savePrompts(processedPrompts);
        setSuccess(`Successfully imported ${processedPrompts.length} prompts`);
        setTimeout(() => setSuccess(null), 3000);
      } catch (error) {
        setError(`Failed to import prompts: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };
    
    reader.readAsText(file);
    // Reset file input
    event.target.value = '';
  };

  const getPromptsByType = (type: 'single' | 'couple' | 'family') => {
    return prompts.filter(p => p.type === type);
  };

  // Load packages from database
  const loadPackages = async () => {
    try {
      const { data, error } = await supabase
        .from('photo_packages')
        .select('*')
        .order('name');
      
      if (error) {
        console.warn('Failed to load packages:', error);
        return;
      }
      
      setPackages(data || []);
    } catch (error) {
      console.warn('Error loading packages:', error);
    }
  };

  // Load package prompt templates when package is selected
  const loadPackagePrompts = async (packageId: string) => {
    try {
      const { data, error } = await supabase
        .from('photo_packages')
        .select('single_prompt_template, couple_prompt_template, family_prompt_template')
        .eq('id', packageId)
        .single();
      
      if (error) {
        console.error('Failed to load package prompts:', error);
        return;
      }
      
      setPackagePrompts({
        single_prompt_template: data.single_prompt_template || '',
        couple_prompt_template: data.couple_prompt_template || '',
        family_prompt_template: data.family_prompt_template || ''
      });
    } catch (error) {
      console.error('Error loading package prompts:', error);
    }
  };

  // Save package prompt templates
  const savePackagePrompts = async () => {
    if (!selectedPackage) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('photo_packages')
        .update({
          single_prompt_template: packagePrompts.single_prompt_template,
          couple_prompt_template: packagePrompts.couple_prompt_template,
          family_prompt_template: packagePrompts.family_prompt_template,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedPackage.id);
      
      if (error) {
        setError('Failed to save package prompts: ' + error.message);
        return;
      }
      
      setSuccess('Package prompts saved successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      setError('Error saving package prompts');
    } finally {
      setLoading(false);
    }
  };

  // Handle package selection
  const handlePackageSelect = (pkg: any) => {
    setSelectedPackage(pkg);
    loadPackagePrompts(pkg.id);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Prompt Management</h1>
          <p className="text-gray-400 mt-2">Manage and test AI prompts for different portrait types</p>
        </div>
        <div className="flex space-x-3 mt-4 md:mt-0">
          <button
            onClick={handleExportPrompts}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm flex items-center"
          >
            <Icon path={iconPaths.download} className="w-4 h-4 mr-2" />
            Export
          </button>
          <label className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm flex items-center cursor-pointer">
            <Icon path={iconPaths.upload} className="w-4 h-4 mr-2" />
            Import
            <input
              type="file"
              accept=".json"
              onChange={handleImportPrompts}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-900/50 border border-red-500 rounded-lg p-4 flex items-center space-x-3">
          <Icon path={iconPaths.warning} className="w-5 h-5 text-red-400" />
          <div>
            <p className="text-red-300 font-medium">Error</p>
            <p className="text-red-200 text-sm">{error}</p>
          </div>
          <button 
            onClick={() => setError(null)}
            className="ml-auto text-red-400 hover:text-red-300"
          >
            ✕
          </button>
        </div>
      )}

      {success && (
        <div className="bg-green-900/50 border border-green-500 rounded-lg p-4 flex items-center space-x-3">
          <Icon path={iconPaths.save} className="w-5 h-5 text-green-400" />
          <p className="text-green-200">{success}</p>
          <button 
            onClick={() => setSuccess(null)}
            className="ml-auto text-green-400 hover:text-green-300"
          >
            ✕
          </button>
        </div>
      )}

      {/* Enhanced Features Toggle */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">Template Engine Features</h3>
            <p className="text-sm text-gray-400">Use advanced theme management and enhanced variables</p>
            <p className="text-xs text-blue-400 mt-1">
              💡 <strong>New:</strong> Visit the <span className="underline cursor-pointer" onClick={() => window.location.hash = '#themes'}>Themes</span> section to manage wedding styles and template configurations
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => handleEnhancedModeToggle(!enhancedMode)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                enhancedMode
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {enhancedMode ? 'Enhanced Mode ON' : 'Basic Mode'}
            </button>
            
            {systemStatus && (
              <div className="text-sm text-gray-400">
                <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                  systemStatus.databaseAvailable ? 'bg-green-500' : 'bg-yellow-500'
                }`}></span>
                {systemStatus.totalThemes} themes • {systemStatus.activeSource}
                {systemStatus.databaseAvailable && systemStatus.databaseThemes > 0 && (
                  <span className="ml-2 text-purple-400">
                    ({systemStatus.databaseThemes} enhanced)
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Package Themes Integration Info */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center">
              <Icon path={iconPaths.copy} className="w-5 h-5 mr-2" />
              Package Themes Integration
            </h3>
            <p className="text-sm text-gray-400 mt-1">
              Package themes automatically integrate with these prompt templates using the {`{style}`} variable
            </p>
            
            <div className="mt-3 p-3 bg-gray-700/50 rounded-lg">
              <p className="text-xs text-gray-300 mb-2"><strong>How it works:</strong></p>
              <ol className="text-xs text-gray-400 space-y-1 list-decimal list-inside">
                <li>Package themes provide structured prompts (setting, clothing, atmosphere, technical)</li>
                <li>The base prompt template includes the {`{style}`} placeholder</li>
                <li>During generation, the system combines the base template with selected package theme prompts</li>
                <li>Result: "Professional portrait photography... [setting_prompt], [clothing_prompt], [atmosphere_prompt], [technical_prompt]"</li>
              </ol>
            </div>
            
            <div className="mt-3 flex items-center space-x-4 text-sm">
              <button 
                onClick={() => {
                  window.history.pushState(null, '', '/admin/packages');
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }}
                className="text-purple-400 hover:text-purple-300 underline cursor-pointer"
              >
                Manage Package Themes →
              </button>
              <button 
                onClick={() => {
                  window.history.pushState(null, '', '/admin/themes');
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }}
                className="text-blue-400 hover:text-blue-300 underline cursor-pointer"
              >
                View in Theme Management →
              </button>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-2xl font-bold text-purple-400">12</div>
            <div className="text-xs text-gray-400">Wedding Themes</div>
            <div className="text-2xl font-bold text-blue-400 mt-2">12</div>
            <div className="text-xs text-gray-400">Engagement Themes</div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-1 flex space-x-1">
        <button
          onClick={() => setActiveTab('packages')}
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'packages'
              ? 'bg-purple-600 text-white'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          Package Prompts
        </button>
        <button
          onClick={() => setActiveTab('legacy')}
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'legacy'
              ? 'bg-purple-600 text-white'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          Legacy Prompts
        </button>
      </div>

      {/* Package Prompts Tab */}
      {activeTab === 'packages' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Package List */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Photo Packages</h3>
            
            <div className="space-y-3">
              {packages.map(pkg => (
                <button
                  key={pkg.id}
                  onClick={() => handlePackageSelect(pkg)}
                  className={`w-full text-left p-4 rounded-lg border transition-colors ${
                    selectedPackage?.id === pkg.id
                      ? 'border-purple-500 bg-purple-900/20 text-purple-300'
                      : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{pkg.name}</span>
                    <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded">
                      {pkg.category}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {pkg.description}
                  </div>
                </button>
              ))}
              
              {packages.length === 0 && (
                <div className="text-center text-gray-400 py-8">
                  <p>No packages found</p>
                  <p className="text-sm mt-1">Create packages in Package Management</p>
                </div>
              )}
            </div>
          </div>

          {/* Package Prompt Editor */}
          <div className="lg:col-span-2 bg-gray-800 rounded-lg border border-gray-700 p-6">
            {selectedPackage ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{selectedPackage.name} Prompts</h3>
                    <p className="text-sm text-gray-400">
                      Edit prompt templates for {selectedPackage.category} package
                    </p>
                  </div>
                  <button
                    onClick={savePackagePrompts}
                    disabled={loading}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50"
                  >
                    <Icon path={iconPaths.save} className="w-4 h-4 mr-2 inline" />
                    {loading ? 'Saving...' : 'Save Prompts'}
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Single Portrait Prompt */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Single Portrait Template
                    </label>
                    <textarea
                      value={packagePrompts.single_prompt_template}
                      onChange={(e) => setPackagePrompts(prev => ({
                        ...prev,
                        single_prompt_template: e.target.value
                      }))}
                      className="w-full h-32 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm resize-vertical"
                      placeholder="Enter prompt template for single person portraits..."
                    />
                  </div>

                  {/* Couple Portrait Prompt */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Couple Portrait Template
                    </label>
                    <textarea
                      value={packagePrompts.couple_prompt_template}
                      onChange={(e) => setPackagePrompts(prev => ({
                        ...prev,
                        couple_prompt_template: e.target.value
                      }))}
                      className="w-full h-32 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm resize-vertical"
                      placeholder="Enter prompt template for couple portraits..."
                    />
                  </div>

                  {/* Family Portrait Prompt */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Family Portrait Template
                    </label>
                    <textarea
                      value={packagePrompts.family_prompt_template}
                      onChange={(e) => setPackagePrompts(prev => ({
                        ...prev,
                        family_prompt_template: e.target.value
                      }))}
                      className="w-full h-32 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm resize-vertical"
                      placeholder="Enter prompt template for family portraits..."
                    />
                  </div>
                </div>
                
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-300 mb-2">Template Variables</h4>
                  <div className="text-xs text-gray-400 space-y-1">
                    <p><code className="bg-gray-800 px-1 rounded">{'{style}'}</code> - The selected theme/style name</p>
                    <p><code className="bg-gray-800 px-1 rounded">{'{customPrompt}'}</code> - User's custom prompt input</p>
                    <p><code className="bg-gray-800 px-1 rounded">{'{familyMemberCount}'}</code> - Number of family members (family only)</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-400 py-12">
                <Icon path={iconPaths.edit} className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                <h3 className="text-lg font-medium mb-2">No Package Selected</h3>
                <p>Select a package from the list to edit its prompt templates</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Legacy Prompts Tab */}
      {activeTab === 'legacy' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Prompt List */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Prompt Templates</h3>
          
          <div className="space-y-4">
            {['single', 'couple', 'family'].map(type => (
              <div key={type} className="space-y-2">
                <h4 className="text-sm font-medium text-gray-300 uppercase tracking-wide">
                  {type} Portraits
                </h4>
                {getPromptsByType(type as 'single' | 'couple' | 'family').map(prompt => (
                  <button
                    key={prompt.id}
                    onClick={() => {
                      setSelectedPrompt(prompt);
                      setEditedTemplate(prompt.template);
                      setEditMode(false);
                      setTestMode(false);
                    }}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedPrompt?.id === prompt.id
                        ? 'border-purple-500 bg-purple-900/20 text-purple-300'
                        : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{prompt.name}</span>
                      {prompt.isDefault && (
                        <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded">
                          Default
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      v{prompt.version} • {prompt.lastModified instanceof Date ? prompt.lastModified.toLocaleDateString() : 'Unknown date'}
                    </div>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Prompt Editor */}
        <div className="lg:col-span-2 bg-gray-800 rounded-lg border border-gray-700 p-6">
          {selectedPrompt ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white">{selectedPrompt.name}</h3>
                  <p className="text-sm text-gray-400">
                    {selectedPrompt.type.charAt(0).toUpperCase() + selectedPrompt.type.slice(1)} Portrait Template
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setTestMode(!testMode)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      testMode
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    <Icon path={iconPaths.test} className="w-4 h-4 mr-2 inline" />
                    Test
                  </button>
                  <button
                    onClick={() => {
                      setEditMode(!editMode);
                      if (!editMode) {
                        setEditedTemplate(selectedPrompt.template);
                      }
                    }}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      editMode
                        ? 'bg-orange-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    <Icon path={iconPaths.edit} className="w-4 h-4 mr-2 inline" />
                    {editMode ? 'Cancel' : 'Edit'}
                  </button>
                </div>
              </div>

              {/* Test Mode */}
              {testMode && (
                <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4 space-y-4">
                  <h4 className="font-medium text-blue-200">Test Prompt Generation</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        {enhancedMode ? 'Theme (Enhanced)' : 'Style'}
                      </label>
                      {enhancedMode ? (
                        <div className="text-sm text-white bg-gray-700 px-3 py-2 rounded-lg border border-gray-600">
                          {selectedTheme ? selectedTheme.name : 'Select a theme from the browser below'}
                        </div>
                      ) : (
                        <select
                          value={testStyle}
                          onChange={(e) => setTestStyle(e.target.value)}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                        >
                          {weddingStyles.map(style => (
                            <option key={style} value={style}>{style}</option>
                          ))}
                        </select>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Custom Prompt</label>
                      <input
                        type="text"
                        value={testCustomPrompt}
                        onChange={(e) => setTestCustomPrompt(e.target.value)}
                        placeholder="Optional custom prompt"
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                      />
                    </div>
                    
                    {selectedPrompt.type === 'family' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Family Members</label>
                        <input
                          type="number"
                          value={testFamilyCount}
                          onChange={(e) => setTestFamilyCount(parseInt(e.target.value) || 3)}
                          min="2"
                          max="10"
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-300">Generated Prompt</label>
                      <button
                        onClick={async () => {
                          const prompt = await generateTestPrompt();
                          copyToClipboard(prompt);
                        }}
                        className="text-blue-400 hover:text-blue-300 text-sm"
                      >
                        <Icon path={iconPaths.copy} className="w-4 h-4 mr-1 inline" />
                        Copy
                      </button>
                    </div>
                    <TestPromptDisplay 
                      generatePrompt={generateTestPrompt}
                      dependencies={[selectedPrompt, testStyle, testCustomPrompt, testFamilyCount, enhancedMode, selectedTheme]}
                    />
                  </div>
                </div>
              )}

              {/* Edit Mode */}
              {editMode ? (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-300">Template</label>
                      <div className="flex space-x-2">
                        <button
                          onClick={handleResetToDefault}
                          className="text-yellow-400 hover:text-yellow-300 text-sm"
                        >
                          <Icon path={iconPaths.reset} className="w-4 h-4 mr-1 inline" />
                          Reset to Default
                        </button>
                      </div>
                    </div>
                    <textarea
                      value={editedTemplate}
                      onChange={(e) => setEditedTemplate(e.target.value)}
                      rows={12}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm resize-none"
                      placeholder="Enter prompt template..."
                    />
                    <div className="text-xs text-gray-400 mt-1">
                      Available variables: {'{style}'}, {'{enhanceSection}'}
                      {selectedPrompt.type === 'family' && ', {familyMemberCount}'}
                      <br />
                      <span className="text-yellow-400">Note:</span> Use {'{enhanceSection}'} instead of ENHANCE: {'{customPrompt}'} for cleaner output when custom prompt is empty
                    </div>
                  </div>

                  <div className="flex space-x-3">
                    <button
                      onClick={handleSavePrompt}
                      disabled={loading || !editedTemplate.trim()}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-sm"
                    >
                      <Icon path={iconPaths.save} className="w-4 h-4 mr-2" />
                      {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      onClick={() => {
                        setEditMode(false);
                        setEditedTemplate(selectedPrompt.template);
                      }}
                      className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-300">Current Template</label>
                      <button
                        onClick={() => copyToClipboard(selectedPrompt.template)}
                        className="text-gray-400 hover:text-gray-300 text-sm"
                      >
                        <Icon path={iconPaths.copy} className="w-4 h-4 mr-1 inline" />
                        Copy
                      </button>
                    </div>
                    <div className="bg-gray-900 border border-gray-600 rounded-lg p-3 text-gray-300 text-sm max-h-64 overflow-y-auto whitespace-pre-wrap">
                      {selectedPrompt.template}
                    </div>
                  </div>

                  <div className="text-xs text-gray-400">
                    <p>Version {selectedPrompt.version} • Last modified: {selectedPrompt.lastModified instanceof Date ? selectedPrompt.lastModified.toLocaleString() : 'Unknown'}</p>
                    <p className="mt-1">
                      Variables: {'{style}'}, {'{enhanceSection}'}
                      {selectedPrompt.type === 'family' && ', {familyMemberCount}'}
                    </p>
                    <p className="mt-1 text-yellow-400">
                      💡 Tip: Use {'{enhanceSection}'} for conditional enhancement (no empty ENHANCE section)
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-gray-400 py-12">
              <Icon path={iconPaths.edit} className="w-16 h-16 mx-auto mb-4 text-gray-600" />
              <h3 className="text-lg font-medium mb-2">No Prompt Selected</h3>
              <p>Select a prompt template from the list to view and edit</p>
            </div>
          )}
        </div>
      </div>
        )}

    </div>
  );
};

export default PromptManagement;