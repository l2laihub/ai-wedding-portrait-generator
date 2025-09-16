import { useState, useEffect } from 'react';

export type Theme = 'light' | 'dark' | 'system';

export const useTheme = () => {
  // Initialize theme immediately from localStorage or default to system
  const getInitialTheme = (): Theme => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('wedai-theme') as Theme | null;
      return savedTheme || 'system';
    }
    return 'system';
  };

  // Get the actual theme to apply (resolve system to light/dark)
  const getResolvedTheme = (themePreference: Theme): 'light' | 'dark' => {
    if (themePreference === 'system') {
      if (typeof window !== 'undefined') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      return 'light';
    }
    return themePreference;
  };

  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [isLoading, setIsLoading] = useState(false); // Changed to false since we initialize immediately

  useEffect(() => {
    // Ensure theme is set in localStorage
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('wedai-theme') as Theme | null;
      if (!savedTheme) {
        localStorage.setItem('wedai-theme', 'system');
      }
    }
  }, []);

  useEffect(() => {
    // Apply theme to document immediately
    if (typeof window !== 'undefined') {
      const resolvedTheme = getResolvedTheme(theme);
      
      // Remove all theme classes first
      document.documentElement.classList.remove('dark', 'light');
      document.body.classList.remove('dark', 'light');
      
      // Add the resolved theme class
      document.documentElement.classList.add(resolvedTheme);
      document.body.classList.add(resolvedTheme);
      
      // Update meta theme color
      const metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (metaThemeColor) {
        metaThemeColor.setAttribute('content', resolvedTheme === 'dark' ? '#1F2937' : '#3B82F6');
      }
      
      // Update body background immediately for smooth transition
      document.body.style.backgroundColor = resolvedTheme === 'dark' ? '#111827' : '#f8fafc';
      
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

  // Listen for system theme changes when using system theme
  useEffect(() => {
    if (theme === 'system' && typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => {
        // Trigger a re-render by updating a dummy state or just force re-application
        const resolvedTheme = getResolvedTheme('system');
        document.documentElement.classList.remove('dark', 'light');
        document.body.classList.remove('dark', 'light');
        document.documentElement.classList.add(resolvedTheme);
        document.body.classList.add(resolvedTheme);
        document.body.style.backgroundColor = resolvedTheme === 'dark' ? '#111827' : '#f8fafc';
      };
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  const setThemePreference = (newTheme: Theme) => {
    console.log('Setting theme to:', newTheme);
    setTheme(newTheme);
    localStorage.setItem('wedai-theme', newTheme);
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setThemePreference(newTheme);
  };

  const setLightTheme = () => {
    setThemePreference('light');
  };

  const setDarkTheme = () => {
    setThemePreference('dark');
  };

  const setSystemTheme = () => {
    setThemePreference('system');
  };

  const resolvedTheme = getResolvedTheme(theme);

  return {
    theme,
    resolvedTheme,
    isLoading,
    toggleTheme,
    setTheme: setThemePreference,
    setLightTheme,
    setDarkTheme,
    setSystemTheme,
    isDark: resolvedTheme === 'dark',
    isLight: resolvedTheme === 'light',
    isSystem: theme === 'system'
  };
};