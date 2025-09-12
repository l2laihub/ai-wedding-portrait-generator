import { useState, useEffect } from 'react';

interface ViewportDimensions {
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  orientation: 'portrait' | 'landscape';
}

const MOBILE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 1024;

export const useViewport = (): ViewportDimensions => {
  const [viewport, setViewport] = useState<ViewportDimensions>(() => {
    // Initialize with safe defaults for SSR
    if (typeof window === 'undefined') {
      return {
        width: MOBILE_BREAKPOINT,
        height: 600,
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        orientation: 'portrait'
      };
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    
    return {
      width,
      height,
      isMobile: width < MOBILE_BREAKPOINT,
      isTablet: width >= MOBILE_BREAKPOINT && width < TABLET_BREAKPOINT,
      isDesktop: width >= TABLET_BREAKPOINT,
      orientation: width > height ? 'landscape' : 'portrait'
    };
  });

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const handleResize = () => {
      // Debounce resize events to improve performance
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        setViewport({
          width,
          height,
          isMobile: width < MOBILE_BREAKPOINT,
          isTablet: width >= MOBILE_BREAKPOINT && width < TABLET_BREAKPOINT,
          isDesktop: width >= TABLET_BREAKPOINT,
          orientation: width > height ? 'landscape' : 'portrait'
        });
      }, 100);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    
    // Call once to set initial values
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      clearTimeout(timeoutId);
    };
  }, []);

  return viewport;
};