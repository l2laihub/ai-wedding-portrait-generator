import React, { useState } from 'react';
import { themeManager } from '../services/templateEngine/ThemeManager';
import ThemeSelector from './ThemeSelector';
import ThemePreview from './ThemePreview';
import Modal from './Modal';

interface EnhancedPromptInputProps {
  onSubmit: (selectedThemes?: string[]) => void;
  isLoading: boolean;
  customPrompt: string;
  onCustomPromptChange: (prompt: string) => void;
}

const EnhancedPromptInput: React.FC<EnhancedPromptInputProps> = ({
  onSubmit,
  isLoading,
  customPrompt,
  onCustomPromptChange
}) => {
  const [useManualThemeSelection, setUseManualThemeSelection] = useState(false);
  const [selectedThemes, setSelectedThemes] = useState<string[]>([]);
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [showThemeDetails, setShowThemeDetails] = useState<string | null>(null);

  const handleSubmit = () => {
    if (useManualThemeSelection && selectedThemes.length > 0) {
      onSubmit(selectedThemes);
    } else {
      onSubmit(); // Use random theme selection
    }
  };

  const handleThemeSelect = (themes: string[]) => {
    setSelectedThemes(themes);
    setShowThemeSelector(false);
  };

  const selectedThemeDetails = selectedThemes.map(id => themeManager.getStyle(id)).filter(Boolean);

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg transition-colors duration-300">
      {/* Theme Selection Toggle */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Theme Selection
          </h3>
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={useManualThemeSelection}
              onChange={(e) => setUseManualThemeSelection(e.target.checked)}
              className="sr-only"
            />
            <div className="relative">
              <div className={`block w-14 h-8 rounded-full transition-colors ${
                useManualThemeSelection ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
              }`} />
              <div className={`absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${
                useManualThemeSelection ? 'translate-x-6' : ''
              }`} />
            </div>
            <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">
              {useManualThemeSelection ? 'Manual Selection' : 'Random Selection'}
            </span>
          </label>
        </div>

        {useManualThemeSelection ? (
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Choose up to 3 wedding themes for your portraits
            </p>
            
            {/* Selected Themes */}
            {selectedThemes.length > 0 ? (
              <div className="space-y-2 mb-3">
                {selectedThemeDetails.map((style, index) => (
                  style && (
                    <ThemePreview
                      key={style.id}
                      style={style}
                      isCompact={true}
                      onSelect={() => setShowThemeDetails(style.id)}
                    />
                  )
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 dark:bg-gray-700/50 rounded-lg mb-3">
                <p className="text-gray-500 dark:text-gray-400">No themes selected</p>
              </div>
            )}

            <button
              onClick={() => setShowThemeSelector(true)}
              className="w-full py-2 px-4 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              {selectedThemes.length > 0 ? 'Change Themes' : 'Select Themes'}
            </button>
          </div>
        ) : (
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              AI will randomly select 3 beautiful wedding themes from our collection of 12+ styles
            </p>
          </div>
        )}
      </div>

      {/* Custom Prompt */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Custom Instructions (Optional)
        </label>
        <textarea
          value={customPrompt}
          onChange={(e) => onCustomPromptChange(e.target.value)}
          placeholder="Add any special requests or preferences..."
          className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-colors"
          rows={3}
        />
      </div>

      {/* Generate Button */}
      <button
        onClick={handleSubmit}
        disabled={isLoading || (useManualThemeSelection && selectedThemes.length === 0)}
        className={`w-full py-3 px-6 rounded-lg font-semibold text-white transition-all transform hover:scale-[1.02] ${
          isLoading || (useManualThemeSelection && selectedThemes.length === 0)
            ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
            : 'bg-gradient-to-r from-blue-500 to-teal-500 hover:from-blue-600 hover:to-teal-600 shadow-lg'
        }`}
      >
        {isLoading ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Generating...
          </span>
        ) : (
          <span className="flex items-center justify-center">
            Generate Wedding Portraits
            <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          </span>
        )}
      </button>

      {/* Theme Selector Modal */}
      <Modal
        isOpen={showThemeSelector}
        onClose={() => setShowThemeSelector(false)}
        title=""
        size="large"
      >
        <ThemeSelector
          onThemeSelect={handleThemeSelect}
          selectedThemes={selectedThemes}
          onClose={() => setShowThemeSelector(false)}
        />
      </Modal>

      {/* Theme Details Modal */}
      {showThemeDetails && (
        <Modal
          isOpen={true}
          onClose={() => setShowThemeDetails(null)}
          title=""
          size="medium"
        >
          {(() => {
            const style = themeManager.getStyle(showThemeDetails);
            return style ? (
              <ThemePreview style={style} isCompact={false} showDetails={true} />
            ) : null;
          })()}
        </Modal>
      )}
    </div>
  );
};

export default EnhancedPromptInput;