import React, { useState, useEffect } from 'react';
import { PhotoPackagesService, Package, PackageTheme, PackagePricingTier } from '../services/photoPackagesService';
import { useAuth } from '../hooks/useAuth';
import Loader from './Loader';

interface PackageSelectorProps {
  onPackageSelected: (packageData: {
    package: Package;
    selectedTier: PackagePricingTier;
    selectedThemes: PackageTheme[];
  }) => void;
  isLoading?: boolean;
}

export default function PackageSelector({ onPackageSelected, isLoading = false }: PackageSelectorProps) {
  const { user } = useAuth();
  const [packages, setPackages] = useState<Package[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [selectedTier, setSelectedTier] = useState<PackagePricingTier | null>(null);
  const [selectedThemes, setSelectedThemes] = useState<PackageTheme[]>([]);
  const [packageThemes, setPackageThemes] = useState<PackageTheme[]>([]);
  const [pricingTiers, setPricingTiers] = useState<PackagePricingTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'packages' | 'themes' | 'confirm'>('packages');

  // Load packages on mount
  useEffect(() => {
    loadPackages();
  }, []);

  const loadPackages = async () => {
    try {
      setLoading(true);
      setError(null);
      const fetchedPackages = await PhotoPackagesService.getPackages({
        is_active: true
      });
      setPackages(fetchedPackages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load packages');
    } finally {
      setLoading(false);
    }
  };

  const handlePackageSelection = async (pkg: Package) => {
    try {
      setSelectedPackage(pkg);
      setLoading(true);
      
      // Load themes and pricing for selected package
      const [themes, tiers] = await Promise.all([
        PhotoPackagesService.getPackageThemes(pkg.id),
        PhotoPackagesService.getPackagePricingTiers(pkg.id)
      ]);
      
      setPackageThemes(themes);
      setPricingTiers(tiers);
      
      // Auto-select default tier if available
      const defaultTier = tiers.find(tier => tier.is_default) || tiers[0];
      if (defaultTier) {
        setSelectedTier(defaultTier);
      }
      
      setStep('themes');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load package details');
    } finally {
      setLoading(false);
    }
  };

  const handleThemeToggle = (theme: PackageTheme) => {
    setSelectedThemes(prev => {
      const isSelected = prev.find(t => t.id === theme.id);
      if (isSelected) {
        return prev.filter(t => t.id !== theme.id);
      } else {
        // Limit to 3 themes max
        if (prev.length >= 3) {
          return [theme, ...prev.slice(0, 2)];
        }
        return [...prev, theme];
      }
    });
  };

  const handleConfirm = () => {
    if (!selectedPackage || !selectedTier) return;
    
    // Use random themes if none selected
    const themesToUse = selectedThemes.length > 0 
      ? selectedThemes 
      : packageThemes.slice(0, 3);
    
    onPackageSelected({
      package: selectedPackage,
      selectedTier,
      selectedThemes: themesToUse
    });
  };

  if (loading && packages.length === 0) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader message="Loading photo packages..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg p-4 max-w-md mx-auto">
          <p className="text-red-800 dark:text-red-200">{error}</p>
          <button 
            onClick={loadPackages}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Step Indicator */}
      <div className="flex items-center justify-center space-x-4 text-sm">
        <div className={`flex items-center space-x-2 ${step === 'packages' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500'}`}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${step === 'packages' ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'}`}>
            1
          </div>
          <span>Choose Package</span>
        </div>
        <div className="w-8 h-px bg-gray-300"></div>
        <div className={`flex items-center space-x-2 ${step === 'themes' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500'}`}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${step === 'themes' ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'}`}>
            2
          </div>
          <span>Select Themes</span>
        </div>
        <div className="w-8 h-px bg-gray-300"></div>
        <div className={`flex items-center space-x-2 ${step === 'confirm' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500'}`}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${step === 'confirm' ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'}`}>
            3
          </div>
          <span>Confirm</span>
        </div>
      </div>

      {/* Package Selection */}
      {step === 'packages' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-center text-gray-900 dark:text-white">
            Choose Your Photo Package
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                onClick={() => handlePackageSelection(pkg)}
                className={`relative p-6 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-lg ${
                  pkg.featured 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                } hover:border-blue-500`}
              >
                {pkg.featured && (
                  <div className="absolute -top-2 -right-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs px-2 py-1 rounded-full">
                    ⭐ Featured
                  </div>
                )}
                
                <div className="text-center">
                  <h4 className="font-semibold text-lg text-gray-900 dark:text-white mb-2">
                    {pkg.name}
                  </h4>
                  
                  {pkg.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                      {pkg.description}
                    </p>
                  )}
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Images per generation:</span>
                      <span className="font-medium">{pkg.images_per_generation}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Category:</span>
                      <span className="font-medium capitalize">{pkg.category}</span>
                    </div>
                    
                    {pkg.themes && pkg.themes.length > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Themes:</span>
                        <span className="font-medium">{pkg.themes.length}</span>
                      </div>
                    )}
                  </div>
                  
                  {pkg.tags && pkg.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1 justify-center">
                      {pkg.tags.slice(0, 3).map((tag, index) => (
                        <span 
                          key={index}
                          className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Theme Selection */}
      {step === 'themes' && selectedPackage && (
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Select Themes for {selectedPackage.name}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Choose up to 3 themes (or leave empty for random selection)
            </p>
          </div>

          {/* Pricing Tier Selection */}
          {pricingTiers.length > 1 && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <h4 className="font-medium mb-3 text-gray-900 dark:text-white">Select Plan:</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {pricingTiers.map((tier) => (
                  <label
                    key={tier.id}
                    className={`relative flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedTier?.id === tier.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                    }`}
                  >
                    <input
                      type="radio"
                      name="pricing-tier"
                      checked={selectedTier?.id === tier.id}
                      onChange={() => setSelectedTier(tier)}
                      className="sr-only"
                    />
                    
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {tier.display_name}
                        </span>
                        {tier.is_popular && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                            Popular
                          </span>
                        )}
                      </div>
                      
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {PhotoPackagesService.formatPackagePrice(tier.price_amount_cents, tier.currency)}
                        {tier.included_generations > 0 && (
                          <span className="ml-2">• {tier.included_generations} generations</span>
                        )}
                      </div>
                      
                      {tier.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {tier.description}
                        </p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Theme Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {packageThemes.map((theme) => (
              <div
                key={theme.id}
                onClick={() => handleThemeToggle(theme)}
                className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                  selectedThemes.find(t => t.id === theme.id)
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                } hover:border-blue-500`}
              >
                {selectedThemes.find(t => t.id === theme.id) && (
                  <div className="absolute top-2 right-2 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm">
                    ✓
                  </div>
                )}
                
                <div className="text-center">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                    {theme.name}
                  </h4>
                  
                  {theme.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                      {theme.description}
                    </p>
                  )}
                  
                  <div className="flex flex-wrap gap-1 justify-center">
                    {theme.mood_tags.slice(0, 3).map((tag, index) => (
                      <span 
                        key={index}
                        className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  
                  {theme.premium_only && (
                    <div className="mt-2">
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                        Premium
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex justify-between pt-4">
            <button
              onClick={() => setStep('packages')}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            >
              ← Back to Packages
            </button>
            
            <div className="space-x-3">
              {selectedThemes.length === 0 && (
                <span className="text-sm text-gray-500 mr-3">
                  No themes selected - will use random themes
                </span>
              )}
              
              <button
                onClick={() => setStep('confirm')}
                disabled={!selectedTier}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation */}
      {step === 'confirm' && selectedPackage && selectedTier && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-center text-gray-900 dark:text-white">
            Confirm Your Selection
          </h3>
          
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 space-y-4">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">Package:</h4>
              <p className="text-gray-600 dark:text-gray-300">{selectedPackage.name}</p>
              <p className="text-sm text-gray-500">{selectedPackage.description}</p>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">Plan:</h4>
              <p className="text-gray-600 dark:text-gray-300">
                {selectedTier.display_name} - {PhotoPackagesService.formatPackagePrice(selectedTier.price_amount_cents, selectedTier.currency)}
              </p>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">Themes:</h4>
              {selectedThemes.length > 0 ? (
                <ul className="text-gray-600 dark:text-gray-300 text-sm space-y-1">
                  {selectedThemes.map((theme) => (
                    <li key={theme.id}>• {theme.name}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 text-sm">Random themes will be selected</p>
              )}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-between pt-4">
            <button
              onClick={() => setStep('themes')}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            >
              ← Back to Themes
            </button>
            
            <button
              onClick={handleConfirm}
              disabled={isLoading}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {isLoading ? 'Processing...' : 'Start Generation'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}