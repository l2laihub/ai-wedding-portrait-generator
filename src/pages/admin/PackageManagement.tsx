import React, { useState, useEffect } from 'react';
import { PhotoPackagesService, Package, PackageTheme, PackagePricingTier } from '../../../services/photoPackagesService';
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
  const [isEditingPricingTier, setIsEditingPricingTier] = useState(false);
  const [editingPricingTier, setEditingPricingTier] = useState<Partial<PackagePricingTier>>({});

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
    setLoading(true);
    setError(null);
    
    try {
      if (editingPackage.id) {
        // Update existing package
        const updatedPackage = await PhotoPackagesService.updatePackage(editingPackage.id, editingPackage);
        setPackages(packages.map(pkg => pkg.id === updatedPackage.id ? updatedPackage : pkg));
        setSelectedPackage(updatedPackage);
        setSuccess('Package updated successfully');
      } else {
        // Create new package
        const newPackage = await PhotoPackagesService.createPackage(editingPackage);
        setPackages([newPackage, ...packages]);
        setSuccess('Package created successfully');
      }
      
      setIsEditingPackage(false);
      setEditingPackage({});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save package');
    } finally {
      setLoading(false);
    }
  };

  const handleThemeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      if (editingTheme.id) {
        // Update existing theme
        const updatedTheme = await PhotoPackagesService.updatePackageTheme(editingTheme.id, editingTheme);
        setPackageThemes(packageThemes.map(theme => theme.id === updatedTheme.id ? updatedTheme : theme));
        setSuccess('Theme updated successfully');
      } else {
        // Create new theme
        const newTheme = await PhotoPackagesService.createPackageTheme(editingTheme);
        setPackageThemes([...packageThemes, newTheme]);
        setSuccess('Theme created successfully');
      }
      
      setIsEditingTheme(false);
      setEditingTheme({});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save theme');
    } finally {
      setLoading(false);
    }
  };

  const handlePricingTierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      if (editingPricingTier.id) {
        // Update existing pricing tier
        const updatedTier = await PhotoPackagesService.updatePricingTier(editingPricingTier.id, editingPricingTier);
        setPricingTiers(pricingTiers.map(tier => tier.id === updatedTier.id ? updatedTier : tier));
        setSuccess('Pricing tier updated successfully');
      } else {
        // Create new pricing tier
        const newTier = await PhotoPackagesService.createPricingTier(editingPricingTier);
        setPricingTiers([...pricingTiers, newTier]);
        setSuccess('Pricing tier created successfully');
      }
      
      setIsEditingPricingTier(false);
      setEditingPricingTier({});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save pricing tier');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePackage = async (packageId: string) => {
    if (!confirm('Are you sure you want to delete this package? This action cannot be undone.')) {
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      await PhotoPackagesService.deletePackage(packageId);
      setPackages(packages.filter(pkg => pkg.id !== packageId));
      if (selectedPackage?.id === packageId) {
        setSelectedPackage(null);
      }
      setSuccess('Package deleted successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete package');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTheme = async (themeId: string) => {
    if (!confirm('Are you sure you want to delete this theme? This action cannot be undone.')) {
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      await PhotoPackagesService.deletePackageTheme(themeId);
      setPackageThemes(packageThemes.filter(theme => theme.id !== themeId));
      setSuccess('Theme deleted successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete theme');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePricingTier = async (tierId: string) => {
    if (!confirm('Are you sure you want to delete this pricing tier? This action cannot be undone.')) {
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      await PhotoPackagesService.deletePricingTier(tierId);
      setPricingTiers(pricingTiers.filter(tier => tier.id !== tierId));
      setSuccess('Pricing tier deleted successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete pricing tier');
    } finally {
      setLoading(false);
    }
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
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setEditingPackage(selectedPackage);
                          setIsEditingPackage(true);
                        }}
                        className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeletePackage(selectedPackage.id)}
                        className="px-3 py-1 text-sm bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
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
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => {
                                      setEditingTheme(theme);
                                      setIsEditingTheme(true);
                                    }}
                                    className="text-blue-600 hover:text-blue-700 text-sm"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteTheme(theme.id)}
                                    className="text-red-600 hover:text-red-700 text-sm"
                                  >
                                    Delete
                                  </button>
                                </div>
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
                        <button
                          onClick={() => {
                            setEditingPricingTier({
                              package_id: selectedPackage.id,
                              name: '',
                              shoots_count: 1,
                              price_cents: 0,
                              features: [],
                              restrictions: {},
                              sort_order: pricingTiers.length,
                              is_active: true,
                              is_default: false
                            });
                            setIsEditingPricingTier(true);
                          }}
                          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                        >
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
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => {
                                      setEditingPricingTier(tier);
                                      setIsEditingPricingTier(true);
                                    }}
                                    className="text-blue-600 hover:text-blue-700 text-sm"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeletePricingTier(tier.id)}
                                    className="text-red-600 hover:text-red-700 text-sm"
                                  >
                                    Delete
                                  </button>
                                </div>
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

      {/* Pricing Tier Edit Modal */}
      {isEditingPricingTier && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <form onSubmit={handlePricingTierSubmit}>
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {editingPricingTier.id ? 'Edit Pricing Tier' : 'Create New Pricing Tier'}
                </h3>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tier Name
                  </label>
                  <input
                    type="text"
                    value={editingPricingTier.name || editingPricingTier.display_name || ''}
                    onChange={(e) => setEditingPricingTier({ ...editingPricingTier, name: e.target.value, display_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Price (cents)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editingPricingTier.price_cents || editingPricingTier.price_amount_cents || 0}
                      onChange={(e) => setEditingPricingTier({ 
                        ...editingPricingTier, 
                        price_cents: parseInt(e.target.value),
                        price_amount_cents: parseInt(e.target.value)
                      })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Included Generations
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={editingPricingTier.shoots_count || editingPricingTier.included_generations || 1}
                      onChange={(e) => setEditingPricingTier({ 
                        ...editingPricingTier, 
                        shoots_count: parseInt(e.target.value),
                        included_generations: parseInt(e.target.value)
                      })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Badge (optional)
                  </label>
                  <input
                    type="text"
                    value={editingPricingTier.badge || ''}
                    onChange={(e) => setEditingPricingTier({ ...editingPricingTier, badge: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="e.g., MOST POPULAR, BEST VALUE"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Features (one per line)
                  </label>
                  <textarea
                    value={editingPricingTier.features?.join('\n') || ''}
                    onChange={(e) => setEditingPricingTier({ 
                      ...editingPricingTier, 
                      features: e.target.value.split('\n').filter(f => f.trim())
                    })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    rows={4}
                    placeholder="High-resolution images&#10;Multiple style options&#10;Commercial usage rights"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Sort Order
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editingPricingTier.sort_order || 0}
                      onChange={(e) => setEditingPricingTier({ ...editingPricingTier, sort_order: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Original Price (cents, optional)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editingPricingTier.original_price_cents || ''}
                      onChange={(e) => setEditingPricingTier({ ...editingPricingTier, original_price_cents: e.target.value ? parseInt(e.target.value) : undefined })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="For showing discounts"
                    />
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editingPricingTier.is_active !== undefined ? editingPricingTier.is_active : true}
                      onChange={(e) => setEditingPricingTier({ ...editingPricingTier, is_active: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Active</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editingPricingTier.is_default || false}
                      onChange={(e) => setEditingPricingTier({ ...editingPricingTier, is_default: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Default Tier</span>
                  </label>
                </div>
              </div>
              
              <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingPricingTier(false);
                    setEditingPricingTier({});
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingPricingTier.id ? 'Update' : 'Create'} Pricing Tier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}