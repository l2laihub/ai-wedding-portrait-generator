import React, { useState } from 'react';
import Icon from './Icon';

interface MaintenanceBannerProps {
  className?: string;
  variant?: 'banner' | 'overlay' | 'modal';
  allowDismiss?: boolean;
}

const MaintenanceBanner: React.FC<MaintenanceBannerProps> = ({ 
  className = '',
  variant = 'banner',
  allowDismiss = false
}) => {
  const [isDismissed, setIsDismissed] = useState(() => {
    return allowDismiss && sessionStorage.getItem('maintenance-banner-dismissed') === 'true';
  });

  const [isMaintenanceMode, setIsMaintenanceMode] = useState(() => {
    return localStorage.getItem('maintenance-mode') === 'true';
  });

  // Listen for maintenance mode changes
  React.useEffect(() => {
    const checkMaintenanceMode = () => {
      setIsMaintenanceMode(localStorage.getItem('maintenance-mode') === 'true');
    };

    // Check periodically for changes
    const interval = setInterval(checkMaintenanceMode, 1000);
    
    // Also listen for storage events from other tabs
    window.addEventListener('storage', checkMaintenanceMode);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', checkMaintenanceMode);
    };
  }, []);

  const handleDismiss = () => {
    if (allowDismiss) {
      setIsDismissed(true);
      sessionStorage.setItem('maintenance-banner-dismissed', 'true');
    }
  };

  // Don't show if dismissed or if maintenance mode is disabled
  if (isDismissed || !isMaintenanceMode) {
    return null;
  }

  // Modal overlay variant
  if (variant === 'modal') {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8 max-w-md w-full border border-gray-200 dark:border-gray-700">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Icon path="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" className="w-8 h-8 text-white" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              🚀 Exciting Updates Coming!
            </h2>
            
            <p className="text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
              We're temporarily offline to bring you amazing new features and enhanced performance. 
              Thanks for your patience!
            </p>
            
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2 flex items-center gap-2">
                <Icon path="M13 10V3L4 14h7v7l9-11h-7z" className="w-4 h-4" />
                What's New:
              </h3>
              <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                <li>• Higher API limits for unlimited portraits</li>
                <li>• New wedding styles and themes</li>
                <li>• Enhanced photo quality</li>
                <li>• Improved mobile experience</li>
              </ul>
            </div>
            
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Expected return: <strong>Within 24 hours</strong>
            </p>
            
            {allowDismiss && (
              <button
                onClick={handleDismiss}
                className="w-full bg-gradient-to-r from-blue-600 to-teal-600 text-white py-3 px-6 rounded-lg font-medium hover:from-blue-700 hover:to-teal-700 transition-colors"
              >
                Continue Browsing
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Full page overlay variant
  if (variant === 'overlay') {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-blue-50 to-teal-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center z-50">
        <div className="text-center p-8 max-w-2xl mx-auto">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
            <Icon path="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" className="w-10 h-10 text-white" />
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            🚀 Major Updates in Progress
          </h1>
          
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
            WedAI is getting amazing new features! We'll be back shortly with enhanced performance and unlimited portrait generation.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mb-4">
                <Icon path="M13 10V3L4 14h7v7l9-11h-7z" className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Higher Limits</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Unlimited daily portrait generation for all users</p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
              <div className="w-12 h-12 bg-pink-100 dark:bg-pink-900/30 rounded-lg flex items-center justify-center mb-4">
                <Icon path="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" className="w-6 h-6 text-pink-600 dark:text-pink-400" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">New Styles</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">More wedding themes and enhanced photo quality</p>
            </div>
          </div>
          
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-6 mb-8">
            <p className="text-amber-800 dark:text-amber-200">
              <strong>Expected Return:</strong> Within 24 hours
            </p>
          </div>
          
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Thank you for being part of our amazing community of <strong>950+ portraits generated!</strong>
          </p>
        </div>
      </div>
    );
  }

  // Default banner variant
  return (
    <div className={`bg-gradient-to-r from-blue-600 to-teal-600 text-white ${className}`}>
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="flex-shrink-0">
              <Icon path="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold">🚀 Major Updates in Progress</div>
              <div className="text-sm text-blue-100">
                Upgrading to unlimited portraits + new features. Back within 24 hours!
              </div>
            </div>
          </div>
          
          {allowDismiss && (
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 text-blue-200 hover:text-white transition-colors p-1"
              aria-label="Dismiss maintenance notice"
            >
              <Icon path="M6 18L18 6M6 6l12 12" className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MaintenanceBanner;