import React, { useState, useEffect } from 'react';
import { PhotoPackagesService, Package, PackageTheme, PackagePricingTier } from '../../services/photoPackagesService';
import LoadingSpinner from '../../components/admin/LoadingSpinner';
import AlertNotification from '../../components/admin/AlertNotification';

interface PackageManagementProps {
  className?: string;
}

export default function PackageManagement({ className = '' }: PackageManagementProps) {
  const [packages, setPackages] = useState<Package[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [packageThemes, setPackageThemes] = useState<PackageTheme[]>([]);
  const [pricingTiers, setPricingTiers] = useState<PackagePricingTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'packages' | 'themes' | 'pricing'>('packages');
  const [isEditingPackage, setIsEditingPackage] = useState(false);
  const [editingPackage, setEditingPackage] = useState<Partial<Package>>({});
  const [isEditingTheme, setIsEditingTheme] = useState(false);
  const [editingTheme, setEditingTheme] = useState<Partial<PackageTheme>>({});

  // Load initial data
  useEffect(() => {
    loadPackages();
  }, []);

  // Load package details when selected
  useEffect(() => {
    if (selectedPackage) {
      loadPackageDetails(selectedPackage.id);
    }
  }, [selectedPackage]);

  const loadPackages = async () => {
    try {
      setLoading(true);
      setError(null);
      const allPackages = await PhotoPackagesService.getPackages({ is_active: true });
      setPackages(allPackages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load packages');
    } finally {
      setLoading(false);
    }
  };

  const loadPackageDetails = async (packageId: string) => {
    try {
      const [themes, tiers] = await Promise.all([
        PhotoPackagesService.getPackageThemes(packageId, false), // Include inactive
        PhotoPackagesService.getPackagePricingTiers(packageId)
      ]);
      setPackageThemes(themes);
      setPricingTiers(tiers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load package details');
    }
  };

  const handlePackageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Note: Package creation/editing would require admin API endpoints
    setSuccess('Package update feature requires backend implementation');
    setIsEditingPackage(false);
    setEditingPackage({});
  };

  const handleThemeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Note: Theme creation/editing would require admin API endpoints
    setSuccess('Theme update feature requires backend implementation');
    setIsEditingTheme(false);
    setEditingTheme({});
  };

  const formatPrice = (priceCents: number, currency: string = 'USD') => {
    return PhotoPackagesService.formatPackagePrice(priceCents, currency);
  };

  if (loading && packages.length === 0) {
    return (
      <div className={`flex justify-center items-center py-8 ${className}`}>
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Package Management
        </h1>
        <button
          onClick={() => {
            setEditingPackage({
              name: '',
              description: '',
              category: 'wedding',
              images_per_generation: 3,
              base_prompt_template: '',
              is_active: true,
              is_featured: false,
              sort_order: 0
            });
            setIsEditingPackage(true);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Create New Package
        </button>
      </div>

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Package List */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">Packages</h3>
            </div>
            <div className="p-4">
              <div className="space-y-2">
                {packages.map((pkg) => (
                  <button
                    key={pkg.id}
                    onClick={() => setSelectedPackage(pkg)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedPackage?.id === pkg.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {pkg.name}
                        </h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                          {pkg.category}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {pkg.is_featured && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
                            Featured
                          </span>
                        )}
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                          pkg.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {pkg.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Package Details */}
        <div className="lg:col-span-2">
          {selectedPackage ? (
            <div className="space-y-6">
              {/* Package Info */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {selectedPackage.name}
                    </h3>
                    <button
                      onClick={() => {
                        setEditingPackage(selectedPackage);
                        setIsEditingPackage(true);
                      }}
                      className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      Edit
                    </button>
                  </div>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Category:</span>
                      <span className="ml-2 capitalize">{selectedPackage.category}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Images per generation:</span>
                      <span className="ml-2">{selectedPackage.images_per_generation}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Active:</span>
                      <span className="ml-2">{selectedPackage.is_active ? 'Yes' : 'No'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Featured:</span>
                      <span className="ml-2">{selectedPackage.is_featured ? 'Yes' : 'No'}</span>
                    </div>
                  </div>
                  {selectedPackage.description && (
                    <div className="mt-4">
                      <span className="text-gray-500 dark:text-gray-400">Description:</span>
                      <p className="mt-1 text-gray-900 dark:text-white">{selectedPackage.description}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Tabs */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                <div className="border-b border-gray-200 dark:border-gray-700">
                  <nav className="-mb-px flex">
                    <button
                      onClick={() => setActiveTab('themes')}
                      className={`py-2 px-4 border-b-2 font-medium text-sm ${
                        activeTab === 'themes'
                          ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                      }`}
                    >
                      Themes ({packageThemes.length})
                    </button>
                    <button
                      onClick={() => setActiveTab('pricing')}
                      className={`py-2 px-4 border-b-2 font-medium text-sm ${
                        activeTab === 'pricing'
                          ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                      }`}
                    >
                      Pricing ({pricingTiers.length})
                    </button>
                  </nav>
                </div>

                <div className="p-4">
                  {activeTab === 'themes' && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          Package Themes
                        </h4>
                        <button
                          onClick={() => {
                            setEditingTheme({
                              package_id: selectedPackage.id,
                              name: '',
                              description: '',
                              setting_prompt: '',
                              is_active: true,
                              is_premium: false,
                              sort_order: packageThemes.length
                            });
                            setIsEditingTheme(true);
                          }}
                          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                        >
                          Add Theme
                        </button>
                      </div>

                      <div className="grid grid-cols-1 gap-3">
                        {packageThemes.map((theme) => (
                          <div
                            key={theme.id}
                            className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <h5 className="font-medium text-gray-900 dark:text-white">
                                  {theme.name}
                                </h5>
                                {theme.description && (
                                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    {theme.description}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center space-x-2">
                                {theme.is_premium && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
                                    Premium
                                  </span>
                                )}
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                                  theme.is_active 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {theme.is_active ? 'Active' : 'Inactive'}
                                </span>
                                <button
                                  onClick={() => {
                                    setEditingTheme(theme);
                                    setIsEditingTheme(true);
                                  }}
                                  className="text-blue-600 hover:text-blue-700 text-sm"
                                >
                                  Edit
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeTab === 'pricing' && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          Pricing Tiers
                        </h4>
                        <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
                          Add Tier
                        </button>
                      </div>

                      <div className="grid grid-cols-1 gap-3">
                        {pricingTiers.map((tier) => (
                          <div
                            key={tier.id}
                            className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <h5 className="font-medium text-gray-900 dark:text-white">
                                  {tier.display_name}
                                  {tier.badge && (
                                    <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                                      {tier.badge}
                                    </span>
                                  )}
                                </h5>
                                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                  {formatPrice(tier.price_amount_cents, tier.currency)} • {tier.included_generations} generations
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                {tier.is_default && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                                    Default
                                  </span>
                                )}
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                                  tier.is_active 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {tier.is_active ? 'Active' : 'Inactive'}
                                </span>
                                <button className="text-blue-600 hover:text-blue-700 text-sm">
                                  Edit
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-8 text-center">
              <p className="text-gray-500 dark:text-gray-400">
                Select a package from the list to view its details and manage themes and pricing.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Package Edit Modal */}
      {isEditingPackage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <form onSubmit={handlePackageSubmit}>
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {editingPackage.id ? 'Edit Package' : 'Create New Package'}
                </h3>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Package Name
                  </label>
                  <input
                    type="text"
                    value={editingPackage.name || ''}
                    onChange={(e) => setEditingPackage({ ...editingPackage, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={editingPackage.description || ''}
                    onChange={(e) => setEditingPackage({ ...editingPackage, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    rows={3}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Category
                    </label>
                    <select
                      value={editingPackage.category || 'wedding'}
                      onChange={(e) => setEditingPackage({ ...editingPackage, category: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="wedding">Wedding</option>
                      <option value="professional">Professional</option>
                      <option value="celebration">Celebration</option>
                      <option value="artistic">Artistic</option>
                      <option value="portrait">Portrait</option>
                      <option value="family">Family</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Images per Generation
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      value={editingPackage.images_per_generation || 3}
                      onChange={(e) => setEditingPackage({ ...editingPackage, images_per_generation: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editingPackage.is_active || false}
                      onChange={(e) => setEditingPackage({ ...editingPackage, is_active: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Active</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editingPackage.is_featured || false}
                      onChange={(e) => setEditingPackage({ ...editingPackage, is_featured: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Featured</span>
                  </label>
                </div>
              </div>
              
              <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingPackage(false);
                    setEditingPackage({});
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingPackage.id ? 'Update' : 'Create'} Package
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Theme Edit Modal */}
      {isEditingTheme && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleThemeSubmit}>
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {editingTheme.id ? 'Edit Theme' : 'Create New Theme'}
                </h3>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Theme Name
                    </label>
                    <input
                      type="text"
                      value={editingTheme.name || ''}
                      onChange={(e) => setEditingTheme({ ...editingTheme, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Sort Order
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editingTheme.sort_order || 0}
                      onChange={(e) => setEditingTheme({ ...editingTheme, sort_order: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={editingTheme.description || ''}
                    onChange={(e) => setEditingTheme({ ...editingTheme, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    rows={2}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Setting Prompt (Main Description)
                  </label>
                  <textarea
                    value={editingTheme.setting_prompt || ''}
                    onChange={(e) => setEditingTheme({ ...editingTheme, setting_prompt: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    rows={3}
                    required
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Clothing Prompt
                    </label>
                    <textarea
                      value={editingTheme.clothing_prompt || ''}
                      onChange={(e) => setEditingTheme({ ...editingTheme, clothing_prompt: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      rows={2}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Atmosphere Prompt
                    </label>
                    <textarea
                      value={editingTheme.atmosphere_prompt || ''}
                      onChange={(e) => setEditingTheme({ ...editingTheme, atmosphere_prompt: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      rows={2}
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Technical Prompt
                  </label>
                  <textarea
                    value={editingTheme.technical_prompt || ''}
                    onChange={(e) => setEditingTheme({ ...editingTheme, technical_prompt: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    rows={2}
                  />
                </div>
                
                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editingTheme.is_active || false}
                      onChange={(e) => setEditingTheme({ ...editingTheme, is_active: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Active</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editingTheme.is_premium || false}
                      onChange={(e) => setEditingTheme({ ...editingTheme, is_premium: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Premium Only</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editingTheme.is_seasonal || false}
                      onChange={(e) => setEditingTheme({ ...editingTheme, is_seasonal: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Seasonal</span>
                  </label>
                </div>
              </div>
              
              <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingTheme(false);
                    setEditingTheme({});
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingTheme.id ? 'Update' : 'Create'} Theme
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}