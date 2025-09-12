import { useState, useEffect } from 'react';

export type Theme = 'light' | 'dark';

export const useTheme = () => {
  // Initialize theme immediately from localStorage or default to light
  const getInitialTheme = (): Theme => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('wedai-theme') as Theme | null;
      return savedTheme || 'light';
    }
    return 'light';
  };

  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [isLoading, setIsLoading] = useState(false); // Changed to false since we initialize immediately

  useEffect(() => {
    // Ensure theme is set in localStorage
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('wedai-theme') as Theme | null;
      if (!savedTheme) {
        localStorage.setItem('wedai-theme', 'light');
      }
    }
  }, []);

  useEffect(() => {
    // Apply theme to document immediately
    if (typeof window !== 'undefined') {
      // Remove all theme classes first
      document.documentElement.classList.remove('dark', 'light');
      document.body.classList.remove('dark', 'light');
      
      // Add the current theme class
      document.documentElement.classList.add(theme);
      document.body.classList.add(theme);
      
      // Update meta theme color
      const metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (metaThemeColor) {
        metaThemeColor.setAttribute('content', theme === 'dark' ? '#1F2937' : '#3B82F6');
      }
      
      // Update body background immediately for smooth transition
      document.body.style.backgroundColor = theme === 'dark' ? '#111827' : '#f8fafc';
      
      // Force Tailwind to re-scan for classes (if using CDN)
      try {
        if ((window as any).tailwind && (window as any).tailwind.refresh) {
          (window as any).tailwind.refresh();
        }
      } catch (e) {
        // Tailwind refresh not available
      }
    }
  }, [theme]);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('wedai-theme', newTheme);
  };

  const setLightTheme = () => {
    setTheme('light');
    localStorage.setItem('wedai-theme', 'light');
  };

  const setDarkTheme = () => {
    setTheme('dark');
    localStorage.setItem('wedai-theme', 'dark');
  };

  return {
    theme,
    isLoading,
    toggleTheme,
    setLightTheme,
    setDarkTheme,
    isDark: theme === 'dark',
    isLight: theme === 'light'
  };
};