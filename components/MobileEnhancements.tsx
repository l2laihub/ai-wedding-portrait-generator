import React, { useEffect, useState } from 'react';
import { useViewport } from '../hooks/useViewport';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import Icon from './Icon';

// Online/Offline Status Indicator for Mobile
export const NetworkStatus: React.FC = () => {
  const { isOnline, isSlowConnection } = useNetworkStatus();
  const { isMobile } = useViewport();
  const [showStatus, setShowStatus] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setShowStatus(true);
    } else {
      // Show briefly when coming back online
      const timer = setTimeout(() => setShowStatus(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline]);

  if (!isMobile || !showStatus) return null;

  return (
    <div className={`
      fixed top-20 left-4 right-4 z-40 p-3 rounded-lg text-sm font-medium
      transition-all duration-300 transform
      ${isOnline 
        ? 'bg-green-900 border border-green-700 text-green-300' 
        : 'bg-red-900 border border-red-700 text-red-300'
      }
      ${showStatus ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}
    `}>
      <div className="flex items-center gap-2">
        <Icon 
          path={isOnline 
            ? "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
            : "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"
          } 
          className="w-4 h-4" 
        />
        <span>
          {isOnline 
            ? (isSlowConnection ? 'Back online (slow connection)' : 'Back online!') 
            : 'You are offline'
          }
        </span>
      </div>
    </div>
  );
};

// Touch Feedback Component
export const TouchFeedback: React.FC<{ children: React.ReactNode; onTouch?: () => void }> = ({ 
  children, 
  onTouch 
}) => {
  const { isMobile } = useViewport();
  const [isPressed, setIsPressed] = useState(false);

  if (!isMobile) {
    return <>{children}</>;
  }

  const handleTouchStart = () => {
    setIsPressed(true);
    onTouch?.();
  };

  const handleTouchEnd = () => {
    setIsPressed(false);
  };

  return (
    <div
      className={`
        transition-all duration-150 ease-out
        ${isPressed ? 'scale-95 opacity-80' : 'scale-100 opacity-100'}
      `}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {children}
    </div>
  );
};

// Safe Area Handler for devices with notches
export const SafeAreaWrapper: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className = '' 
}) => {
  const { isMobile } = useViewport();

  if (!isMobile) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div 
      className={`
        ${className}
        safe-area-top safe-area-bottom
        pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]
        pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]
      `}
      style={{
        paddingTop: 'max(env(safe-area-inset-top), 1rem)',
        paddingBottom: 'max(env(safe-area-inset-bottom), 1rem)',
      }}
    >
      {children}
    </div>
  );
};

// Mobile-optimized Button
export const MobileButton: React.FC<{
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
  className?: string;
}> = ({ 
  children, 
  onClick, 
  disabled = false, 
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  className = ''
}) => {
  const { isMobile } = useViewport();

  const getButtonClasses = () => {
    let baseClasses = `
      font-bold rounded-lg transition-all duration-200 flex items-center justify-center gap-2
      ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
      ${fullWidth ? 'w-full' : ''}
    `;

    // Variant classes
    if (variant === 'primary') {
      baseClasses += ` 
        bg-gradient-to-r from-cyan-500 to-blue-600 text-white 
        ${!disabled ? 'hover:from-cyan-600 hover:to-blue-700 active:from-cyan-700 active:to-blue-800' : ''}
        ${isMobile ? 'active:scale-95' : 'hover:scale-105'}
      `;
    } else {
      baseClasses += ` 
        bg-gray-700 text-gray-300 
        ${!disabled ? 'hover:bg-gray-600 active:bg-gray-800' : ''}
        ${isMobile ? 'active:scale-95' : 'hover:scale-105'}
      `;
    }

    // Size classes
    if (size === 'small') {
      baseClasses += isMobile ? ' py-2 px-4 text-sm' : ' py-2 px-3 text-sm';
    } else if (size === 'large') {
      baseClasses += isMobile ? ' py-4 px-6 text-lg' : ' py-3 px-6 text-base';
    } else {
      baseClasses += isMobile ? ' py-3 px-5 text-base' : ' py-2 px-4 text-sm';
    }

    // Mobile-specific improvements
    if (isMobile) {
      baseClasses += ' min-h-[44px] touch-manipulation'; // Minimum touch target size
    }

    return `${baseClasses} ${className}`;
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={getButtonClasses()}
      style={{ 
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation'
      }}
    >
      {children}
    </button>
  );
};

// Haptic Feedback Hook (if supported)
export const useHapticFeedback = () => {
  const triggerHaptic = (type: 'light' | 'medium' | 'heavy' = 'light') => {
    if ('vibrate' in navigator) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [30]
      };
      navigator.vibrate(patterns[type]);
    }
  };

  return { triggerHaptic };
};

// Performance Monitor for Mobile
export const PerformanceMonitor: React.FC = () => {
  const [fps, setFps] = useState<number>(0);
  const [showMonitor, setShowMonitor] = useState(false);

  useEffect(() => {
    if (!window.location.search.includes('debug=true')) return;

    let frameCount = 0;
    let lastTime = performance.now();
    
    const measureFPS = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime >= lastTime + 1000) {
        setFps(Math.round((frameCount * 1000) / (currentTime - lastTime)));
        frameCount = 0;
        lastTime = currentTime;
      }
      
      requestAnimationFrame(measureFPS);
    };
    
    measureFPS();
    setShowMonitor(true);
  }, []);

  if (!showMonitor) return null;

  return (
    <div className="fixed bottom-4 left-4 bg-black bg-opacity-75 text-white p-2 rounded text-xs z-50">
      <div>FPS: {fps}</div>
      <div>Memory: {(performance as any).memory?.usedJSHeapSize ? 
        Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024) + 'MB' : 'N/A'}
      </div>
    </div>
  );
};

export default {
  NetworkStatus,
  TouchFeedback,
  SafeAreaWrapper,
  MobileButton,
  useHapticFeedback,
  PerformanceMonitor
};