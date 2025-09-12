import React from 'react';
import { useTheme } from '../hooks/useTheme';
import Icon from './Icon';

interface ThemeToggleProps {
  className?: string;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '' }) => {
  const { theme, toggleTheme, isDark } = useTheme();

  const handleClick = () => {
    toggleTheme();
  };

  return (
    <button
      onClick={handleClick}
      className={`
        relative w-12 h-12 rounded-lg flex items-center justify-center
        transition-all duration-300 ease-in-out
        bg-gray-100 dark:bg-gray-800 
        border border-gray-300 dark:border-gray-600
        hover:bg-gray-200 dark:hover:bg-gray-700
        active:scale-95
        ${className}
      `}
      style={{
        backgroundColor: isDark ? '#374151' : '#f3f4f6',
        borderColor: isDark ? '#4b5563' : '#d1d5db'
      }}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      <div className="relative w-6 h-6">
        {/* Sun icon for light mode */}
        <Icon
          path="M12 17.5c3.03 0 5.5-2.47 5.5-5.5S15.03 6.5 12 6.5 6.5 9.47 6.5 12s2.47 5.5 5.5 5.5zM12 9c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zM11 2h2v3h-2V2zm0 17h2v3h-2v-3zM2 11v2h3v-2H2zm17 0v2h3v-2h-2zM5.99 4.58L7.4 6l-1.41 1.41L4.58 5.99 5.99 4.58zM18.01 19.42L16.6 18l1.41-1.41 1.41 1.41-1.41 1.42zM16.6 6l1.41-1.42 1.41 1.42L18.01 7.4 16.6 6zM4.58 18.01L6 16.6l1.41 1.41-1.41 1.41L4.58 18.01z"
          className={`
            absolute inset-0 w-6 h-6 transition-all duration-300
            text-amber-500 dark:text-amber-400
            ${isDark ? 'opacity-0 rotate-90 scale-75' : 'opacity-100 rotate-0 scale-100'}
          `}
        />
        
        {/* Moon icon for dark mode */}
        <Icon
          path="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"
          className={`
            absolute inset-0 w-6 h-6 transition-all duration-300
            text-slate-700 dark:text-slate-300
            ${isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-75'}
          `}
        />
      </div>
    </button>
  );
};

export default ThemeToggle;