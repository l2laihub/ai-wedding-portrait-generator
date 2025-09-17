import React, { useState, useEffect } from 'react';
import { themeManager } from '../services/templateEngine/ThemeManager';

interface ThemeSelectorProps {
  onThemeSelect: (themes: string[]) => void;
  selectedThemes?: string[];
  onClose: () => void;
  count?: number;
  className?: string;
}

const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  onThemeSelect,
  selectedThemes = [],
  onClose,
  count = 3,
  className = ''
}) => {
  const [currentThemes, setCurrentThemes] = useState<string[]>(selectedThemes);
  const [showingDetails, setShowingDetails] = useState(false);

  useEffect(() => {
    setCurrentThemes(selectedThemes);
  }, [selectedThemes]);

  const handleRandomSelection = () => {
    const randomStyles = themeManager.getRandomStyles(count, { favorFeatured: true });
    const styleNames = randomStyles.map(style => style.name);
    setCurrentThemes(styleNames);
    onThemeSelect(styleNames);
  };

  const handleThemeToggle = (themeName: string) => {
    let updatedThemes;
    if (currentThemes.includes(themeName)) {
      updatedThemes = currentThemes.filter(name => name !== themeName);
    } else if (currentThemes.length < count) {
      updatedThemes = [...currentThemes, themeName];
    } else {
      // Replace the last theme if at max
      updatedThemes = [...currentThemes.slice(0, count - 1), themeName];
    }
    
    setCurrentThemes(updatedThemes);
  };

  const handleApplySelection = () => {
    onThemeSelect(currentThemes);
    onClose();
  };

  // Use the new theme manager
  const availableStyles = themeManager.getAvailableStyles({ enabled: true });
  const categories = [...new Set(availableStyles.map(style => style.category))];

  const getStylesByCategory = (category: string) => {
    return availableStyles.filter(style => style.category === category);
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      traditional: '⛪',
      modern: '🏙️',
      vintage: '🕰️',
      themed: '🎭',
      seasonal: '🌺',
      cultural: '🌏',
      fantasy: '🏰',
      luxury: '💎',
    };
    return icons[category] || '✨';
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl p-6 max-h-[80vh] overflow-y-auto ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Choose Wedding Themes
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Select up to {count} themes ({currentThemes.length} selected)
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={handleRandomSelection}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-sm font-medium"
        >
          Random Selection
        </button>
        <button
          onClick={() => {
            setCurrentThemes([]);
          }}
          className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm font-medium"
        >
          Clear All
        </button>
        <button
          onClick={() => setShowingDetails(!showingDetails)}
          className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg transition-colors text-sm font-medium"
        >
          {showingDetails ? 'Hide Details' : 'Show Details'}
        </button>
      </div>

      {/* Selected Themes Preview */}
      {currentThemes.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Selected Themes
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {currentThemes.map((themeName, index) => {
              const style = availableStyles.find(s => s.name === themeName);
              if (!style) return null;
              
              return (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getCategoryIcon(style.category)}</span>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white text-sm">
                        {style.name}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 capitalize">
                        {style.category}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleThemeToggle(themeName)}
                    className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded text-red-500 hover:text-red-600"
                    title="Remove theme"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Theme Categories */}
      <div className="space-y-6">
        {categories.map(category => {
          const categoryStyles = getStylesByCategory(category);
          return (
            <div key={category}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">{getCategoryIcon(category)}</span>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
                  {category} ({categoryStyles.length})
                </h3>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {categoryStyles.map(style => {
                  const isSelected = currentThemes.includes(style.name);
                  const canSelect = !isSelected && currentThemes.length < count;
                  
                  return (
                    <div
                      key={style.id}
                      onClick={() => (isSelected || canSelect) && handleThemeToggle(style.name)}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md'
                          : canSelect
                          ? 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md'
                          : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 dark:text-white text-sm leading-tight">
                            {style.name}
                          </h4>
                          {showingDetails && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                              {style.description}
                            </p>
                          )}
                        </div>
                        {isSelected && (
                          <div className="flex-shrink-0 ml-2">
                            <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {showingDetails && (
                        <>
                          {/* Color Palette Preview */}
                          <div className="flex gap-1 mb-3">
                            {style.colorPalette.slice(0, 4).map((color, idx) => (
                              <div
                                key={idx}
                                className="w-4 h-4 rounded-full border border-gray-300 dark:border-gray-600"
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </div>
                          
                          {/* Mood Tags */}
                          <div className="flex flex-wrap gap-1">
                            {style.mood.slice(0, 2).map(mood => (
                              <span
                                key={mood}
                                className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full"
                              >
                                {mood}
                              </span>
                            ))}
                            {style.mood.length > 2 && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                +{style.mood.length - 2}
                              </span>
                            )}
                          </div>
                        </>
                      )}
                      
                      {style.premiumOnly && (
                        <div className="mt-2">
                          <span className="text-xs bg-gradient-to-r from-yellow-400 to-yellow-500 text-white px-2 py-1 rounded-full">
                            Premium
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700 mt-6">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {currentThemes.length} of {count} themes selected
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApplySelection}
            disabled={currentThemes.length === 0}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              currentThemes.length === 0
                ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            Apply Selection
          </button>
        </div>
      </div>
    </div>
  );
};

export default ThemeSelector;