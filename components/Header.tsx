import React from 'react';
import { useViewport } from '../hooks/useViewport';

const Header: React.FC = () => {
  const { isMobile, orientation } = useViewport();

  const getTitleClasses = () => {
    if (isMobile) {
      return orientation === 'portrait' ? 'text-2xl' : 'text-xl';
    }
    return 'text-4xl md:text-5xl';
  };

  const getSubtitleClasses = () => {
    if (isMobile) {
      return orientation === 'portrait' ? 'text-base' : 'text-sm';
    }
    return 'text-lg';
  };

  const getPaddingClasses = () => {
    if (isMobile) {
      return orientation === 'portrait' ? 'p-4' : 'p-3 py-2';
    }
    return 'p-6';
  };

  return (
    <header className={`text-center bg-gray-900 border-b border-gray-700 ${getPaddingClasses()}`}>
      <h1 className={`
        ${getTitleClasses()} font-extrabold text-transparent bg-clip-text 
        bg-gradient-to-r from-purple-400 to-pink-600
        ${isMobile ? 'leading-tight' : ''}
      `}>
        {isMobile ? 'AI Wedding Portraits' : 'AI Wedding Portrait Generator'}
      </h1>
      <p className={`mt-2 ${getSubtitleClasses()} text-gray-400 ${isMobile ? 'px-2' : ''}`}>
        {isMobile 
          ? 'Upload a couple photo and see them on their wedding day.'
          : 'Upload a photo of a couple and see them on their magical wedding day.'
        }
      </p>
      {isMobile && (
        <div className="mt-3 flex justify-center space-x-2 text-xs text-gray-500">
          <span>📱 Optimized for mobile</span>
          <span>•</span>
          <span>🎨 3 styles generated</span>
        </div>
      )}
    </header>
  );
};

export default Header;