import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { useHapticFeedback } from './MobileEnhancements';
import { rateLimiter } from '../utils/rateLimiter';
import { creditsService } from '../services/creditsService';
import Icon from './Icon';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  navigate?: (route: 'home' | 'privacy' | 'terms') => void;
}

interface DrawerItem {
  id: string;
  label: string;
  icon: string;
  onClick: () => void;
  badge?: number;
  divider?: boolean;
}

const MobileDrawer: React.FC<MobileDrawerProps> = ({ isOpen, onClose, navigate }) => {
  const { user, isAuthenticated, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { triggerHaptic } = useHapticFeedback();
  const drawerRef = useRef<HTMLDivElement>(null);
  const startX = useRef<number | null>(null);
  const currentX = useRef<number | null>(null);

  // Handle swipe to close
  useEffect(() => {
    if (!isOpen || !drawerRef.current) return;

    const handleTouchStart = (e: TouchEvent) => {
      startX.current = e.touches[0].clientX;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!startX.current) return;
      
      currentX.current = e.touches[0].clientX;
      const diffX = currentX.current - startX.current;
      
      // Only allow left swipe (negative diff)
      if (diffX < 0 && drawerRef.current) {
        const translateX = Math.max(diffX, -280); // Max drawer width
        drawerRef.current.style.transform = `translateX(${translateX}px)`;
      }
    };

    const handleTouchEnd = () => {
      if (!startX.current || !currentX.current || !drawerRef.current) return;
      
      const diffX = currentX.current - startX.current;
      
      // Close if swiped more than 50% of drawer width
      if (diffX < -140) {
        triggerHaptic('light');
        onClose();
      } else {
        // Snap back
        drawerRef.current.style.transform = 'translateX(0)';
      }
      
      startX.current = null;
      currentX.current = null;
    };

    const drawer = drawerRef.current;
    drawer.addEventListener('touchstart', handleTouchStart, { passive: true });
    drawer.addEventListener('touchmove', handleTouchMove, { passive: true });
    drawer.addEventListener('touchend', handleTouchEnd);

    return () => {
      drawer.removeEventListener('touchstart', handleTouchStart);
      drawer.removeEventListener('touchmove', handleTouchMove);
      drawer.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isOpen, onClose, triggerHaptic]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleItemClick = (onClick: () => void) => {
    triggerHaptic('light');
    onClick();
    onClose();
  };

  const drawerItems: DrawerItem[] = [
    {
      id: 'home',
      label: 'Home',
      icon: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z',
      onClick: () => navigate ? navigate('home') : window.location.href = '/'
    },
    {
      id: 'gallery',
      label: 'My Gallery',
      icon: 'M22 16V4c0-1.11-.89-2-2-2H8c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h12c1.11 0 2-.89 2-2zm-11-4l2.03 2.71L16 11l4 5H8l3-4zM2 6v14c0 1.11.89 2 2 2h14v-2H4V6H2z',
      onClick: () => console.log('Gallery'),
      badge: 3
    },
    {
      id: 'theme',
      label: theme === 'dark' ? 'Light Mode' : 'Dark Mode',
      icon: theme === 'dark' 
        ? 'M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z'
        : 'M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z',
      onClick: () => toggleTheme(),
      divider: true
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: 'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z',
      onClick: () => alert('Settings functionality coming soon!')
    },
    {
      id: 'help',
      label: 'Help & Support',
      icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z',
      onClick: () => alert('Help & Support: Contact us at huybuilds@gmail.com')
    },
    {
      id: 'privacy',
      label: 'Privacy Policy',
      icon: 'M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z',
      onClick: () => navigate ? navigate('privacy') : window.location.href = '/?page=privacy'
    },
    {
      id: 'terms',
      label: 'Terms of Service',
      icon: 'M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z',
      onClick: () => navigate ? navigate('terms') : window.location.href = '/?page=terms'
    }
  ];

  // Add sign out option if authenticated
  if (isAuthenticated) {
    drawerItems.push({
      id: 'signout',
      label: 'Sign Out',
      icon: 'M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z',
      onClick: () => signOut(),
      divider: true
    });
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`
          fixed inset-0 bg-black transition-opacity duration-300 z-40
          ${isOpen ? 'opacity-50 pointer-events-auto' : 'opacity-0 pointer-events-none'}
        `}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className={`
          fixed top-0 left-0 bottom-0 w-72 z-50
          bg-white dark:bg-gray-800
          transform transition-transform duration-300 ease-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        style={{
          boxShadow: isOpen ? '2px 0 10px rgba(0, 0, 0, 0.1)' : 'none',
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)'
        }}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <img 
              src="/assets/wedai_logo_notext_nobg.png" 
              alt="WedAI Logo" 
              className="w-12 h-12 object-contain"
            />
            <div className="flex-1">
              <h2 className="font-bold text-gray-900 dark:text-white">WedAI</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">AI Wedding Portraits</p>
            </div>
          </div>

          {/* User info */}
          {isAuthenticated && user && (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {user.email}
              </p>
              <PortraitCounter user={user} />
            </div>
          )}
        </div>

        {/* Menu Items */}
        <nav className="flex-1 overflow-y-auto">
          {drawerItems.map((item, index) => (
            <React.Fragment key={item.id}>
              {item.divider && index > 0 && (
                <div className="my-2 mx-4 border-t border-gray-200 dark:border-gray-700" />
              )}
              <button
                onClick={() => handleItemClick(item.onClick)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <Icon
                  path={item.icon}
                  className="w-6 h-6 text-gray-600 dark:text-gray-400"
                />
                <span className="flex-1 text-gray-900 dark:text-white font-medium">
                  {item.label}
                </span>
                {item.badge && (
                  <span className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs rounded-full h-5 px-2 flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </button>
            </React.Fragment>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Made with 💜 by HuyBuilds
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-1">
            Version 2.0.0
          </p>
        </div>
      </div>
    </>
  );
};

// Portrait Counter Component
const PortraitCounter: React.FC<{ user: any }> = ({ user }) => {
  const [counterText, setCounterText] = useState('Loading...');

  useEffect(() => {
    const updateCounter = async () => {
      try {
        if (user) {
          // For authenticated users, get credits info
          const balance = await creditsService.getBalance();
          setCounterText(`Account • ${balance.balance} credits`);
        } else {
          // For anonymous users, use rate limiter
          const stats = rateLimiter.getUsageStats();
          setCounterText(`Free Account • ${stats.remaining} portraits left`);
        }
      } catch (error) {
        if (user) {
          setCounterText('Account • Error loading credits');
        } else {
          const stats = rateLimiter.getUsageStats();
          setCounterText(`Free Account • ${stats.remaining} portraits left`);
        }
      }
    };

    updateCounter();
    
    // Update counter every 10 seconds
    const interval = setInterval(updateCounter, 10000);
    return () => clearInterval(interval);
  }, [user]);

  return (
    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
      {counterText}
    </p>
  );
};

export default MobileDrawer;