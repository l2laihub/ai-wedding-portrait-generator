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

interface PWAInstallPromptProps {
  className?: string;
}

const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({ className = '' }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

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
      
      // Check for installed PWA
      if (document.referrer.includes('android-app://')) {
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
      
      // Show install banner after a short delay (better UX)
      setTimeout(() => {
        if (!isInstalled) {
          setShowInstallBanner(true);
        }
      }, 3000);
    };

    // Listen for app installed
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowInstallBanner(false);
      setDeferredPrompt(null);
      
      // Track installation in PostHog
      if ((window as any).posthog) {
        (window as any).posthog.capture('pwa_installed', {
          platform: 'android/desktop',
          timestamp: new Date().toISOString()
        });
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isInstalled]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      // Track user choice in PostHog
      if ((window as any).posthog) {
        (window as any).posthog.capture('pwa_install_prompt_response', {
          outcome,
          platform: 'android/desktop',
          timestamp: new Date().toISOString()
        });
      }

      if (outcome === 'accepted') {
        setShowInstallBanner(false);
      }
      
      setDeferredPrompt(null);
    } catch (error) {
      console.error('Error during install prompt:', error);
    }
  };

  const handleDismiss = () => {
    setShowInstallBanner(false);
    
    // Track dismissal in PostHog
    if ((window as any).posthog) {
      (window as any).posthog.capture('pwa_install_banner_dismissed', {
        platform: isIOS ? 'ios' : 'android/desktop',
        timestamp: new Date().toISOString()
      });
    }
    
    // Don't show again for this session
    sessionStorage.setItem('pwa_banner_dismissed', 'true');
  };

  // Don't show if already installed or dismissed this session
  if (isInstalled || sessionStorage.getItem('pwa_banner_dismissed')) {
    return null;
  }

  // iOS Safari install instructions
  if (isIOS && showInstallBanner) {
    return (
      <div className={`fixed bottom-4 left-4 right-4 z-50 ${className}`}>
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 rounded-xl shadow-lg border border-purple-400/30">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <Icon 
                  path="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" 
                  className="w-5 h-5 text-white" 
                />
              </div>
              <div className="flex-1">
                <div className="font-semibold mb-1">Install WedAI App</div>
                <div className="text-sm text-purple-100 mb-3">
                  Add to your home screen for quick access to AI wedding portraits
                </div>
                <div className="text-xs text-purple-200 bg-purple-800/30 p-2 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon path="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" className="w-3 h-3" />
                    <span>Tap the share button</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Icon path="M12 6v6m0 0v6m0-6h6m-6 0H6" className="w-3 h-3" />
                    <span>Then "Add to Home Screen"</span>
                  </div>
                </div>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="text-purple-200 hover:text-white transition-colors flex-shrink-0"
              aria-label="Dismiss install prompt"
            >
              <Icon path="M6 18L18 6M6 6l12 12" className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Android/Desktop install banner
  if (deferredPrompt && showInstallBanner) {
    return (
      <div className={`fixed bottom-4 left-4 right-4 z-50 ${className}`}>
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 rounded-xl shadow-lg border border-purple-400/30">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Icon 
                  path="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" 
                  className="w-5 h-5 text-white" 
                />
              </div>
              <div className="flex-1">
                <div className="font-semibold">Install WedAI App</div>
                <div className="text-sm text-purple-100">
                  Get the full app experience on your device
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleInstallClick}
                className="bg-white text-purple-600 px-4 py-2 rounded-lg font-medium hover:bg-purple-50 transition-colors text-sm"
              >
                Install
              </button>
              <button
                onClick={handleDismiss}
                className="text-purple-200 hover:text-white transition-colors p-1"
                aria-label="Dismiss install prompt"
              >
                <Icon path="M6 18L18 6M6 6l12 12" className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default PWAInstallPrompt;