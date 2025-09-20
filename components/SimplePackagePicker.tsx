import React, { useState, useEffect } from 'react';
import { PhotoPackagesService, Package } from '../services/photoPackagesService';

interface SimplePackagePickerProps {
  onPackageSelected: (packageData: Package) => void;
  className?: string;
}

interface PackageCard {
  package: Package;
  icon: string;
  gradient: string;
  description: string;
}

export default function SimplePackagePicker({ onPackageSelected, className = '' }: SimplePackagePickerProps) {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load packages on mount
  useEffect(() => {
    loadPackages();
  }, []);

  const loadPackages = async () => {
    try {
      setLoading(true);
      const allPackages = await PhotoPackagesService.getPackages({ is_active: true });
      setPackages(allPackages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load packages');
    } finally {
      setLoading(false);
    }
  };

  // Package configurations with visual styling
  const getPackageConfig = (pkg: Package): PackageCard => {
    const configs: Record<string, Omit<PackageCard, 'package'>> = {
      'wedding-portraits': {
        icon: '💍',
        gradient: 'from-pink-500 to-rose-400',
        description: '20 classic wedding themes including Rustic Barn, Beach Bohemian, and Fairytale Castle, and more'
      },
      'engagement-portraits': {
        icon: '💕',
        gradient: 'from-red-500 to-pink-400', 
        description: '12 romantic engagement themes: Classic Romance, Golden Hour, and Urban Romance, and more'
      },
      'professional-headshots': {
        icon: '👔',
        gradient: 'from-blue-600 to-indigo-500',
        description: '12 professional LinkedIn-ready headshots: Executive, Creative, and Casual styles, and more'
      },
      'anniversary-photos': {
        icon: '🥂',
        gradient: 'from-purple-500 to-indigo-400',
        description: 'Celebrate your love milestone with 12 romantic anniversary themes: Romantic, Memory Lane, and Celebration themes, and more'
      }
    };

    return {
      package: pkg,
      ...configs[pkg.slug] || {
        icon: '📸',
        gradient: 'from-gray-500 to-gray-400',
        description: pkg.description || 'Custom photo package'
      }
    };
  };

  const handlePackageSelect = (pkg: Package) => {
    onPackageSelected(pkg);
  };

  if (loading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg p-8 shadow-lg ${className}`}>
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading photo packages...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg p-8 shadow-lg ${className}`}>
        <div className="text-center text-red-600 dark:text-red-400">
          <p className="mb-4">Failed to load packages</p>
          <button 
            onClick={loadPackages}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const packageCards = packages.map(getPackageConfig);

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Choose Your Photo Package
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          Select a style package to generate 3 beautiful portraits
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {packageCards.map((card) => (
          <button
            key={card.package.id}
            onClick={() => handlePackageSelect(card.package)}
            className="group relative overflow-hidden rounded-xl p-6 text-left transition-all duration-300 hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-purple-500/50"
          >
            {/* Background Gradient */}
            <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-90 group-hover:opacity-100 transition-opacity`}></div>
            
            {/* Content */}
            <div className="relative z-10 text-white">
              <div className="flex items-center mb-3">
                <span className="text-3xl mr-3">{card.icon}</span>
                <h3 className="text-xl font-bold">{card.package.name}</h3>
              </div>
              
              <p className="text-white/90 text-sm leading-relaxed mb-4">
                {card.description}
              </p>
              
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium bg-white/20 px-2 py-1 rounded-full">
                  3 Random Themes
                </span>
                <svg 
                  className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-6 text-center">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Each package uses AI to generate 3 portraits from different themes • 
          High resolution downloads included
        </p>
      </div>
    </div>
  );
}