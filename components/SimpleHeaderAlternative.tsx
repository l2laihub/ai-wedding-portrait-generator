import React from 'react';
import Icon from './Icon';
import ThemeToggle from './ThemeToggle';
import TodayCounter from './TodayCounter';
import { useGenerationCounter } from '../hooks/useGenerationCounter';

/**
 * Alternative header layout with prominent counter display
 * This is an example of how to display the counter more prominently
 * You can replace SimpleHeader.tsx with this if you prefer this layout
 */
const SimpleHeaderAlternative: React.FC = () => {
  const { totalGenerations, dailyGenerations } = useGenerationCounter();
  
  return (
    <header className="relative bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50 transition-colors duration-300">
      {/* Clean Header */}
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo and Brand - Left */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-teal-500 rounded-xl flex items-center justify-center shadow-xl p-2">
              <img 
                src="/assets/wedai_logo_notext_nobg.png" 
                alt="WedAI Logo" 
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3 transition-colors duration-300">
                WedAI
                <span className="text-sm bg-blue-600/20 text-blue-600 dark:text-blue-300 px-3 py-1 rounded-full border border-blue-400/30 font-medium transition-colors duration-300">
                  by HuyBuilds
                </span>
              </h1>
            </div>
          </div>

          {/* Counter - Right */}
          <TodayCounter showTotal />
        </div>
      </div>

      {/* Hero Section - Compact for mobile */}
      <div className="bg-gradient-to-r from-blue-50/80 to-teal-50/80 dark:from-blue-900/20 dark:to-teal-900/20 border-b border-gray-200 dark:border-gray-800 transition-colors duration-300">
        <div className="container mx-auto px-4 py-6 md:py-12 text-center">
          <h2 className="text-2xl md:text-4xl lg:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-600 dark:from-blue-400 dark:to-teal-400 mb-2 md:mb-4">
            AI Wedding Portrait Generator
          </h2>
          <p className="text-sm md:text-xl text-gray-700 dark:text-gray-300 max-w-2xl mx-auto mb-4 md:mb-6 transition-colors duration-300">
            Transform your couple photos into magical wedding portraits with AI
          </p>

          {/* Today's Counter - Prominent Display */}
          <div className="flex justify-center mb-4 md:mb-6">
            <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 dark:from-orange-400/20 dark:to-red-400/20 px-6 py-3 rounded-full border border-orange-300 dark:border-orange-700 shadow-lg">
              <div className="flex items-center gap-3 text-orange-700 dark:text-orange-300">
                <Icon 
                  path="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" 
                  className="w-6 h-6" 
                />
                <div className="text-center">
                  <div className="text-2xl font-bold">{dailyGenerations}</div>
                  <div className="text-sm">Today's Portraits</div>
                </div>
                <div className="text-gray-400 dark:text-gray-500 text-sm">
                  {totalGenerations.toLocaleString()} total
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-3 md:gap-6 text-xs md:text-base">
            <div className="flex items-center gap-1 md:gap-2 text-gray-600 dark:text-gray-300 transition-colors duration-300">
              <Icon path="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" className="w-4 h-4 md:w-6 md:h-6 text-green-500 dark:text-green-400" />
              <span>100% Free</span>
            </div>
            <div className="flex items-center gap-1 md:gap-2 text-gray-600 dark:text-gray-300 transition-colors duration-300">
              <Icon path="M13 10V3L4 14h7v7l9-11h-7z" className="w-4 h-4 md:w-6 md:h-6 text-amber-500 dark:text-amber-400" />
              <span>12 Unique Styles</span>
            </div>
            <div className="flex items-center gap-1 md:gap-2 text-gray-600 dark:text-gray-300 transition-colors duration-300">
              <Icon path="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" className="w-4 h-4 md:w-6 md:h-6 text-teal-500 dark:text-teal-400" />
              <span>Privacy First</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default SimpleHeaderAlternative;