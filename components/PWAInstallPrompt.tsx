import React, { useState, useEffect } from 'react';
import Icon from './Icon';
import { useViewport } from '../hooks/useViewport';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const { isMobile } = useViewport();

  useEffect(() => {
    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isIOSStandalone = (window.navigator as any).standalone;
    
    if (isStandalone || isIOSStandalone) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Show prompt after a delay to avoid being intrusive
      setTimeout(() => {
        setShowPrompt(true);
      }, 30000); // Wait 30 seconds
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
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
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
    } catch (error) {
      console.error('Error during install prompt:', error);
    } finally {
      setDeferredPrompt(null);
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    
    // Don't show again for this session
    sessionStorage.setItem('pwa-prompt-dismissed', 'true');
  };

  // Don't show if already installed or dismissed this session
  if (isInstalled || !showPrompt || !deferredPrompt) {
    return null;
  }

  // Check if dismissed this session
  if (sessionStorage.getItem('pwa-prompt-dismissed')) {
    return null;
  }

  return (
    <div className={`
      fixed bottom-0 left-0 right-0 z-50 p-4 
      bg-gradient-to-r from-purple-600 to-pink-600 text-white
      transform transition-transform duration-500
      ${showPrompt ? 'translate-y-0' : 'translate-y-full'}
      ${isMobile ? 'safe-area-bottom' : ''}
    `}>
      <div className="flex items-center justify-between max-w-md mx-auto">
        <div className="flex items-center gap-3 flex-1">
          <Icon 
            path="M19 12h-2V9.5c0-2.5-2-4.5-4.5-4.5S8 7 8 9.5v2.5H6c-1.1 0-2 .9-2 2v7c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-7c0-1.1-.9-2-2-2zM10 9.5c0-1.4 1.1-2.5 2.5-2.5s2.5 1.1 2.5 2.5V12h-5V9.5z"
            className="w-6 h-6 flex-shrink-0" 
          />
          <div className="flex-1 min-w-0">
            <p className={`font-semibold ${isMobile ? 'text-sm' : 'text-base'}`}>
              Install Wedding AI
            </p>
            <p className={`opacity-90 ${isMobile ? 'text-xs' : 'text-sm'}`}>
              {isMobile 
                ? 'Get the app for faster access' 
                : 'Add to home screen for quick access'
              }
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 ml-3">
          <button
            onClick={handleInstallClick}
            className={`
              bg-white text-purple-600 font-bold rounded-full 
              hover:bg-gray-100 active:scale-95
              transition-all duration-200
              ${isMobile ? 'px-3 py-2 text-sm' : 'px-4 py-2 text-base'}
            `}
          >
            Install
          </button>
          
          <button
            onClick={handleDismiss}
            className={`
              text-white opacity-75 hover:opacity-100
              transition-opacity duration-200
              ${isMobile ? 'p-1' : 'p-2'}
            `}
            aria-label="Dismiss install prompt"
          >
            <Icon 
              path="M18.3 5.71a.996.996 0 00-1.41 0L12 10.59 7.11 5.7A.996.996 0 005.7 7.11L10.59 12 5.7 16.89a.996.996 0 101.41 1.41L12 13.41l4.89 4.89a.996.996 0 101.41-1.41L13.41 12l4.89-4.89c.38-.38.38-1.02 0-1.4z" 
              className={isMobile ? 'w-5 h-5' : 'w-6 h-6'} 
            />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;