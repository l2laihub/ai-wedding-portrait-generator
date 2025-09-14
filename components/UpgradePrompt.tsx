import React from 'react';
import Icon from './Icon';

interface UpgradePromptProps {
  variant?: 'banner' | 'card' | 'compact';
  className?: string;
  onJoinWaitlist?: () => void;
  showClose?: boolean;
  onClose?: () => void;
}

const UpgradePrompt: React.FC<UpgradePromptProps> = ({
  variant = 'card',
  className = '',
  onJoinWaitlist,
  showClose = false,
  onClose
}) => {
  if (variant === 'banner') {
    return (
      <div className={`bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-lg p-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Icon 
              path="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" 
              className="w-5 h-5 text-yellow-300" 
            />
            <div>
              <span className="font-semibold">Premium Plans Coming Soon!</span>
              <span className="ml-2 text-blue-100">Unlimited portraits, priority processing & more</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onJoinWaitlist}
              className="bg-white/20 hover:bg-white/30 backdrop-blur-sm px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Join Waitlist
            </button>
            {showClose && (
              <button
                onClick={onClose}
                className="text-white/70 hover:text-white transition-colors p-1"
                aria-label="Close"
              >
                <Icon path="M6 18L18 6M6 6l12 12" className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={`inline-flex items-center gap-2 bg-gradient-to-r from-blue-50 to-teal-50 dark:from-blue-900/20 dark:to-teal-900/20 text-blue-800 dark:text-blue-200 px-3 py-2 rounded-lg text-sm ${className}`}>
        <Icon 
          path="M13 10V3L4 14h7v7l9-11h-7z" 
          className="w-4 h-4 text-blue-600 dark:text-blue-400" 
        />
        <span>🚀 Launch weekend special - 50% OFF!</span>
        <button
          onClick={onJoinWaitlist}
          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 font-medium ml-1 transition-colors"
        >
          Get notified →
        </button>
      </div>
    );
  }

  // Card variant (default)
  return (
    <div className={`bg-gradient-to-br from-blue-50 via-white to-teal-50 dark:from-blue-900/20 dark:via-gray-800 dark:to-teal-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6 ${className}`}>
      {showClose && (
        <div className="flex justify-end mb-2">
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Close"
          >
            <Icon path="M6 18L18 6M6 6l12 12" className="w-4 h-4" />
          </button>
        </div>
      )}
      
      <div className="text-center">
        {/* Premium Icon */}
        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
          <Icon 
            path="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" 
            className="w-8 h-8 text-white" 
          />
        </div>

        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Premium Plans Coming Soon!
        </h3>
        
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Get ready for unlimited portraits, priority processing, and exclusive wedding themes.
        </p>

        {/* Feature List */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-3 text-left">
            <div className="w-8 h-8 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center flex-shrink-0">
              <Icon path="M5 13l4 4L19 7" className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            <span className="text-gray-700 dark:text-gray-300">
              <strong>Unlimited portraits</strong> - Generate as many as you want
            </span>
          </div>
          
          <div className="flex items-center gap-3 text-left">
            <div className="w-8 h-8 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center flex-shrink-0">
              <Icon path="M5 13l4 4L19 7" className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            <span className="text-gray-700 dark:text-gray-300">
              <strong>Priority processing</strong> - Skip the queue, get results faster
            </span>
          </div>
          
          <div className="flex items-center gap-3 text-left">
            <div className="w-8 h-8 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center flex-shrink-0">
              <Icon path="M5 13l4 4L19 7" className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            <span className="text-gray-700 dark:text-gray-300">
              <strong>Exclusive themes</strong> - Access premium wedding styles
            </span>
          </div>
          
          <div className="flex items-center gap-3 text-left">
            <div className="w-8 h-8 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center flex-shrink-0">
              <Icon path="M5 13l4 4L19 7" className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            <span className="text-gray-700 dark:text-gray-300">
              <strong>High-res downloads</strong> - Perfect quality for printing
            </span>
          </div>
        </div>

        {/* Pricing Teaser */}
        <div className="bg-white dark:bg-gray-700 rounded-lg p-4 mb-6 border border-gray-200 dark:border-gray-600">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-2 text-center">🚀 Launch Weekend Special</div>
          <div className="text-xs text-center text-orange-600 dark:text-orange-400 font-medium mb-4">50% OFF - This Weekend Only!</div>
          <div className="space-y-4">
            {/* Pricing Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                <div className="text-lg font-bold text-gray-900 dark:text-white mb-1">$4.99</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  <div className="font-medium">Starter</div>
                  <div>10 credits</div>
                  <div className="text-orange-600 dark:text-orange-400 text-[10px] mt-1">Launch Price</div>
                </div>
              </div>
              
              <div className="text-center bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border-2 border-blue-200 dark:border-blue-700">
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400 mb-1">$9.99</div>
                <div className="text-xs text-blue-600 dark:text-blue-400">
                  <div className="font-medium">Wedding</div>
                  <div>25 credits</div>
                  <div className="text-blue-600 dark:text-blue-400 text-[10px] mt-1">Most Popular</div>
                </div>
              </div>
              
              <div className="text-center bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-200 dark:border-green-700">
                <div className="text-lg font-bold text-green-600 dark:text-green-400 mb-1">$24.99</div>
                <div className="text-xs text-green-600 dark:text-green-400">
                  <div className="font-medium">Party</div>
                  <div>75 credits</div>
                  <div className="text-green-600 dark:text-green-400 text-[10px] mt-1">Best Value</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <button
          onClick={onJoinWaitlist}
          className="w-full bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-[1.02] shadow-lg"
        >
          🎁 Join Waitlist & Get 10 Bonus Credits
        </button>

        <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
          Everyone who joins gets 10 bonus credits! 50% off pricing is only for this weekend's launch 🎉
        </p>
      </div>
    </div>
  );
};

export default UpgradePrompt;