import React, { useState, useEffect } from 'react';
import { useViewport } from '../hooks/useViewport';
import { useHapticFeedback } from './MobileEnhancements';
import Icon from './Icon';

interface FABAction {
  id: string;
  label: string;
  icon: string;
  onClick: () => void;
  color?: string;
}

interface FloatingActionButtonProps {
  onClick?: () => void;
  icon?: string;
  label?: string;
  actions?: FABAction[];
  hideOnScroll?: boolean;
  className?: string;
}

const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onClick,
  icon = 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z',
  label,
  actions = [],
  hideOnScroll = true,
  className = ''
}) => {
  const { isMobile } = useViewport();
  const { triggerHaptic } = useHapticFeedback();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Handle scroll visibility
  useEffect(() => {
    if (!hideOnScroll || !isMobile) return;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY < lastScrollY || currentScrollY < 50) {
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
        setIsExpanded(false); // Close if expanded
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
  }, [lastScrollY, hideOnScroll, isMobile]);

  // Close on outside click
  useEffect(() => {
    if (!isExpanded) return;

    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.fab-container')) {
        setIsExpanded(false);
      }
    };

    document.addEventListener('click', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);

    return () => {
      document.removeEventListener('click', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isExpanded]);

  if (!isMobile) return null;

  const handleMainClick = () => {
    triggerHaptic('medium');
    
    if (actions.length > 0) {
      setIsExpanded(!isExpanded);
    } else if (onClick) {
      onClick();
    }
  };

  const handleActionClick = (action: FABAction) => {
    triggerHaptic('light');
    action.onClick();
    setIsExpanded(false);
  };

  return (
    <div 
      className={`
        fab-container fixed z-30
        transition-all duration-300 ease-in-out
        ${isVisible ? 'translate-y-0' : 'translate-y-32'}
        ${className}
      `}
      style={{
        bottom: 'calc(80px + env(safe-area-inset-bottom))',
        right: '16px'
      }}
    >
      {/* Backdrop when expanded */}
      {isExpanded && (
        <div className="fixed inset-0 bg-black/20 -z-10" />
      )}

      {/* Action buttons */}
      {actions.length > 0 && (
        <div 
          className={`
            absolute bottom-full right-0 mb-2 space-y-2
            transition-all duration-300
            ${isExpanded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}
          `}
        >
          {actions.map((action, index) => (
            <button
              key={action.id}
              onClick={() => handleActionClick(action)}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-full shadow-lg
                transform transition-all duration-300 active:scale-95
                ${action.color || 'bg-gray-700 text-white'}
                ${isExpanded 
                  ? 'translate-x-0 opacity-100' 
                  : 'translate-x-full opacity-0'
                }
              `}
              style={{
                transitionDelay: isExpanded ? `${index * 50}ms` : '0ms',
                WebkitTapHighlightColor: 'transparent'
              }}
            >
              <span className="text-sm font-medium whitespace-nowrap">
                {action.label}
              </span>
              <Icon path={action.icon} className="w-5 h-5" />
            </button>
          ))}
        </div>
      )}

      {/* Main FAB button */}
      <button
        onClick={handleMainClick}
        className={`
          relative overflow-hidden
          ${label ? 'px-6' : 'w-14 h-14'}
          ${label ? 'h-14' : ''}
          bg-gradient-to-br from-purple-600 to-purple-700 
          text-white rounded-full shadow-lg
          transform transition-all duration-300 active:scale-95
          hover:shadow-xl hover:from-purple-700 hover:to-purple-800
          flex items-center justify-center gap-2
          ${isExpanded && actions.length > 0 ? 'rotate-45' : ''}
        `}
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        <Icon 
          path={icon} 
          className={`w-6 h-6 transition-transform duration-300`}
        />
        {label && (
          <span className="font-medium">{label}</span>
        )}
        
        {/* Ripple effect */}
        <span className="absolute inset-0 overflow-hidden rounded-full">
          <span className="fab-ripple" />
        </span>
      </button>

      {/* Extended FAB variant with label always visible */}
      {label && !onClick && actions.length === 0 && (
        <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
          <div className="bg-gray-800 text-white px-3 py-1 rounded text-xs">
            {label}
          </div>
        </div>
      )}
    </div>
  );
};

export default FloatingActionButton;