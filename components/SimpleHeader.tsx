import React from 'react';
import Icon from './Icon';
import ThemeToggle from './ThemeToggle';
import PWAInstallButton from './PWAInstallButton';
import { useGenerationCounter } from '../hooks/useGenerationCounter';
import { useAuth } from '../hooks/useAuth';

interface SimpleHeaderProps {
  onLogin?: (mode: 'signin' | 'signup') => void;
  onProfile?: () => void;
  onHelp?: () => void;
  onSettings?: () => void;
  hideAuthButtons?: boolean;
}

const SimpleHeader: React.FC<SimpleHeaderProps> = ({ onLogin, onProfile, onHelp, onSettings, hideAuthButtons = false }) => {
  const { totalGenerations, dailyGenerations } = useGenerationCounter();
  const { user, isAuthenticated, isLoading } = useAuth();
  
  return (
    <header className="relative bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50 transition-colors duration-300">
      {/* Clean Header */}
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          {/* Logo and Brand - Left */}
          <div className="flex items-center gap-4">
            {/* Mobile: Logo with background */}
            <div className="md:hidden w-12 h-12 bg-gradient-to-br from-blue-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg p-2">
              <img 
                src="/assets/wedai_logo_notext_nobg.png" 
                alt="WedAI Logo" 
                className="w-full h-full object-contain"
              />
            </div>
            
            {/* Desktop: Logo without background */}
            <div className="hidden md:block">
              <img 
                src="/assets/wedai_logo_notext_nobg.png" 
                alt="WedAI Logo" 
                className="w-10 h-10 lg:w-12 lg:h-12 object-contain"
              />
            </div>
            
            <div className="hidden sm:block">
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white transition-colors duration-300">
                WedAI
              </h1>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 transition-colors duration-300">
                AI Wedding Portraits
              </p>
            </div>
          </div>

          {/* Auth & Actions - Right */}
          <div className="flex items-center gap-4">
            {/* Navigation Links */}
            <nav className="hidden md:flex items-center gap-1">
              <button
                onClick={onHelp}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all duration-200"
              >
                <Icon 
                  path="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                  className="w-4 h-4" 
                />
                <span>Help</span>
              </button>
              <button
                onClick={onSettings}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all duration-200"
              >
                <Icon 
                  path="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" 
                  className="w-4 h-4" 
                />
                <span>Settings</span>
              </button>
            </nav>
            
            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center gap-1">
              <button
                onClick={onHelp}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all duration-200"
                title="Help & Support"
              >
                <Icon 
                  path="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                  className="w-5 h-5" 
                />
              </button>
              <button
                onClick={onSettings}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all duration-200"
                title="Settings"
              >
                <Icon 
                  path="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" 
                  className="w-5 h-5" 
                />
              </button>
            </div>
            
            
            {/* Authentication UI */}
            {!hideAuthButtons && (
              <>
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                      <Icon path="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" className="w-4 h-4 animate-spin text-gray-500 dark:text-gray-400" />
                    </div>
                    <span className="text-sm text-gray-500 dark:text-gray-400 hidden sm:inline">Loading...</span>
                  </div>
                ) : isAuthenticated && user ? (
                  /* Authenticated User */
                  <>
                    {/* Separator */}
                    <div className="hidden md:block h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
                    <button
                      onClick={onProfile}
                      className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-50 to-teal-50 dark:from-blue-900/30 dark:to-teal-900/30 border border-blue-200 dark:border-blue-800 rounded-lg hover:from-blue-100 hover:to-teal-100 dark:hover:from-blue-900/40 dark:hover:to-teal-900/40 transition-all duration-300"
                    >
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-teal-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-sm">
                          {(user.displayName || user.email).charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="hidden lg:block">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {user.displayName || 'User'}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          View Profile
                        </div>
                      </div>
                      <Icon path="M19 9l-7 7-7-7" className="w-4 h-4 text-gray-500" />
                    </button>
                  </>
                ) : (
                  /* Unauthenticated User */
                  <>
                    {/* Separator */}
                    <div className="hidden md:block h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => onLogin?.('signin')}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all duration-200"
                      >
                        Sign In
                      </button>
                      <button
                        onClick={() => onLogin?.('signup')}
                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-white font-medium text-sm rounded-lg transition-all duration-300 shadow-sm hover:shadow-md transform hover:scale-[1.02]"
                      >
                        Sign Up
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
            
            {/* PWA Install Button - Desktop only */}
            <div className="hidden lg:block ml-3">
              <PWAInstallButton variant="badge" size="sm" />
            </div>
          </div>
        </div>
      </div>

      {/* Hero Section - Compact for mobile */}
      <div className="bg-gradient-to-r from-blue-50/80 to-teal-50/80 dark:from-blue-900/20 dark:to-teal-900/20 border-b border-gray-200 dark:border-gray-800 transition-colors duration-300">
        <div className="container mx-auto px-4 py-6 md:py-12 text-center">
          <h2 className="text-2xl md:text-4xl lg:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-600 dark:from-blue-400 dark:to-teal-400 mb-2 md:mb-4">
            AI Wedding Portrait Generator
          </h2>
          <p className="text-sm md:text-xl text-gray-700 dark:text-gray-300 max-w-2xl mx-auto mb-4 md:mb-6 transition-colors duration-300">
            Every photo shoot creates 3 unique themed wedding portraits!
          </p>
          
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

export default SimpleHeader;