import React, { useState, useEffect, useRef, ReactNode } from 'react';
import { useViewport } from '../hooks/useViewport';
import { useHapticFeedback } from './MobileEnhancements';
import Icon from './Icon';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  snapPoints?: number[]; // Percentage heights [25, 50, 90]
  initialSnap?: number; // Index of initial snap point
  showHandle?: boolean;
  maxHeight?: string;
  className?: string;
}

const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
  snapPoints = [50, 90],
  initialSnap = 0,
  showHandle = true,
  maxHeight,
  className = ''
}) => {
  const { isMobile } = useViewport();
  const { triggerHaptic } = useHapticFeedback();
  
  const [currentSnapIndex, setCurrentSnapIndex] = useState(initialSnap);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [startY, setStartY] = useState(0);
  const [velocityY, setVelocityY] = useState(0);
  const [lastY, setLastY] = useState(0);
  const [lastTime, setLastTime] = useState(0);
  
  const sheetRef = useRef<HTMLDivElement>(null);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${window.scrollY}px`;
      document.body.style.width = '100%';
    } else {
      const scrollY = document.body.style.top;
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
    }
    
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
    };
  }, [isOpen]);

  // Handle touch events for dragging
  useEffect(() => {
    if (!sheetRef.current || !isMobile) return;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      setStartY(touch.clientY);
      setLastY(touch.clientY);
      setLastTime(Date.now());
      setIsDragging(true);
      setVelocityY(0);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;
      
      const touch = e.touches[0];
      const currentY = touch.clientY;
      const currentTime = Date.now();
      
      // Calculate velocity
      if (currentTime - lastTime > 0) {
        setVelocityY((currentY - lastY) / (currentTime - lastTime));
      }
      
      const diff = currentY - startY;
      
      // Only allow downward drag or small upward drag
      if (diff > 0 || (diff < 0 && Math.abs(diff) < 50)) {
        e.preventDefault();
        setDragOffset(Math.max(diff, -50));
      }
      
      setLastY(currentY);
      setLastTime(currentTime);
    };

    const handleTouchEnd = () => {
      if (!isDragging) return;
      
      setIsDragging(false);
      
      const currentHeight = window.innerHeight * (snapPoints[currentSnapIndex] / 100);
      const dragThreshold = currentHeight * 0.3;
      const velocityThreshold = 0.5;
      
      // Determine next snap point based on drag distance and velocity
      if (dragOffset > dragThreshold || velocityY > velocityThreshold) {
        if (currentSnapIndex > 0) {
          // Move to smaller snap point
          const newIndex = currentSnapIndex - 1;
          setCurrentSnapIndex(newIndex);
          triggerHaptic('light');
        } else {
          // Close the sheet
          triggerHaptic('medium');
          onClose();
        }
      } else if (dragOffset < -30 || velocityY < -velocityThreshold) {
        if (currentSnapIndex < snapPoints.length - 1) {
          // Move to larger snap point
          const newIndex = currentSnapIndex + 1;
          setCurrentSnapIndex(newIndex);
          triggerHaptic('light');
        }
      }
      
      setDragOffset(0);
    };

    const sheet = sheetRef.current;
    const handle = sheet.querySelector('.bottom-sheet-handle');
    const header = sheet.querySelector('.bottom-sheet-header');
    
    // Add touch listeners to handle and header
    handle?.addEventListener('touchstart', handleTouchStart, { passive: false });
    handle?.addEventListener('touchmove', handleTouchMove, { passive: false });
    handle?.addEventListener('touchend', handleTouchEnd);
    
    header?.addEventListener('touchstart', handleTouchStart, { passive: false });
    header?.addEventListener('touchmove', handleTouchMove, { passive: false });
    header?.addEventListener('touchend', handleTouchEnd);

    return () => {
      handle?.removeEventListener('touchstart', handleTouchStart);
      handle?.removeEventListener('touchmove', handleTouchMove);
      handle?.removeEventListener('touchend', handleTouchEnd);
      
      header?.removeEventListener('touchstart', handleTouchStart);
      header?.removeEventListener('touchmove', handleTouchMove);
      header?.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, startY, dragOffset, currentSnapIndex, snapPoints, onClose, triggerHaptic, velocityY, lastY, lastTime, isMobile]);

  if (!isMobile) {
    // Fallback to regular modal on desktop
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />
        <div className="relative bg-white dark:bg-gray-800 rounded-lg w-full max-w-md max-h-[80vh] overflow-hidden">
          {title && (
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">{title}</h3>
              <button onClick={onClose} className="p-1">
                <Icon path="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" className="w-5 h-5" />
              </button>
            </div>
          )}
          <div className="overflow-y-auto">{children}</div>
        </div>
      </div>
    );
  }

  const currentSnapHeight = snapPoints[currentSnapIndex];
  const actualHeight = maxHeight 
    ? Math.min(currentSnapHeight, parseInt(maxHeight.replace('vh', ''))) 
    : currentSnapHeight;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`
          fixed inset-0 bg-black transition-opacity duration-300 z-40
          ${isOpen ? 'opacity-50' : 'opacity-0 pointer-events-none'}
        `}
        onClick={onClose}
      />

      {/* Bottom Sheet */}
      <div
        ref={sheetRef}
        className={`
          fixed bottom-0 left-0 right-0 z-50
          bg-white dark:bg-gray-800 rounded-t-3xl
          transition-all duration-300 ease-out
          ${isDragging ? 'transition-none' : ''}
          ${className}
        `}
        style={{
          height: `${actualHeight}vh`,
          transform: `translateY(${
            isOpen 
              ? isDragging ? `${dragOffset}px` : '0%'
              : '100%'
          })`,
          paddingBottom: 'env(safe-area-inset-bottom)',
          boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.1)'
        }}
      >
        {/* Handle */}
        {showHandle && (
          <div className="bottom-sheet-handle flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing">
            <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
          </div>
        )}

        {/* Header */}
        {title && (
          <div className="bottom-sheet-header flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <Icon 
                path="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
                className="w-5 h-5 text-gray-600 dark:text-gray-400"
              />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>

        {/* Snap point indicators */}
        {snapPoints.length > 1 && (
          <div className="absolute top-4 right-4 flex flex-col gap-1">
            {snapPoints.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setCurrentSnapIndex(index);
                  triggerHaptic('light');
                }}
                className={`
                  w-2 h-2 rounded-full transition-colors
                  ${index === currentSnapIndex 
                    ? 'bg-purple-600' 
                    : 'bg-gray-300 dark:bg-gray-600'
                  }
                `}
                style={{ WebkitTapHighlightColor: 'transparent' }}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default BottomSheet;