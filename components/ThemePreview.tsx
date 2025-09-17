import React from 'react';
import { WeddingStyle } from '../services/templateEngine/ThemeManager';

interface ThemePreviewProps {
  style: WeddingStyle;
  isCompact?: boolean;
  showDetails?: boolean;
  onSelect?: () => void;
}

const ThemePreview: React.FC<ThemePreviewProps> = ({ 
  style, 
  isCompact = false,
  showDetails = true,
  onSelect 
}) => {
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

  if (isCompact) {
    return (
      <div 
        onClick={onSelect}
        className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      >
        <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-400 to-teal-500 rounded-full flex items-center justify-center text-white text-xl">
          {getCategoryIcon(style.category)}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 dark:text-white truncate">
            {style.name}
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
            {style.description}
          </p>
        </div>
        {style.premiumOnly && (
          <span className="flex-shrink-0 text-xs bg-gradient-to-r from-yellow-400 to-yellow-500 text-white px-2 py-1 rounded-full">
            Premium
          </span>
        )}
      </div>
    );
  }

  return (
    <div 
      onClick={onSelect}
      className={`bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden transition-all hover:shadow-xl ${
        onSelect ? 'cursor-pointer' : ''
      }`}
    >
      {/* Preview Image */}
      <div className="relative h-48 bg-gradient-to-br from-blue-400 to-teal-500 flex items-center justify-center">
        {style.previewImage ? (
          <img 
            src={style.previewImage} 
            alt={style.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-6xl text-white/80">
            {getCategoryIcon(style.category)}
          </div>
        )}
        
        {/* Category Badge */}
        <div className="absolute top-4 left-4 bg-black/50 backdrop-blur text-white text-xs px-3 py-1 rounded-full flex items-center gap-1">
          <span>{getCategoryIcon(style.category)}</span>
          <span className="capitalize">{style.category}</span>
        </div>

        {/* Premium Badge */}
        {style.premiumOnly && (
          <div className="absolute top-4 right-4 bg-gradient-to-r from-yellow-400 to-yellow-500 text-white text-xs px-3 py-1 rounded-full">
            Premium
          </div>
        )}

        {/* Featured Badge */}
        {style.featured && (
          <div className="absolute bottom-4 left-4 bg-green-500 text-white text-xs px-3 py-1 rounded-full flex items-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            Featured
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          {style.name}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          {style.description}
        </p>

        {showDetails && (
          <>
            {/* Color Palette */}
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Color Palette
              </h4>
              <div className="flex gap-2">
                {style.colorPalette.map((color, index) => (
                  <div key={index} className="group relative">
                    <div
                      className="w-10 h-10 rounded-lg shadow-inner border border-gray-200 dark:border-gray-700 cursor-pointer hover:scale-110 transition-transform"
                      style={{ backgroundColor: color }}
                    />
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                      {color}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mood & Atmosphere */}
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Mood & Atmosphere
              </h4>
              <div className="flex flex-wrap gap-2">
                {style.mood.map(mood => (
                  <span
                    key={mood}
                    className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm capitalize"
                  >
                    {mood}
                  </span>
                ))}
              </div>
            </div>

            {/* Setting */}
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Setting
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {style.setting}
              </p>
            </div>

            {/* Tags */}
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Tags
              </h4>
              <div className="flex flex-wrap gap-1">
                {style.tags.map(tag => (
                  <span
                    key={tag}
                    className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Popularity */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Popularity</span>
                <div className="flex gap-0.5">
                  {[...Array(10)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-2 h-8 rounded-sm transition-all ${
                        i < style.popularity
                          ? 'bg-gradient-to-t from-blue-500 to-teal-400'
                          : 'bg-gray-200 dark:bg-gray-700'
                      }`}
                      style={{
                        height: `${(i + 1) * 3}px`,
                      }}
                    />
                  ))}
                </div>
              </div>

              {style.seasonal && (
                <span className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-2 py-1 rounded-full">
                  Seasonal
                </span>
              )}
            </div>
          </>
        )}

        {/* Style Variations Preview */}
        {showDetails && style.styleVariations.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Available Variations ({style.styleVariations.length})
            </h4>
            <div className="flex gap-2 overflow-x-auto">
              {style.styleVariations.map((variation, index) => (
                <div
                  key={index}
                  className="flex-shrink-0 px-3 py-1 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-xs text-gray-700 dark:text-gray-300"
                  title={variation.description}
                >
                  {variation.name}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ThemePreview;