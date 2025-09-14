import React, { useState, useEffect, useCallback } from 'react';
import { useViewport } from '../hooks/useViewport';
import { useHapticFeedback } from './MobileEnhancements';
import Icon from './Icon';

export interface ToastData {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  dismissible?: boolean;
}

interface MobileToastProps {
  toast: ToastData;
  onDismiss: (id: string) => void;
  index: number;
}

const MobileToast: React.FC<MobileToastProps> = ({ toast, onDismiss, index }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [progress, setProgress] = useState(100);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  
  const { isMobile } = useViewport();
  const { triggerHaptic } = useHapticFeedback();
  
  const duration = toast.duration || 4000;

  useEffect(() => {
    // Animate in
    const showTimer = setTimeout(() => setIsVisible(true), 50);
    
    // Auto dismiss
    if (duration > 0) {
      const dismissTimer = setTimeout(() => {
        handleDismiss();
      }, duration);

      // Progress animation
      const progressTimer = setInterval(() => {
        setProgress(prev => {
          const decrement = (100 / duration) * 100;
          return Math.max(0, prev - decrement);
        });
      }, 100);

      return () => {
        clearTimeout(showTimer);
        clearTimeout(dismissTimer);
        clearInterval(progressTimer);
      };
    }

    return () => clearTimeout(showTimer);
  }, [duration]);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    setTimeout(() => {
      onDismiss(toast.id);
    }, 300);
  }, [toast.id, onDismiss]);

  // Touch handlers for swipe-to-dismiss
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!toast.dismissible) return;
    setIsDragging(true);
    setProgress(100); // Pause progress during drag
  }, [toast.dismissible]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;
    
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    const offset = touch.clientX - rect.left - rect.width / 2;
    
    setDragOffset(offset);
  }, [isDragging]);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return;
    
    setIsDragging(false);
    
    // Dismiss if dragged far enough
    if (Math.abs(dragOffset) > 120) {
      triggerHaptic('medium');
      handleDismiss();
    } else {
      setDragOffset(0);
    }
  }, [isDragging, dragOffset, triggerHaptic, handleDismiss]);

  const getToastStyles = () => {
    const baseStyles = {
      success: 'bg-green-900/95 text-green-100 border-green-700',
      error: 'bg-red-900/95 text-red-100 border-red-700',
      warning: 'bg-amber-900/95 text-amber-100 border-amber-700',
      info: 'bg-blue-900/95 text-blue-100 border-blue-700'
    };
    
    return baseStyles[toast.type];
  };

  const getIcon = () => {
    const icons = {
      success: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z',
      error: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z',
      warning: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z',
      info: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z'
    };
    
    return icons[toast.type];
  };

  if (!isMobile) return null;

  return (
    <div
      className={`
        relative mb-3 mx-4 rounded-xl border backdrop-blur-sm
        transform transition-all duration-300 ease-out
        ${getToastStyles()}
        ${isVisible 
          ? 'translate-y-0 opacity-100 scale-100' 
          : 'translate-y-full opacity-0 scale-95'
        }
        ${isDragging ? 'transition-none' : ''}
      `}
      style={{
        transform: `translateY(${isVisible ? 0 : 100}%) translateX(${dragOffset}px) scale(${isVisible ? 1 : 0.95})`,
        opacity: isVisible ? Math.max(0.3, 1 - Math.abs(dragOffset) / 200) : 0,
        zIndex: 1000 - index // Stack toasts properly
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {/* Progress bar */}
      {duration > 0 && !isDragging && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-black/20 rounded-t-xl overflow-hidden">
          <div
            className="h-full bg-white/40 transition-all duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Content */}
      <div className="flex items-center gap-3 p-4">
        <Icon path={getIcon()} className="w-6 h-6 flex-shrink-0" />
        
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-5">{toast.message}</p>
        </div>

        {/* Action button */}
        {toast.action && (
          <button
            onClick={() => {
              toast.action!.onClick();
              handleDismiss();
            }}
            className="px-3 py-1 bg-white/20 rounded-full text-xs font-medium hover:bg-white/30 active:scale-95 transition-all"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            {toast.action.label}
          </button>
        )}

        {/* Dismiss button */}
        {toast.dismissible !== false && (
          <button
            onClick={handleDismiss}
            className="p-1 hover:bg-white/10 rounded-full active:scale-95 transition-all"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <Icon 
              path="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
              className="w-5 h-5"
            />
          </button>
        )}
      </div>

      {/* Swipe hint */}
      {toast.dismissible !== false && (
        <div className="absolute -right-2 top-1/2 -translate-y-1/2 opacity-30">
          <Icon 
            path="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z"
            className="w-4 h-4"
          />
        </div>
      )}
    </div>
  );
};

// Toast Manager Component
interface MobileToastManagerProps {
  toasts: ToastData[];
  onDismiss: (id: string) => void;
}

export const MobileToastManager: React.FC<MobileToastManagerProps> = ({
  toasts,
  onDismiss
}) => {
  const { isMobile } = useViewport();

  if (!isMobile || toasts.length === 0) return null;

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none"
      style={{
        paddingBottom: 'calc(80px + env(safe-area-inset-bottom))'
      }}
    >
      <div className="pointer-events-auto">
        {toasts.slice(-3).map((toast, index) => ( // Show max 3 toasts
          <MobileToast
            key={toast.id}
            toast={toast}
            onDismiss={onDismiss}
            index={index}
          />
        ))}
      </div>
    </div>
  );
};

// Hook for managing toasts
export const useMobileToasts = () => {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const showToast = useCallback((toast: Omit<ToastData, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newToast: ToastData = {
      id,
      dismissible: true,
      ...toast
    };

    setToasts(prev => [...prev, newToast]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const showSuccess = useCallback((message: string, options?: Partial<ToastData>) => {
    showToast({ message, type: 'success', ...options });
  }, [showToast]);

  const showError = useCallback((message: string, options?: Partial<ToastData>) => {
    showToast({ message, type: 'error', ...options });
  }, [showToast]);

  const showWarning = useCallback((message: string, options?: Partial<ToastData>) => {
    showToast({ message, type: 'warning', ...options });
  }, [showToast]);

  const showInfo = useCallback((message: string, options?: Partial<ToastData>) => {
    showToast({ message, type: 'info', ...options });
  }, [showToast]);

  return {
    toasts,
    showToast,
    dismissToast,
    showSuccess,
    showError,
    showWarning,
    showInfo
  };
};

export default MobileToast;