import React from 'react';
import { useTheme } from '../hooks/useTheme';

const ThemeDebug: React.FC = () => {
  const { theme, isDark } = useTheme();
  
  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 text-black dark:text-white p-3 rounded-lg text-xs shadow-lg">
      <div className="font-bold mb-1">🐛 Theme Debug</div>
      <div>Theme: {theme}</div>
      <div>isDark: {isDark.toString()}</div>
      <div>HTML class: {document.documentElement.className}</div>
      <div className="test-dark-mode p-1 mt-1 text-white rounded">
        Test: {isDark ? 'Should be GREEN' : 'Should be RED'}
      </div>
      <div className="bg-red-500 dark:bg-green-500 p-1 mt-1 text-white rounded">
        Tailwind: {isDark ? 'Should be GREEN' : 'Should be RED'}
      </div>
    </div>
  );
};

export default ThemeDebug;