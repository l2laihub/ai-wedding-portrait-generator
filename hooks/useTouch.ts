import { useCallback, useRef } from 'react';

interface TouchHandlers {
  onTouchStart: (e: TouchEvent) => void;
  onTouchMove: (e: TouchEvent) => void;
  onTouchEnd: (e: TouchEvent) => void;
}

interface SwipeData {
  deltaX: number;
  deltaY: number;
  duration: number;
  direction: 'left' | 'right' | 'up' | 'down' | null;
}

interface UseTouchOptions {
  onSwipe?: (data: SwipeData) => void;
  onTap?: (e: TouchEvent) => void;
  onLongPress?: (e: TouchEvent) => void;
  minSwipeDistance?: number;
  maxSwipeTime?: number;
  longPressDelay?: number;
}

export const useTouch = (options: UseTouchOptions = {}): TouchHandlers => {
  const {
    onSwipe,
    onTap,
    onLongPress,
    minSwipeDistance = 50,
    maxSwipeTime = 300,
    longPressDelay = 500
  } = options;

  const touchStart = useRef<{ x: number; y: number; time: number } | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const hasMoved = useRef(false);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;

    touchStart.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };
    hasMoved.current = false;

    // Start long press timer
    if (onLongPress) {
      longPressTimer.current = setTimeout(() => {
        if (!hasMoved.current) {
          onLongPress(e);
        }
      }, longPressDelay);
    }
  }, [onLongPress, longPressDelay]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    hasMoved.current = true;
    
    // Clear long press timer on move
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    // Clear long press timer
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    if (!touchStart.current) return;

    const touch = e.changedTouches[0];
    if (!touch) return;

    const deltaX = touch.clientX - touchStart.current.x;
    const deltaY = touch.clientY - touchStart.current.y;
    const duration = Date.now() - touchStart.current.time;

    // Determine if it's a tap
    if (!hasMoved.current && duration < 200) {
      onTap?.(e);
      return;
    }

    // Determine if it's a swipe
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    if (distance >= minSwipeDistance && duration <= maxSwipeTime && onSwipe) {
      let direction: SwipeData['direction'] = null;
      
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        direction = deltaX > 0 ? 'right' : 'left';
      } else {
        direction = deltaY > 0 ? 'down' : 'up';
      }

      onSwipe({
        deltaX,
        deltaY,
        duration,
        direction
      });
    }

    touchStart.current = null;
  }, [onSwipe, onTap, minSwipeDistance, maxSwipeTime]);

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd
  };
};