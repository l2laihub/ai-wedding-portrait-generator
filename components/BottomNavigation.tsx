import React, { useState, useEffect } from 'react';
import { useViewport } from '../hooks/useViewport';
import { useHapticFeedback } from './MobileEnhancements';
import Icon from './Icon';

interface NavItem {
  id: string;
  label: string;
  icon: string;
  badge?: number;
}

interface BottomNavigationProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  items: NavItem[];
  className?: string;
}

const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeTab,
  onTabChange,
  items,
  className = ''
}) => {
  const { isMobile } = useViewport();
  const { triggerHaptic } = useHapticFeedback();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    if (!isMobile) return;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Show when scrolling up or at the top
      if (currentScrollY < lastScrollY || currentScrollY < 50) {
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Hide when scrolling down (after 100px)
        setIsVisible(false);
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
  }, [lastScrollY, isMobile]);

  if (!isMobile) return null;

  const handleTabPress = (tabId: string) => {
    // Always trigger tab change for signin to allow reopening modal
    if (tabId === 'signin' || tabId !== activeTab) {
      triggerHaptic('light');
      onTabChange(tabId);
    }
  };

  return (
    <nav
      className={`
        fixed bottom-0 left-0 right-0 z-30
        bg-white dark:bg-gray-800 
        border-t border-gray-200 dark:border-gray-700
        transition-transform duration-300 ease-in-out
        ${isVisible ? 'translate-y-0' : 'translate-y-full'}
        ${className}
      `}
      style={{
        paddingBottom: 'env(safe-area-inset-bottom)',
        boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.1)'
      }}
    >
      <div className="flex items-center justify-around h-16">
        {items.map((item) => {
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => handleTabPress(item.id)}
              className={`
                flex-1 flex flex-col items-center justify-center
                h-full relative group
                transition-all duration-200
                ${isActive ? 'text-purple-600 dark:text-purple-400' : 'text-gray-600 dark:text-gray-400'}
              `}
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              {/* Active indicator */}
              <div
                className={`
                  absolute top-0 left-1/2 transform -translate-x-1/2
                  h-0.5 bg-purple-600 dark:bg-purple-400
                  transition-all duration-300
                  ${isActive ? 'w-12' : 'w-0'}
                `}
              />
              
              {/* Icon container */}
              <div className="relative">
                <Icon
                  path={item.icon}
                  className={`
                    w-6 h-6 transition-all duration-200
                    ${isActive ? 'transform scale-110' : ''}
                  `}
                />
                
                {/* Badge */}
                {item.badge && item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>
              
              {/* Label */}
              <span className={`
                text-xs mt-1 transition-all duration-200
                ${isActive ? 'font-semibold' : 'font-normal'}
              `}>
                {item.label}
              </span>
              
              {/* Touch feedback ripple */}
              <div className="absolute inset-0 overflow-hidden rounded">
                <span className="ripple" />
              </div>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

// Default navigation items for the app
export const defaultNavItems: NavItem[] = [
  {
    id: 'home',
    label: 'Home',
    icon: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z'
  },
  {
    id: 'gallery',
    label: 'Gallery',
    icon: 'M22 16V4c0-1.11-.89-2-2-2H8c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h12c1.11 0 2-.89 2-2zm-11-4l2.03 2.71L16 11l4 5H8l3-4zM2 6v14c0 1.11.89 2 2 2h14v-2H4V6H2z'
  },
  {
    id: 'create',
    label: 'Create',
    icon: 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z'
  },
  {
    id: 'profile',
    label: 'Profile',
    icon: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'
  }
];

export default BottomNavigation;