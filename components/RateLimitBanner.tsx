import React, { useState } from 'react';
import Icon from './Icon';

interface RateLimitBannerProps {
  className?: string;
  onDismiss?: () => void;
  variant?: 'subtle' | 'prominent';
}

const RateLimitBanner: React.FC<RateLimitBannerProps> = ({ 
  className = '', 
  onDismiss,
  variant = 'subtle'
}) => {
  const [isDismissed, setIsDismissed] = useState(() => {
    return sessionStorage.getItem('rate-limit-banner-dismissed') === 'true';
  });

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem('rate-limit-banner-dismissed', 'true');
    onDismiss?.();
  };

  // Don't show if dismissed
  if (isDismissed) {
    return null;
  }

  // Subtle variant - compact and integrated
  if (variant === 'subtle') {
    return (
      <div className={`bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-800/30 rounded-lg px-3 py-2 ${className}`}>
        <div className="flex items-center gap-2">
          <Icon 
            path="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
            className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" 
          />
          <div className="flex-1 min-w-0">
            <span className="text-xs text-amber-800 dark:text-amber-200 font-medium">
              High demand today
            </span>
            <span className="text-xs text-amber-700 dark:text-amber-300 ml-1">
              - Try again if you hit limits
            </span>
          </div>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-amber-500 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-200 transition-colors p-0.5"
            aria-label="Dismiss notice"
          >
            <Icon path="M6 18L18 6M6 6l12 12" className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  }

  // Prominent variant - full banner
  return (
    <div className={`bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <Icon 
            path="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5l-6.928-12c-.77-.833-2.694-.833-3.464 0L3.34 16.5C2.57 18.333 3.532 20 5.072 20z" 
            className="w-5 h-5 text-amber-500 dark:text-amber-400" 
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">
            High Demand Notice
          </div>
          <div className="text-sm text-amber-700 dark:text-amber-300">
            Our AI wedding portrait generator is experiencing high demand! If you encounter any limits, 
            please try again in a few hours. We're working to increase capacity.
          </div>
          <div className="mt-3 flex flex-col sm:flex-row gap-2">
            <a
              href="https://ai.google.dev/gemini-api/docs/rate-limits"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 transition-colors"
            >
              <Icon path="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" className="w-3 h-3" />
              Learn about API limits
            </a>
            <div className="text-xs text-amber-600 dark:text-amber-400">
              • Quotas reset daily at midnight PT
            </div>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-amber-500 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-200 transition-colors"
          aria-label="Dismiss notice"
        >
          <Icon path="M6 18L18 6M6 6l12 12" className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default RateLimitBanner;