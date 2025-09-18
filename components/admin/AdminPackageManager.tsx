import React, { useState, useEffect } from 'react';
import { PhotoPackagesService, Package, PackageTheme, PackagePricingTier, PackageCategory } from '../../services/photoPackagesService';
import { LoadingSpinner } from './LoadingSpinner';
import { AlertNotification } from './AlertNotification';

interface AdminPackageManagerProps {
  user: any;
}

export default function AdminPackageManager({ user }: AdminPackageManagerProps) {
  const [activeTab, setActiveTab] = useState<'packages' | 'categories' | 'themes' | 'analytics'>('packages');
  const [packages, setPackages] = useState<Package[]>([]);
  const [categories, setCategories] = useState<PackageCategory[]>([]);
  const [themes, setThemes] = useState<PackageTheme[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createType, setCreateType] = useState<'package' | 'category' | 'theme' | null>(null);

  // Form states
  const [packageForm, setPackageForm] = useState({
    name: '',
    description: '',
    category_id: '',
    image_count: 3,
    max_uploads: 1,
    dimensions: { width: 1024, height: 1024 },
    quality_settings: { format: 'jpeg', compression: 85 },
    tags: [] as string[],
    target_audience: [] as string[],
    use_cases: [] as string[],
    status: 'active' as const,
    visibility: 'public' as const,
    featured: false,
    trending: false,
    version: '1.0'
  });

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    display_order: 1,
    icon: '',
    color_scheme: {},
    enabled: true,
    featured: false
  });

  const [themeForm, setThemeForm] = useState({
    package_id: '',
    name: '',
    description: '',
    base_style_id: '',
    style_overrides: {},
    prompt_template: '',
    prompt_variables: {},
    conditional_sections: [],
    preview_image: '',
    color_palette: [] as string[],
    mood_tags: [] as string[],
    category: '',
    subcategory: '',
    style_complexity: 'standard' as const,
    enabled: true,
    premium_only: false,
    beta_feature: false,
    seasonal: false,
    season_tags: [] as string[],
    generation_time_estimate: 30,
    quality_score: 80,
    popularity_score: 50
  });

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      switch (activeTab) {
        case 'packages':
          const packagesData = await PhotoPackagesService.getPackages();
          setPackages(packagesData);
          break;
        case 'categories':
          const categoriesData = await PhotoPackagesService.getPackageCategories(false);
          setCategories(categoriesData);
          break;
        case 'themes':
          if (selectedPackage) {
            const themesData = await PhotoPackagesService.getPackageThemes(selectedPackage.id, false);
            setThemes(themesData);
          }
          break;
        case 'analytics':
          // Load analytics data
          break;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePackage = async () => {
    try {
      setSaving(true);
      setError(null);

      // Here you would call your admin API to create the package
      // For now, we'll simulate success
      setSuccess('Package created successfully!');
      setShowCreateModal(false);
      resetForms();
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create package');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateCategory = async () => {
    try {
      setSaving(true);
      setError(null);

      // Here you would call your admin API to create the category
      setSuccess('Category created successfully!');
      setShowCreateModal(false);
      resetForms();
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create category');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateTheme = async () => {
    try {
      setSaving(true);
      setError(null);

      // Here you would call your admin API to create the theme
      setSuccess('Theme created successfully!');
      setShowCreateModal(false);
      resetForms();
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create theme');
    } finally {
      setSaving(false);
    }
  };

  const resetForms = () => {
    setPackageForm({
      name: '',
      description: '',
      category_id: '',
      image_count: 3,
      max_uploads: 1,
      dimensions: { width: 1024, height: 1024 },
      quality_settings: { format: 'jpeg', compression: 85 },
      tags: [],
      target_audience: [],
      use_cases: [],
      status: 'active',
      visibility: 'public',
      featured: false,
      trending: false,
      version: '1.0'
    });
    setCategoryForm({
      name: '',
      description: '',
      display_order: 1,
      icon: '',
      color_scheme: {},
      enabled: true,
      featured: false
    });
    setThemeForm({
      package_id: '',
      name: '',
      description: '',
      base_style_id: '',
      style_overrides: {},
      prompt_template: '',
      prompt_variables: {},
      conditional_sections: [],
      preview_image: '',
      color_palette: [],
      mood_tags: [],
      category: '',
      subcategory: '',
      style_complexity: 'standard',
      enabled: true,
      premium_only: false,
      beta_feature: false,
      seasonal: false,
      season_tags: [],
      generation_time_estimate: 30,
      quality_score: 80,
      popularity_score: 50
    });
  };

  const openCreateModal = (type: 'package' | 'category' | 'theme') => {
    setCreateType(type);
    setShowCreateModal(true);
    resetForms();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Package Management
        </h2>
      </div>

      {/* Alerts */}
      {error && (
        <AlertNotification
          type="error"
          message={error}
          onClose={() => setError(null)}
        />
      )}
      
      {success && (
        <AlertNotification
          type="success"
          message={success}
          onClose={() => setSuccess(null)}
        />
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'packages', name: 'Packages', count: packages.length },
            { id: 'categories', name: 'Categories', count: categories.length },
            { id: 'themes', name: 'Themes', count: themes.length },
            { id: 'analytics', name: 'Analytics', count: 0 }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              {tab.name}
              {tab.count > 0 && (
                <span className="ml-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-300 py-0.5 px-2 rounded-full text-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Packages Tab */}
      {activeTab === 'packages' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Photo Packages
            </h3>
            <button
              onClick={() => openCreateModal('package')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Package
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3"
              >
                <div className="flex justify-between items-start">
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    {pkg.name}
                  </h4>
                  <div className="flex space-x-1">
                    {pkg.featured && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                        Featured
                      </span>
                    )}
                    {pkg.trending && (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                        Trending
                      </span>
                    )}
                  </div>
                </div>

                {pkg.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {pkg.description}
                  </p>
                )}

                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Status:</span>
                    <span className={`capitalize ${
                      pkg.status === 'active' ? 'text-green-600' : 'text-gray-600'
                    }`}>
                      {pkg.status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Images:</span>
                    <span>{pkg.image_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Visibility:</span>
                    <span className="capitalize">{pkg.visibility}</span>
                  </div>
                </div>

                <div className="flex space-x-2 pt-2">
                  <button
                    onClick={() => setSelectedPackage(pkg)}
                    className="flex-1 px-3 py-1 text-sm bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
                  >
                    View Themes
                  </button>
                  <button className="flex-1 px-3 py-1 text-sm bg-gray-50 text-gray-700 rounded hover:bg-gray-100 transition-colors">
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Package Categories
            </h3>
            <button
              onClick={() => openCreateModal('category')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Category
            </button>
          </div>

          <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {categories.map((category) => (
                <li key={category.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {category.icon && (
                        <span className="text-2xl mr-3">{category.icon}</span>
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {category.name}
                        </p>
                        {category.description && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {category.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">
                        Order: {category.display_order}
                      </span>
                      {category.featured && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                          Featured
                        </span>
                      )}
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        category.enabled 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {category.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Themes Tab */}
      {activeTab === 'themes' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Package Themes
              {selectedPackage && (
                <span className="ml-2 text-sm text-gray-500">
                  for {selectedPackage.name}
                </span>
              )}
            </h3>
            <div className="space-x-2">
              {selectedPackage && (
                <button
                  onClick={() => openCreateModal('theme')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Theme
                </button>
              )}
            </div>
          </div>

          {!selectedPackage ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              Select a package from the Packages tab to view its themes
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {themes.map((theme) => (
                <div
                  key={theme.id}
                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3"
                >
                  <div className="flex justify-between items-start">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {theme.name}
                    </h4>
                    <div className="flex flex-col space-y-1">
                      {theme.premium_only && (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                          Premium
                        </span>
                      )}
                      {theme.beta_feature && (
                        <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                          Beta
                        </span>
                      )}
                    </div>
                  </div>

                  {theme.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {theme.description}
                    </p>
                  )}

                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Category:</span>
                      <span>{theme.category}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Complexity:</span>
                      <span className="capitalize">{theme.style_complexity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Quality:</span>
                      <span>{theme.quality_score}/100</span>
                    </div>
                  </div>

                  {theme.mood_tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {theme.mood_tags.slice(0, 3).map((tag, index) => (
                        <span 
                          key={index}
                          className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex space-x-2 pt-2">
                    <button className="flex-1 px-3 py-1 text-sm bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors">
                      Edit
                    </button>
                    <button className="flex-1 px-3 py-1 text-sm bg-gray-50 text-gray-700 rounded hover:bg-gray-100 transition-colors">
                      Preview
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Package Analytics
          </h3>
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            Analytics dashboard coming soon...
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Create {createType?.charAt(0).toUpperCase()}{createType?.slice(1)}
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ✕
              </button>
            </div>

            {/* Package Form */}
            {createType === 'package' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Package Name
                  </label>
                  <input
                    type="text"
                    value={packageForm.name}
                    onChange={(e) => setPackageForm({ ...packageForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Enter package name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <textarea
                    value={packageForm.description}
                    onChange={(e) => setPackageForm({ ...packageForm, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    rows={3}
                    placeholder="Enter package description"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Image Count
                    </label>
                    <input
                      type="number"
                      value={packageForm.image_count}
                      onChange={(e) => setPackageForm({ ...packageForm, image_count: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      min="1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Max Uploads
                    </label>
                    <input
                      type="number"
                      value={packageForm.max_uploads}
                      onChange={(e) => setPackageForm({ ...packageForm, max_uploads: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      min="1"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={packageForm.featured}
                      onChange={(e) => setPackageForm({ ...packageForm, featured: e.target.checked })}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Featured</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={packageForm.trending}
                      onChange={(e) => setPackageForm({ ...packageForm, trending: e.target.checked })}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Trending</span>
                  </label>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreatePackage}
                    disabled={saving || !packageForm.name}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {saving ? 'Creating...' : 'Create Package'}
                  </button>
                </div>
              </div>
            )}

            {/* Similar forms would be added for categories and themes */}
          </div>
        </div>
      )}
    </div>
  );
}