import React, { useState, useEffect } from 'react';
import Icon from './Icon';

interface RateLimitToastProps {
  className?: string;
}

const RateLimitToast: React.FC<RateLimitToastProps> = ({ className = '' }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(() => {
    return sessionStorage.getItem('rate-limit-toast-dismissed') === 'true';
  });

  useEffect(() => {
    // Show toast after a delay if not dismissed
    if (!isDismissed) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isDismissed]);

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    sessionStorage.setItem('rate-limit-toast-dismissed', 'true');
  };

  // Don't render if dismissed
  if (isDismissed || !isVisible) {
    return null;
  }

  return (
    <div className={`fixed top-20 left-4 right-4 z-40 ${className}`}>
      <div className="max-w-sm mx-auto">
        <div className="bg-white dark:bg-gray-800 border border-amber-200 dark:border-amber-700 rounded-lg shadow-lg p-3 transition-all duration-300 transform animate-in slide-in-from-top-2">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                <Icon 
                  path="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                  className="w-4 h-4 text-amber-600 dark:text-amber-400" 
                />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                High demand today
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                If you hit limits, try again in a few hours
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
              aria-label="Dismiss notification"
            >
              <Icon path="M6 18L18 6M6 6l12 12" className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RateLimitToast;