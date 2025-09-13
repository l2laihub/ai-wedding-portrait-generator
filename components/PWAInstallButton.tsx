import React, { useState, useEffect } from 'react';
import Icon from './Icon';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'button' | 'banner' | 'badge';
  size?: 'sm' | 'md' | 'lg';
}

const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ 
  className = '', 
  variant = 'button',
  size = 'md'
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    const checkIfInstalled = () => {
      if (window.navigator.standalone) {
        setIsInstalled(true);
        return;
      }
      
      if (window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true);
        return;
      }
    };

    // Check if iOS Safari
    const checkIfIOS = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
      const isSafari = /safari/.test(userAgent) && !/chrome|crios|fxios/.test(userAgent);
      setIsIOS(isIOSDevice && isSafari);
    };

    checkIfInstalled();
    checkIfIOS();

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    // Listen for app installed
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowModal(true);
      return;
    }

    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      // Track user choice in PostHog
      if ((window as any).posthog) {
        (window as any).posthog.capture('pwa_manual_install_attempt', {
          outcome,
          source: 'install_button',
          platform: 'android/desktop',
          timestamp: new Date().toISOString()
        });
      }
      
      setDeferredPrompt(null);
    } catch (error) {
      console.error('Error during install prompt:', error);
    }
  };

  // Don't show if already installed
  if (isInstalled) {
    return null;
  }

  // Don't show if no install prompt available and not iOS
  if (!deferredPrompt && !isIOS) {
    return null;
  }

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4', 
    lg: 'w-5 h-5'
  };

  // Badge variant
  if (variant === 'badge') {
    return (
      <button
        onClick={handleInstallClick}
        className={`
          inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white 
          rounded-full transition-colors font-medium
          ${sizeClasses[size]} ${className}
        `}
      >
        <Icon path="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" className={iconSizes[size]} />
        Install App
      </button>
    );
  }

  // Banner variant
  if (variant === 'banner') {
    return (
      <div className={`bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 rounded-lg ${className}`}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Icon path="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" className="w-8 h-8" />
            <div>
              <div className="font-semibold">Install WedAI App</div>
              <div className="text-sm text-purple-100">
                Quick access to AI wedding portraits on your device
              </div>
            </div>
          </div>
          <button
            onClick={handleInstallClick}
            className="bg-white text-purple-600 px-4 py-2 rounded-lg font-medium hover:bg-purple-50 transition-colors"
          >
            Install
          </button>
        </div>
      </div>
    );
  }

  // Default button variant
  return (
    <>
      <button
        onClick={handleInstallClick}
        className={`
          inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white 
          rounded-lg transition-colors font-medium
          ${sizeClasses[size]} ${className}
        `}
      >
        <Icon path="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" className={iconSizes[size]} />
        Install App
      </button>

      {/* iOS Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-sm w-full">
            <div className="text-center mb-4">
              <Icon path="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" className="w-12 h-12 mx-auto mb-3 text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Install WedAI App
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
                Add to your home screen for quick access to AI wedding portraits
              </p>
            </div>

            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 mb-4">
              <div className="text-sm space-y-2">
                <div className="flex items-center gap-2">
                  <Icon path="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" className="w-4 h-4 text-blue-500" />
                  <span className="text-gray-700 dark:text-gray-300">1. Tap the share button below</span>
                </div>
                <div className="flex items-center gap-2">
                  <Icon path="M12 6v6m0 0v6m0-6h6m-6 0H6" className="w-4 h-4 text-green-500" />
                  <span className="text-gray-700 dark:text-gray-300">2. Select "Add to Home Screen"</span>
                </div>
                <div className="flex items-center gap-2">
                  <Icon path="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" className="w-4 h-4 text-purple-500" />
                  <span className="text-gray-700 dark:text-gray-300">3. Confirm to install</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowModal(false)}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg transition-colors"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default PWAInstallButton;