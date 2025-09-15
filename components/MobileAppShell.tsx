import React, { useState, useEffect, ReactNode, useCallback } from 'react';
import { useViewport } from '../hooks/useViewport';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useHapticFeedback } from './MobileEnhancements';
import BottomNavigation, { defaultNavItems } from './BottomNavigation';

interface NavItem {
  id: string;
  label: string;
  icon: string;
  badge?: number;
}
import MobileDrawer from './MobileDrawer';
import Icon from './Icon';

interface MobileAppShellProps {
  children: ReactNode;
  currentTab?: string;
  onTabChange?: (tabId: string) => void;
  onRefresh?: () => Promise<void>;
  showBottomNav?: boolean;
  showHeader?: boolean;
  headerTitle?: string;
  className?: string;
  navigate?: (route: 'home' | 'privacy' | 'terms') => void;
  navigationItems?: NavItem[];
}

const MobileAppShell: React.FC<MobileAppShellProps> = ({
  children,
  currentTab = 'home',
  onTabChange,
  onRefresh,
  showBottomNav = true,
  showHeader = true,
  headerTitle = 'WedAI',
  className = '',
  navigate,
  navigationItems
}) => {
  const { isMobile, orientation } = useViewport();
  const { isOnline } = useNetworkStatus();
  const { triggerHaptic } = useHapticFeedback();
  
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Pull to refresh implementation
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  
  const minPullDistance = 80;
  const maxPullDistance = 150;

  useEffect(() => {
    if (!isMobile || !onRefresh) return;

    const handleTouchStart = (e: TouchEvent) => {
      // Don't trigger pull-to-refresh if touching within gallery area
      const target = e.target as HTMLElement;
      if (target?.closest('.swipeable-gallery')) {
        return;
      }
      
      if (window.scrollY === 0) {
        setTouchStart(e.targetTouches[0].clientY);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchStart) return;
      
      // Don't trigger pull-to-refresh if touching within gallery area
      const target = e.target as HTMLElement;
      if (target?.closest('.swipeable-gallery')) {
        return;
      }
      
      const touchY = e.targetTouches[0].clientY;
      const diff = touchY - touchStart;
      
      if (diff > 0 && window.scrollY === 0) {
        e.preventDefault();
        setPullDistance(Math.min(diff, maxPullDistance));
        setTouchEnd(touchY);
        
        // Haptic feedback at threshold
        if (diff >= minPullDistance && diff < minPullDistance + 5) {
          triggerHaptic('medium');
        }
      }
    };

    const handleTouchEnd = async () => {
      if (!touchStart || !touchEnd) return;
      
      const diff = touchEnd - touchStart;
      
      if (diff >= minPullDistance) {
        setIsRefreshing(true);
        triggerHaptic('heavy');
        
        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
        }
      }
      
      setPullDistance(0);
      setTouchStart(null);
      setTouchEnd(null);
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [touchStart, touchEnd, onRefresh, isMobile, triggerHaptic]);

  // Header scroll behavior
  useEffect(() => {
    if (!isMobile || !showHeader) return;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Always show at top
      if (currentScrollY < 50) {
        setIsHeaderVisible(true);
      } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Hide when scrolling down
        setIsHeaderVisible(false);
      } else if (currentScrollY < lastScrollY) {
        // Show when scrolling up
        setIsHeaderVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    let ticking = false;
    const scrollListener = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', scrollListener, { passive: true });
    return () => window.removeEventListener('scroll', scrollListener);
  }, [lastScrollY, isMobile, showHeader]);

  // Handle orientation changes
  useEffect(() => {
    if (!isMobile) return;

    const handleOrientationChange = () => {
      // Force recalculation of viewport
      window.dispatchEvent(new Event('resize'));
    };

    window.addEventListener('orientationchange', handleOrientationChange);
    return () => window.removeEventListener('orientationchange', handleOrientationChange);
  }, [isMobile]);

  const handleTabChange = useCallback((tabId: string) => {
    if (onTabChange) {
      onTabChange(tabId);
    }
    // Scroll to top on tab change
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [onTabChange]);

  if (!isMobile) {
    return <>{children}</>;
  }

  return (
    <div 
      className={`
        mobile-app-shell min-h-screen bg-gray-50 dark:bg-gray-900
        ${className}
      `}
      style={{
        paddingTop: showHeader ? 'env(safe-area-inset-top)' : '0',
        paddingBottom: showBottomNav ? 'calc(64px + env(safe-area-inset-bottom))' : 'env(safe-area-inset-bottom)',
      }}
    >
      {/* Pull to refresh indicator */}
      {onRefresh && (
        <div
          className={`
            fixed top-0 left-0 right-0 z-50
            flex items-center justify-center
            transition-all duration-300
            ${pullDistance > 0 ? 'opacity-100' : 'opacity-0'}
          `}
          style={{
            transform: `translateY(${Math.min(pullDistance - 40, 60)}px)`,
            paddingTop: 'env(safe-area-inset-top)'
          }}
        >
          <div className={`
            bg-white dark:bg-gray-800 rounded-full p-3 shadow-lg
            ${isRefreshing || pullDistance >= minPullDistance ? 'animate-spin' : ''}
          `}>
            <Icon
              path="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"
              className="w-6 h-6 text-cyan-600 dark:text-cyan-400"
            />
          </div>
        </div>
      )}

      {/* Mobile Header */}
      {showHeader && (
        <header
          className={`
            fixed top-0 left-0 right-0 z-40
            bg-white dark:bg-gray-800
            border-b border-gray-200 dark:border-gray-700
            transition-transform duration-300
            ${isHeaderVisible ? 'translate-y-0' : '-translate-y-full'}
          `}
          style={{
            paddingTop: 'env(safe-area-inset-top)',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
          }}
        >
          <div className="flex items-center justify-between h-14 px-4">
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="p-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <Icon
                path="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"
                className="w-6 h-6 text-gray-700 dark:text-gray-300"
              />
            </button>

            <h1 className="text-lg font-bold text-gray-900 dark:text-white">
              {headerTitle}
            </h1>

            <div className="flex items-center gap-2">
              {!isOnline && (
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              )}
              <img 
                src="/assets/wedai_logo_notext_nobg.png" 
                alt="WedAI Logo" 
                className="w-10 h-10 object-contain"
              />
            </div>
          </div>
        </header>
      )}

      {/* Main Content Area */}
      <main 
        className={`
          ${showHeader ? 'pt-14' : ''}
          ${orientation === 'landscape' ? 'px-safe' : ''}
        `}
        style={{
          paddingTop: showHeader ? 'calc(56px + env(safe-area-inset-top))' : '0',
          minHeight: `calc(100vh - ${showBottomNav ? '64px' : '0'}px - env(safe-area-inset-bottom))`,
          transform: isRefreshing ? 'translateY(40px)' : 'translateY(0)',
          transition: 'transform 0.3s'
        }}
      >
        {children}
      </main>

      {/* Bottom Navigation */}
      {showBottomNav && (
        <BottomNavigation
          activeTab={currentTab}
          onTabChange={handleTabChange}
          items={navigationItems || defaultNavItems}
        />
      )}

      {/* Navigation Drawer */}
      <MobileDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        navigate={navigate}
      />

      {/* Offline indicator toast */}
      {!isOnline && (
        <div className="fixed bottom-20 left-4 right-4 z-30 animate-in slide-in-from-bottom duration-300">
          <div className="bg-red-900 text-red-100 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2">
            <Icon
              path="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"
              className="w-5 h-5"
            />
            <span className="text-sm font-medium">You're offline</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileAppShell;