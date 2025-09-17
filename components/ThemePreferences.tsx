import React, { useState, useEffect } from 'react';
import { themeManager, StyleCategory } from '../services/templateEngine/ThemeManager';

interface ThemePreferencesProps {
  onPreferencesChange?: (preferences: UserThemePreferences) => void;
}

export interface UserThemePreferences {
  favoriteStyles: string[];
  preferredCategories: StyleCategory[];
  preferredMoods: string[];
  excludedStyles: string[];
  autoSelectFeatured: boolean;
  includeSeasonalThemes: boolean;
}

const DEFAULT_PREFERENCES: UserThemePreferences = {
  favoriteStyles: [],
  preferredCategories: [],
  preferredMoods: [],
  excludedStyles: [],
  autoSelectFeatured: true,
  includeSeasonalThemes: true,
};

const ThemePreferences: React.FC<ThemePreferencesProps> = ({ onPreferencesChange }) => {
  const [preferences, setPreferences] = useState<UserThemePreferences>(DEFAULT_PREFERENCES);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  // Load preferences from localStorage
  useEffect(() => {
    const savedPrefs = localStorage.getItem('wedai_theme_preferences');
    if (savedPrefs) {
      try {
        const parsed = JSON.parse(savedPrefs);
        setPreferences({ ...DEFAULT_PREFERENCES, ...parsed });
      } catch (e) {
        console.error('Failed to parse theme preferences:', e);
      }
    }
  }, []);

  // Save preferences to localStorage
  useEffect(() => {
    localStorage.setItem('wedai_theme_preferences', JSON.stringify(preferences));
    onPreferencesChange?.(preferences);
  }, [preferences, onPreferencesChange]);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const allMoods = Array.from(new Set(
    themeManager.getAvailableStyles().flatMap(style => style.mood)
  )).sort();

  const categories: { value: StyleCategory; label: string; icon: string }[] = [
    { value: 'traditional', label: 'Traditional', icon: '⛪' },
    { value: 'modern', label: 'Modern', icon: '🏙️' },
    { value: 'vintage', label: 'Vintage', icon: '🕰️' },
    { value: 'themed', label: 'Themed', icon: '🎭' },
    { value: 'seasonal', label: 'Seasonal', icon: '🌺' },
    { value: 'cultural', label: 'Cultural', icon: '🌏' },
    { value: 'fantasy', label: 'Fantasy', icon: '🏰' },
    { value: 'luxury', label: 'Luxury', icon: '💎' },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
      <div className="p-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Theme Preferences
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Customize how themes are selected for your portraits
        </p>

        {/* Preferred Categories */}
        <div className="mb-6">
          <button
            onClick={() => toggleSection('categories')}
            className="w-full flex items-center justify-between text-left mb-3"
          >
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
              Preferred Categories
            </h4>
            <svg
              className={`w-5 h-5 text-gray-500 transition-transform ${
                expandedSection === 'categories' ? 'transform rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {expandedSection === 'categories' && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {categories.map(category => (
                <label
                  key={category.value}
                  className="flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={preferences.preferredCategories.includes(category.value)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setPreferences({
                          ...preferences,
                          preferredCategories: [...preferences.preferredCategories, category.value]
                        });
                      } else {
                        setPreferences({
                          ...preferences,
                          preferredCategories: preferences.preferredCategories.filter(c => c !== category.value)
                        });
                      }
                    }}
                    className="rounded text-blue-500 focus:ring-blue-500"
                  />
                  <span className="text-lg">{category.icon}</span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{category.label}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Preferred Moods */}
        <div className="mb-6">
          <button
            onClick={() => toggleSection('moods')}
            className="w-full flex items-center justify-between text-left mb-3"
          >
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
              Preferred Moods
            </h4>
            <svg
              className={`w-5 h-5 text-gray-500 transition-transform ${
                expandedSection === 'moods' ? 'transform rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {expandedSection === 'moods' && (
            <div className="flex flex-wrap gap-2">
              {allMoods.map(mood => (
                <label
                  key={mood}
                  className={`px-3 py-1 rounded-full cursor-pointer transition-colors ${
                    preferences.preferredMoods.includes(mood)
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={preferences.preferredMoods.includes(mood)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setPreferences({
                          ...preferences,
                          preferredMoods: [...preferences.preferredMoods, mood]
                        });
                      } else {
                        setPreferences({
                          ...preferences,
                          preferredMoods: preferences.preferredMoods.filter(m => m !== mood)
                        });
                      }
                    }}
                    className="sr-only"
                  />
                  <span className="capitalize">{mood}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* General Settings */}
        <div className="space-y-4">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            General Settings
          </h4>
          
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <span className="text-gray-700 dark:text-gray-300">Prioritize featured themes</span>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Give preference to featured themes in random selection
              </p>
            </div>
            <input
              type="checkbox"
              checked={preferences.autoSelectFeatured}
              onChange={(e) => setPreferences({ ...preferences, autoSelectFeatured: e.target.checked })}
              className="rounded text-blue-500 focus:ring-blue-500"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <span className="text-gray-700 dark:text-gray-300">Include seasonal themes</span>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Include seasonal themes in random selection
              </p>
            </div>
            <input
              type="checkbox"
              checked={preferences.includeSeasonalThemes}
              onChange={(e) => setPreferences({ ...preferences, includeSeasonalThemes: e.target.checked })}
              className="rounded text-blue-500 focus:ring-blue-500"
            />
          </label>
        </div>

        {/* Reset Button */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => {
              setPreferences(DEFAULT_PREFERENCES);
              setExpandedSection(null);
            }}
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            Reset to defaults
          </button>
        </div>
      </div>
    </div>
  );
};

export default ThemePreferences;