import React, { useState, useEffect } from 'react';
import Icon from '../../../components/Icon';
import { supabase } from '../../../services/supabaseClient';
import TemplateEngineStats from './TemplateEngineStats';

// Icon paths
const iconPaths = {
  save: "M19 21H5c-1.1 0-2-.9-2-2V5c0-1.1.9-2 2-2h11l5 5v11c0 1.1-.9 2-2 2zM17 21v-8H7v8h10zM12 1L7 6h5V1z",
  edit: "M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z",
  delete: "M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z",
  add: "M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z",
  star: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  palette: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c1.1 0 2-.9 2-2 0-.55-.22-1.05-.59-1.41-.36-.36-.91-.59-1.41-.59H10c-1.1 0-2-.9-2-2v-1.17c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5V16h2v-1.17C13 13.24 14.24 12 15.83 12c.83 0 1.5-.67 1.5-1.5S16.66 9 15.83 9H15c-.55 0-1-.45-1-1s.45-1 1-1h.83c.83 0 1.5-.67 1.5-1.5S16.66 4.5 15.83 4.5C14.24 4.5 13 3.24 13 1.67 13 .74 12.26 0 11.33 0 5.48 0 1 4.48 1 12s4.48 12 10 12z",
  eye: "M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z",
  tag: "M5.5 7A1.5 1.5 0 0 1 4 5.5A1.5 1.5 0 0 1 5.5 4A1.5 1.5 0 0 1 7 5.5A1.5 1.5 0 0 1 5.5 7m15.91 4.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l8.99 8.99c.78.78 2.05.78 2.83 0l7-7c.78-.78.78-2.04 0-2.83z"
};

interface WeddingStyle {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  popularity: number;
  color_palette: string[];
  mood: string[];
  setting: string;
  prompt_modifiers: any[];
  style_variations: any[];
  preview_image?: string;
  inspiration_images: string[];
  enabled: boolean;
  featured: boolean;
  seasonal: boolean;
  premium_only: boolean;
  created_at: string;
  updated_at: string;
}

interface TemplateEngineStats {
  total_templates: number;
  enhanced_templates: number;
  total_styles: number;
  custom_themes: number;
  cache_entries: number;
  cache_hit_rate: number;
}

const ThemeManagement: React.FC = () => {
  const [styles, setStyles] = useState<WeddingStyle[]>([]);
  const [selectedStyle, setSelectedStyle] = useState<WeddingStyle | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editedStyle, setEditedStyle] = useState<Partial<WeddingStyle>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [stats, setStats] = useState<TemplateEngineStats | null>(null);
  const [filters, setFilters] = useState({
    category: '',
    enabled: '',
    featured: ''
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'themes' | 'packages' | 'stats'>('themes');
  const [packageThemes, setPackageThemes] = useState<any[]>([]);
  const [selectedPackageTheme, setSelectedPackageTheme] = useState<any | null>(null);
  const [editPackageThemeMode, setEditPackageThemeMode] = useState(false);
  const [selectedPackageFilter, setSelectedPackageFilter] = useState<string>('');

  useEffect(() => {
    loadStyles();
    loadStats();
    loadPackageThemes();
  }, []);


  const loadStyles = async () => {
    setLoading(true);
    try {
      let query = supabase.from('wedding_styles').select('*').order('popularity', { ascending: false });
      
      if (filters.category) {
        query = query.eq('category', filters.category);
      }
      if (filters.enabled !== '') {
        query = query.eq('enabled', filters.enabled === 'true');
      }
      if (filters.featured !== '') {
        query = query.eq('featured', filters.featured === 'true');
      }

      const { data, error } = await query;
      
      if (error) {
        // If wedding_styles table doesn't exist, show helpful message
        if (error.message.includes('relation "wedding_styles" does not exist') || 
            error.message.includes('Failed to fetch') ||
            error.code === '') {
          setError('Database migration required. Please deploy the enhanced template engine migration first.');
          setStyles([]);
          return;
        }
        throw error;
      }
      setStyles(data || []);
    } catch (error: any) {
      console.error('Failed to load wedding styles:', error);
      if (error.message.includes('Failed to fetch') || error.code === '') {
        setError('Cannot connect to database. Please check your connection and ensure the enhanced template engine migration has been deployed.');
      } else {
        setError('Failed to load wedding styles: ' + error.message);
      }
      setStyles([]);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const { data, error } = await supabase.rpc('get_template_engine_stats');
      if (error) {
        // If function doesn't exist, create mock stats
        if (error.message.includes('function') || error.message.includes('Failed to fetch')) {
          setStats({
            total_templates: 0,
            enhanced_templates: 0, 
            total_styles: 0,
            custom_themes: 0,
            cache_entries: 0,
            cache_hit_rate: 0
          });
          return;
        }
        throw error;
      }
      setStats(data[0] || null);
    } catch (error: any) {
      console.error('Failed to load stats:', error);
      // Set default stats if there's an error
      setStats({
        total_templates: 0,
        enhanced_templates: 0,
        total_styles: 0,
        custom_themes: 0,
        cache_entries: 0,
        cache_hit_rate: 0
      });
    }
  };

  const loadPackageThemes = async () => {
    try {
      const { data, error } = await supabase
        .from('package_themes')
        .select(`
          *,
          photo_packages!inner (
            id,
            name,
            slug,
            category
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Failed to load package themes:', error);
        setPackageThemes([]);
        return;
      }
      
      // Ensure unique themes by ID
      const uniqueThemes = (data || []).reduce((acc: any[], theme: any) => {
        if (!acc.find(t => t.id === theme.id)) {
          acc.push(theme);
        }
        return acc;
      }, []);
      setPackageThemes(uniqueThemes);
    } catch (error: any) {
      console.error('Failed to load package themes:', error);
      setPackageThemes([]);
    }
  };

  const savePackageTheme = async (themeData: any) => {
    setLoading(true);
    try {
      if (selectedPackageTheme?.id) {
        // Update existing theme
        const { data, error } = await supabase
          .from('package_themes')
          .update(themeData)
          .eq('id', selectedPackageTheme.id)
          .select()
          .single();
        
        if (error) throw error;
        
        // Update local state
        setPackageThemes(prev => 
          prev.map(theme => theme.id === selectedPackageTheme.id ? { ...theme, ...data } : theme)
        );
        setSuccess('Package theme updated successfully');
      } else {
        // Create new theme
        const { data, error } = await supabase
          .from('package_themes')
          .insert(themeData)
          .select()
          .single();
        
        if (error) throw error;
        
        // Add to local state
        setPackageThemes(prev => [data, ...prev]);
        setSuccess('Package theme created successfully');
      }
      
      setEditPackageThemeMode(false);
      setSelectedPackageTheme(null);
    } catch (error: any) {
      console.error('Failed to save package theme:', error);
      setError('Failed to save package theme: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const deletePackageTheme = async (themeId: string) => {
    if (!confirm('Are you sure you want to delete this package theme?')) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('package_themes')
        .delete()
        .eq('id', themeId);
      
      if (error) throw error;
      
      setPackageThemes(prev => prev.filter(theme => theme.id !== themeId));
      setSuccess('Package theme deleted successfully');
      
      if (selectedPackageTheme?.id === themeId) {
        setSelectedPackageTheme(null);
      }
    } catch (error: any) {
      console.error('Failed to delete package theme:', error);
      setError('Failed to delete package theme: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const saveStyle = async () => {
    if (!editedStyle.name || !editedStyle.description) {
      setError('Name and description are required');
      return;
    }

    setLoading(true);
    try {
      if (selectedStyle) {
        // Update existing style
        const { error } = await supabase
          .from('wedding_styles')
          .update({
            ...editedStyle,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedStyle.id);

        if (error) throw error;
        setSuccess('Style updated successfully');
      } else {
        // Create new style
        const { error } = await supabase
          .from('wedding_styles')
          .insert([{
            id: editedStyle.name?.toLowerCase().replace(/[^a-z0-9]/g, '-') || '',
            ...editedStyle,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]);

        if (error) throw error;
        setSuccess('Style created successfully');
        setShowCreateModal(false);
      }

      setEditMode(false);
      setSelectedStyle(null);
      setEditedStyle({});
      await loadStyles();
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Failed to save style:', error);
      setError(error.message || 'Failed to save style');
    } finally {
      setLoading(false);
    }
  };

  const deleteStyle = async (styleId: string) => {
    if (!confirm('Are you sure you want to delete this style? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('wedding_styles')
        .delete()
        .eq('id', styleId);

      if (error) throw error;
      
      setSuccess('Style deleted successfully');
      setSelectedStyle(null);
      await loadStyles();
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Failed to delete style:', error);
      setError(error.message || 'Failed to delete style');
    } finally {
      setLoading(false);
    }
  };

  const toggleStyleStatus = async (styleId: string, field: 'enabled' | 'featured' | 'seasonal' | 'premium_only', value: boolean) => {
    try {
      const { error } = await supabase
        .from('wedding_styles')
        .update({ [field]: value, updated_at: new Date().toISOString() })
        .eq('id', styleId);

      if (error) throw error;
      await loadStyles();
      setSuccess(`Style ${field} status updated`);
      setTimeout(() => setSuccess(null), 2000);
    } catch (error: any) {
      console.error(`Failed to update ${field}:`, error);
      setError(error.message || `Failed to update ${field}`);
    }
  };

  const categories = ['traditional', 'modern', 'vintage', 'themed', 'seasonal', 'cultural', 'fantasy', 'luxury'];

  const startEdit = (style: WeddingStyle) => {
    setSelectedStyle(style);
    setEditedStyle({ ...style });
    setEditMode(true);
  };

  const startCreate = () => {
    setEditedStyle({
      name: '',
      description: '',
      category: 'modern',
      tags: [],
      popularity: 5,
      color_palette: [],
      mood: [],
      setting: '',
      prompt_modifiers: [],
      style_variations: [],
      inspiration_images: [],
      enabled: true,
      featured: false,
      seasonal: false,
      premium_only: false
    });
    setShowCreateModal(true);
    setEditMode(true);
  };

  const getUniqueCategories = () => {
    const uniqueCategories = [...new Set(styles.map(s => s.category))];
    return uniqueCategories.sort();
  };

  // Package Theme Edit Modal
  const PackageThemeEditModal = () => {
    if (editPackageThemeMode && activeTab === 'packages') {
      return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg border border-gray-700 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-white">
                  {selectedPackageTheme ? 'Edit Package Theme' : 'Create New Package Theme'}
                </h3>
                <button
                  onClick={() => {
                    setEditPackageThemeMode(false);
                    setSelectedPackageTheme(null);
                  }}
                  className="text-gray-400 hover:text-gray-300"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target as HTMLFormElement);
                const themeData = {
                  package_id: formData.get('package_id'),
                  name: formData.get('name'),
                  description: formData.get('description'),
                  setting_prompt: formData.get('setting_prompt'),
                  clothing_prompt: formData.get('clothing_prompt'),
                  atmosphere_prompt: formData.get('atmosphere_prompt'),
                  technical_prompt: formData.get('technical_prompt'),
                  is_active: formData.get('is_active') === 'on',
                  is_premium: formData.get('is_premium') === 'on',
                  popularity_score: parseInt(formData.get('popularity_score') as string) || 0,
                };
                savePackageTheme(themeData);
              }}>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Package *</label>
                      <select
                        name="package_id"
                        defaultValue={selectedPackageTheme?.package_id || ''}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                        required
                      >
                        <option value="">Select a package</option>
                        {(() => {
                          // Properly deduplicate packages by ID
                          const uniquePackages = packageThemes
                            .map(t => t.photo_packages)
                            .filter(Boolean)
                            .reduce((acc: any[], pkg: any) => {
                              if (!acc.find(p => p.id === pkg.id)) {
                                acc.push(pkg);
                              }
                              return acc;
                            }, []);
                          
                          return uniquePackages.map((pkg: any) => (
                            <option key={pkg.id} value={pkg.id}>
                              {pkg.name} ({pkg.category})
                            </option>
                          ));
                        })()}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Name *</label>
                      <input
                        type="text"
                        name="name"
                        defaultValue={selectedPackageTheme?.name || ''}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                        placeholder="e.g., Classic Romance"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                      <textarea
                        name="description"
                        defaultValue={selectedPackageTheme?.description || ''}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                        rows={3}
                        placeholder="Brief description of the theme"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Popularity Score</label>
                        <input
                          type="number"
                          name="popularity_score"
                          defaultValue={selectedPackageTheme?.popularity_score || 5}
                          min="0"
                          max="10"
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            name="is_active"
                            defaultChecked={selectedPackageTheme?.is_active ?? true}
                            className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-300">Active</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            name="is_premium"
                            defaultChecked={selectedPackageTheme?.is_premium ?? false}
                            className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-300">Premium</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Setting Prompt</label>
                      <textarea
                        name="setting_prompt"
                        defaultValue={selectedPackageTheme?.setting_prompt || ''}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                        rows={4}
                        placeholder="Describe the setting and environment..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Clothing Prompt</label>
                      <textarea
                        name="clothing_prompt"
                        defaultValue={selectedPackageTheme?.clothing_prompt || ''}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                        rows={4}
                        placeholder="Describe the attire and styling..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Atmosphere Prompt</label>
                      <textarea
                        name="atmosphere_prompt"
                        defaultValue={selectedPackageTheme?.atmosphere_prompt || ''}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                        rows={3}
                        placeholder="Describe the mood and feeling..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Technical Prompt</label>
                      <textarea
                        name="technical_prompt"
                        defaultValue={selectedPackageTheme?.technical_prompt || ''}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                        rows={3}
                        placeholder="Describe technical photography aspects..."
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-6 border-t border-gray-700">
                  <button
                    type="button"
                    onClick={() => {
                      setEditPackageThemeMode(false);
                      setSelectedPackageTheme(null);
                    }}
                    className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    <Icon path={iconPaths.save} className="w-4 h-4 mr-2" />
                    {loading ? 'Saving...' : (selectedPackageTheme ? 'Update Theme' : 'Create Theme')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-6 space-y-6">
      <PackageThemeEditModal />
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Theme Management</h1>
          <p className="text-gray-400 mt-2">Manage wedding styles and themes for the enhanced template engine</p>
        </div>
        <div className="flex space-x-3 mt-4 md:mt-0">
          <div className="flex bg-gray-700 rounded-lg">
            <button
              onClick={() => setActiveTab('themes')}
              className={`px-4 py-2 text-sm font-medium rounded-l-lg transition-colors ${
                activeTab === 'themes'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              Legacy Themes
            </button>
            <button
              onClick={() => setActiveTab('packages')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'packages'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              Package Themes
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`px-4 py-2 text-sm font-medium rounded-r-lg transition-colors ${
                activeTab === 'stats'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              Statistics
            </button>
          </div>
          {activeTab === 'themes' && (
            <button
              onClick={startCreate}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 text-sm flex items-center"
            >
              <Icon path={iconPaths.add} className="w-4 h-4 mr-2" />
              Create Style
            </button>
          )}
          {activeTab === 'packages' && (
            <button
              onClick={() => {
                setSelectedPackageTheme(null);
                setEditPackageThemeMode(true);
              }}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 text-sm flex items-center"
            >
              <Icon path={iconPaths.add} className="w-4 h-4 mr-2" />
              Create Package Theme
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-900/50 border border-red-500 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-red-200 font-medium">Database Connection Error</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">✕</button>
          </div>
          <p className="text-red-200 text-sm mb-3">{error}</p>
          {error.includes('migration') && (
            <div className="bg-red-800/30 rounded-lg p-3 text-sm text-red-100">
              <p className="font-medium mb-2">🔧 Quick Fix:</p>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>Run the migration deployment script: <code className="bg-red-700 px-1 rounded">node scripts/deploy-template-engine-migration.js</code></li>
                <li>Or manually run: <code className="bg-red-700 px-1 rounded">npx supabase migration new enhanced_template_engine</code></li>
                <li>Copy content from <code className="bg-red-700 px-1 rounded">supabase/migrations/20250917_enhanced_template_engine.sql</code></li>
                <li>Deploy with: <code className="bg-red-700 px-1 rounded">npx supabase db push</code></li>
              </ol>
            </div>
          )}
        </div>
      )}

      {success && (
        <div className="bg-green-900/50 border border-green-500 rounded-lg p-4 flex items-center justify-between">
          <span className="text-green-200">{success}</span>
          <button onClick={() => setSuccess(null)} className="text-green-400 hover:text-green-300">✕</button>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'stats' ? (
        <TemplateEngineStats />
      ) : activeTab === 'packages' ? (
        <div className="space-y-6">
          {/* Package Themes Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="text-2xl font-bold text-purple-400">{packageThemes.length}</div>
              <div className="text-sm text-gray-400">Total Package Themes</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="text-2xl font-bold text-blue-400">{packageThemes.filter(t => t.is_active).length}</div>
              <div className="text-sm text-gray-400">Active Themes</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="text-2xl font-bold text-yellow-400">{packageThemes.filter(t => t.is_premium).length}</div>
              <div className="text-sm text-gray-400">Premium Themes</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="text-2xl font-bold text-green-400">{new Set(packageThemes.map(t => t.photo_packages?.category).filter(Boolean)).size}</div>
              <div className="text-sm text-gray-400">Package Categories</div>
            </div>
          </div>

          {/* Package Themes List */}
          <div className="bg-gray-800 rounded-lg border border-gray-700">
            <div className="p-6 border-b border-gray-700 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">Package Themes</h3>
                <p className="text-gray-400 text-sm mt-1">Manage themes for photo packages</p>
              </div>
              <button
                onClick={() => {
                  setSelectedPackageTheme(null);
                  setEditPackageThemeMode(true);
                }}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center"
              >
                <Icon path={iconPaths.add} className="w-4 h-4 mr-2" />
                New Theme
              </button>
            </div>
            <div className="p-6">
              {/* Package Filter */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">Filter by Package</label>
                <select
                  value={selectedPackageFilter}
                  onChange={(e) => setSelectedPackageFilter(e.target.value)}
                  className="w-64 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="">All Packages</option>
                  {(() => {
                    // Get unique packages for filter
                    const uniquePackages = packageThemes
                      .map(t => t.photo_packages)
                      .filter(Boolean)
                      .reduce((acc: any[], pkg: any) => {
                        if (!acc.find(p => p.id === pkg.id)) {
                          acc.push(pkg);
                        }
                        return acc;
                      }, []);
                    
                    return uniquePackages.map((pkg: any) => (
                      <option key={pkg.id} value={pkg.id}>
                        {pkg.name}
                      </option>
                    ));
                  })()}
                </select>
              </div>

              {packageThemes.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Icon path={iconPaths.palette} className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No package themes found</p>
                  <p className="text-sm mt-1">Create your first package theme to get started</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  {/* Package Themes List */}
                  <div className="lg:col-span-1 bg-gray-700 rounded-lg border border-gray-600 p-4">
                    <h4 className="text-md font-semibold text-white mb-4">
                      Package Themes ({packageThemes.filter(theme => !selectedPackageFilter || theme.package_id === selectedPackageFilter).length})
                    </h4>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {packageThemes
                        .filter(theme => !selectedPackageFilter || theme.package_id === selectedPackageFilter)
                        .map((theme) => (
                        <div
                          key={theme.id}
                          onClick={() => setSelectedPackageTheme(theme)}
                          className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                            selectedPackageTheme?.id === theme.id
                              ? 'border-purple-500 bg-purple-900/20'
                              : 'border-gray-500 bg-gray-600 hover:border-gray-400'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h5 className="font-medium text-white text-sm truncate">{theme.name}</h5>
                              <div className="flex flex-col space-y-1 mt-1">
                                <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded w-fit">
                                  {theme.photo_packages?.name}
                                </span>
                                <span className="text-xs text-gray-300">Score: {theme.popularity_score || 5}</span>
                              </div>
                            </div>
                            <div className="flex flex-col space-y-1 ml-2">
                              {theme.is_active && (
                                <div className="w-2 h-2 bg-green-500 rounded-full" title="Active" />
                              )}
                              {theme.is_premium && (
                                <Icon path={iconPaths.star} className="w-3 h-3 text-yellow-500" title="Premium" />
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Package Theme Details */}
                  <div className="lg:col-span-3 bg-gray-700 rounded-lg border border-gray-600 p-6">
                    {selectedPackageTheme ? (
                      <div className="space-y-6">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-xl font-semibold text-white">{selectedPackageTheme.name}</h4>
                            <p className="text-gray-400 text-sm mt-1">{selectedPackageTheme.description}</p>
                            <p className="text-purple-400 text-sm mt-1">{selectedPackageTheme.photo_packages?.name} Package</p>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => setEditPackageThemeMode(true)}
                              className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 text-sm flex items-center"
                            >
                              <Icon path={iconPaths.edit} className="w-4 h-4 mr-2" />
                              Edit
                            </button>
                            <button
                              onClick={() => deletePackageTheme(selectedPackageTheme.id)}
                              className="bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 text-sm flex items-center"
                            >
                              <Icon path={iconPaths.delete} className="w-4 h-4 mr-2" />
                              Delete
                            </button>
                          </div>
                        </div>

                        {/* Theme Details Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <div>
                              <h5 className="font-medium text-white mb-2">Setting Prompt</h5>
                              <div className="bg-gray-800 rounded-lg p-3">
                                <p className="text-gray-300 text-sm">{selectedPackageTheme.setting_prompt || 'No setting prompt'}</p>
                              </div>
                            </div>

                            <div>
                              <h5 className="font-medium text-white mb-2">Clothing Prompt</h5>
                              <div className="bg-gray-800 rounded-lg p-3">
                                <p className="text-gray-300 text-sm">{selectedPackageTheme.clothing_prompt || 'No clothing prompt'}</p>
                              </div>
                            </div>

                            <div>
                              <h5 className="font-medium text-white mb-2">Atmosphere Prompt</h5>
                              <div className="bg-gray-800 rounded-lg p-3">
                                <p className="text-gray-300 text-sm">{selectedPackageTheme.atmosphere_prompt || 'No atmosphere prompt'}</p>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div>
                              <h5 className="font-medium text-white mb-2">Technical Prompt</h5>
                              <div className="bg-gray-800 rounded-lg p-3">
                                <p className="text-gray-300 text-sm">{selectedPackageTheme.technical_prompt || 'No technical prompt'}</p>
                              </div>
                            </div>

                            <div>
                              <h5 className="font-medium text-white mb-2">Style Modifiers</h5>
                              <div className="bg-gray-800 rounded-lg p-3">
                                <div className="flex flex-wrap gap-1">
                                  {(selectedPackageTheme.style_modifiers || []).map((modifier: string, idx: number) => (
                                    <span key={idx} className="bg-purple-600 text-white px-2 py-1 rounded text-xs">
                                      {modifier}
                                    </span>
                                  ))}
                                  {(!selectedPackageTheme.style_modifiers || selectedPackageTheme.style_modifiers.length === 0) && (
                                    <span className="text-gray-400 text-sm">No style modifiers</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div>
                              <h5 className="font-medium text-white mb-2">Color Palette</h5>
                              <div className="bg-gray-800 rounded-lg p-3">
                                <div className="flex flex-wrap gap-2">
                                  {(selectedPackageTheme.color_palette || []).map((color: string, idx: number) => (
                                    <div key={idx} className="flex items-center space-x-2">
                                      <div 
                                        className="w-4 h-4 rounded border border-gray-600"
                                        style={{ backgroundColor: color.startsWith('#') ? color : `var(--color-${color})` }}
                                      />
                                      <span className="text-white text-sm">{color}</span>
                                    </div>
                                  ))}
                                  {(!selectedPackageTheme.color_palette || selectedPackageTheme.color_palette.length === 0) && (
                                    <span className="text-gray-400 text-sm">No color palette</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div>
                              <h5 className="font-medium text-white mb-2">Theme Information</h5>
                              <div className="bg-gray-800 rounded-lg p-3 space-y-2">
                                <div className="flex justify-between">
                                  <span className="text-gray-400 text-sm">Popularity Score:</span>
                                  <span className="text-white text-sm">{selectedPackageTheme.popularity_score || 5}/10</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400 text-sm">Sort Order:</span>
                                  <span className="text-white text-sm">{selectedPackageTheme.sort_order || 0}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400 text-sm">Status:</span>
                                  <span className={`text-sm ${selectedPackageTheme.is_active ? 'text-green-400' : 'text-red-400'}`}>
                                    {selectedPackageTheme.is_active ? 'Active' : 'Inactive'}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400 text-sm">Premium:</span>
                                  <span className={`text-sm ${selectedPackageTheme.is_premium ? 'text-yellow-400' : 'text-gray-400'}`}>
                                    {selectedPackageTheme.is_premium ? 'Yes' : 'No'}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400 text-sm">Created:</span>
                                  <span className="text-white text-sm">{new Date(selectedPackageTheme.created_at).toLocaleDateString()}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12 text-gray-400">
                        <Icon path={iconPaths.palette} className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <h4 className="text-lg font-medium text-white mb-2">Select a Package Theme</h4>
                        <p className="text-gray-400">Choose a theme from the list to view and edit its details</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Legacy Themes Stats Cards */}
          {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="text-2xl font-bold text-purple-400">{stats.total_styles}</div>
            <div className="text-sm text-gray-400">Total Styles</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="text-2xl font-bold text-blue-400">{styles.filter(s => s.enabled).length}</div>
            <div className="text-sm text-gray-400">Enabled</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="text-2xl font-bold text-yellow-400">{styles.filter(s => s.featured).length}</div>
            <div className="text-sm text-gray-400">Featured</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="text-2xl font-bold text-green-400">{stats.custom_themes}</div>
            <div className="text-sm text-gray-400">Custom Themes</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="text-2xl font-bold text-cyan-400">{stats.cache_entries}</div>
            <div className="text-sm text-gray-400">Cache Entries</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="text-2xl font-bold text-orange-400">{Math.round(stats.cache_hit_rate * 100)}%</div>
            <div className="text-sm text-gray-400">Cache Hit Rate</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
        <h3 className="text-lg font-semibold text-white mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
            <select
              value={filters.category}
              onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
            >
              <option value="">All Categories</option>
              {getUniqueCategories().map(category => (
                <option key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
            <select
              value={filters.enabled}
              onChange={(e) => setFilters(prev => ({ ...prev, enabled: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
            >
              <option value="">All Styles</option>
              <option value="true">Enabled Only</option>
              <option value="false">Disabled Only</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Featured</label>
            <select
              value={filters.featured}
              onChange={(e) => setFilters(prev => ({ ...prev, featured: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
            >
              <option value="">All Styles</option>
              <option value="true">Featured Only</option>
              <option value="false">Non-Featured Only</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={loadStyles}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      {/* Styles Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Styles List */}
        <div className="lg:col-span-1 bg-gray-800 rounded-lg border border-gray-700 p-4">
          <h3 className="text-lg font-semibold text-white mb-4">Wedding Styles ({styles.length})</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {styles.map(style => (
              <div
                key={style.id}
                onClick={() => setSelectedStyle(style)}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedStyle?.id === style.id
                    ? 'border-purple-500 bg-purple-900/20'
                    : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-white text-sm truncate">{style.name}</h4>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded">
                        {style.category}
                      </span>
                      <span className="text-xs text-gray-400">Pop: {style.popularity}</span>
                    </div>
                  </div>
                  <div className="flex flex-col space-y-1 ml-2">
                    {style.enabled && (
                      <div className="w-2 h-2 bg-green-500 rounded-full" title="Enabled" />
                    )}
                    {style.featured && (
                      <Icon path={iconPaths.star} className="w-3 h-3 text-yellow-500" title="Featured" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Style Details */}
        <div className="lg:col-span-3 bg-gray-800 rounded-lg border border-gray-700 p-6">
          {selectedStyle ? (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-white">{selectedStyle.name}</h3>
                  <p className="text-gray-400 text-sm mt-1">{selectedStyle.description}</p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => startEdit(selectedStyle)}
                    className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 text-sm flex items-center"
                  >
                    <Icon path={iconPaths.edit} className="w-4 h-4 mr-2" />
                    Edit
                  </button>
                  <button
                    onClick={() => deleteStyle(selectedStyle.id)}
                    className="bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 text-sm flex items-center"
                  >
                    <Icon path={iconPaths.delete} className="w-4 h-4 mr-2" />
                    Delete
                  </button>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => toggleStyleStatus(selectedStyle.id, 'enabled', !selectedStyle.enabled)}
                  className={`px-3 py-1 rounded text-sm ${
                    selectedStyle.enabled
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                  }`}
                >
                  {selectedStyle.enabled ? 'Enabled' : 'Disabled'}
                </button>
                <button
                  onClick={() => toggleStyleStatus(selectedStyle.id, 'featured', !selectedStyle.featured)}
                  className={`px-3 py-1 rounded text-sm ${
                    selectedStyle.featured
                      ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                      : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                  }`}
                >
                  {selectedStyle.featured ? 'Featured' : 'Not Featured'}
                </button>
                <button
                  onClick={() => toggleStyleStatus(selectedStyle.id, 'seasonal', !selectedStyle.seasonal)}
                  className={`px-3 py-1 rounded text-sm ${
                    selectedStyle.seasonal
                      ? 'bg-cyan-600 text-white hover:bg-cyan-700'
                      : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                  }`}
                >
                  {selectedStyle.seasonal ? 'Seasonal' : 'Year-round'}
                </button>
                <button
                  onClick={() => toggleStyleStatus(selectedStyle.id, 'premium_only', !selectedStyle.premium_only)}
                  className={`px-3 py-1 rounded text-sm ${
                    selectedStyle.premium_only
                      ? 'bg-purple-600 text-white hover:bg-purple-700'
                      : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                  }`}
                >
                  {selectedStyle.premium_only ? 'Premium' : 'Free'}
                </button>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-white mb-2">Basic Information</h4>
                    <div className="bg-gray-900 rounded-lg p-3 space-y-2 text-sm">
                      <div><span className="text-gray-400">Category:</span> <span className="text-white">{selectedStyle.category}</span></div>
                      <div><span className="text-gray-400">Popularity:</span> <span className="text-white">{selectedStyle.popularity}/10</span></div>
                      <div><span className="text-gray-400">Setting:</span> <span className="text-white">{selectedStyle.setting || 'Not specified'}</span></div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-white mb-2">Color Palette</h4>
                    <div className="bg-gray-900 rounded-lg p-3">
                      <div className="flex flex-wrap gap-2">
                        {selectedStyle.color_palette.map((color, idx) => (
                          <div key={idx} className="flex items-center space-x-2">
                            <div 
                              className="w-4 h-4 rounded border border-gray-600"
                              style={{ backgroundColor: color }}
                            />
                            <span className="text-white text-sm">{color}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-white mb-2">Tags & Moods</h4>
                    <div className="bg-gray-900 rounded-lg p-3 space-y-2">
                      <div>
                        <span className="text-gray-400 text-sm">Tags:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedStyle.tags.map((tag, idx) => (
                            <span key={idx} className="bg-blue-600 text-white px-2 py-1 rounded text-xs">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-400 text-sm">Moods:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedStyle.mood.map((mood, idx) => (
                            <span key={idx} className="bg-green-600 text-white px-2 py-1 rounded text-xs">
                              {mood}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-white mb-2">Metadata</h4>
                    <div className="bg-gray-900 rounded-lg p-3 space-y-1 text-sm">
                      <div><span className="text-gray-400">Created:</span> <span className="text-white">{new Date(selectedStyle.created_at).toLocaleDateString()}</span></div>
                      <div><span className="text-gray-400">Updated:</span> <span className="text-white">{new Date(selectedStyle.updated_at).toLocaleDateString()}</span></div>
                      <div><span className="text-gray-400">Prompt Modifiers:</span> <span className="text-white">{selectedStyle.prompt_modifiers.length}</span></div>
                      <div><span className="text-gray-400">Style Variations:</span> <span className="text-white">{selectedStyle.style_variations.length}</span></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-400 py-12">
              <Icon path={iconPaths.palette} className="w-16 h-16 mx-auto mb-4 text-gray-600" />
              <h3 className="text-lg font-medium mb-2">No Style Selected</h3>
              <p>Select a wedding style from the list to view and manage its details</p>
            </div>
          )}
        </div>
      </div>

      {/* Edit/Create Modal */}
      {(editMode || showCreateModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg border border-gray-700 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-white">
                  {selectedStyle ? 'Edit Style' : 'Create New Style'}
                </h3>
                <button
                  onClick={() => {
                    setEditMode(false);
                    setShowCreateModal(false);
                    setEditedStyle({});
                  }}
                  className="text-gray-400 hover:text-gray-300"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Name *</label>
                    <input
                      type="text"
                      value={editedStyle.name || ''}
                      onChange={(e) => setEditedStyle(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                      placeholder="e.g., Romantic Garden Wedding"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Description *</label>
                    <textarea
                      value={editedStyle.description || ''}
                      onChange={(e) => setEditedStyle(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                      placeholder="Describe the style and atmosphere..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
                    <select
                      value={editedStyle.category || 'modern'}
                      onChange={(e) => setEditedStyle(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat}>
                          {cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Popularity (1-10)</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={editedStyle.popularity || 5}
                      onChange={(e) => setEditedStyle(prev => ({ ...prev, popularity: parseInt(e.target.value) || 5 }))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Setting</label>
                    <textarea
                      value={editedStyle.setting || ''}
                      onChange={(e) => setEditedStyle(prev => ({ ...prev, setting: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                      placeholder="Describe the physical setting/venue..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Tags (comma-separated)</label>
                    <input
                      type="text"
                      value={editedStyle.tags?.join(', ') || ''}
                      onChange={(e) => setEditedStyle(prev => ({ 
                        ...prev, 
                        tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                      }))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                      placeholder="romantic, elegant, outdoor"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Moods (comma-separated)</label>
                    <input
                      type="text"
                      value={editedStyle.mood?.join(', ') || ''}
                      onChange={(e) => setEditedStyle(prev => ({ 
                        ...prev, 
                        mood: e.target.value.split(',').map(m => m.trim()).filter(Boolean)
                      }))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                      placeholder="romantic, relaxed, dramatic"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Color Palette (hex codes, comma-separated)</label>
                    <input
                      type="text"
                      value={editedStyle.color_palette?.join(', ') || ''}
                      onChange={(e) => setEditedStyle(prev => ({ 
                        ...prev, 
                        color_palette: e.target.value.split(',').map(c => c.trim()).filter(Boolean)
                      }))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                      placeholder="#FFFFFF, #F8F8FF, #E6E6FA"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={editedStyle.enabled || false}
                    onChange={(e) => setEditedStyle(prev => ({ ...prev, enabled: e.target.checked }))}
                    className="rounded bg-gray-700 border-gray-600"
                  />
                  <span className="text-gray-300">Enabled</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={editedStyle.featured || false}
                    onChange={(e) => setEditedStyle(prev => ({ ...prev, featured: e.target.checked }))}
                    className="rounded bg-gray-700 border-gray-600"
                  />
                  <span className="text-gray-300">Featured</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={editedStyle.seasonal || false}
                    onChange={(e) => setEditedStyle(prev => ({ ...prev, seasonal: e.target.checked }))}
                    className="rounded bg-gray-700 border-gray-600"
                  />
                  <span className="text-gray-300">Seasonal</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={editedStyle.premium_only || false}
                    onChange={(e) => setEditedStyle(prev => ({ ...prev, premium_only: e.target.checked }))}
                    className="rounded bg-gray-700 border-gray-600"
                  />
                  <span className="text-gray-300">Premium Only</span>
                </label>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setEditMode(false);
                    setShowCreateModal(false);
                    setEditedStyle({});
                  }}
                  className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={saveStyle}
                  disabled={loading || !editedStyle.name || !editedStyle.description}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  <Icon path={iconPaths.save} className="w-4 h-4 mr-2" />
                  {loading ? 'Saving...' : (selectedStyle ? 'Update Style' : 'Create Style')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

        </>
      )}
    </div>
  );
};

export default ThemeManagement;