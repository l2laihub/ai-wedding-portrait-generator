import React, { useState, useRef, useEffect } from 'react';
import Icon from './Icon';
import { useViewport } from '../hooks/useViewport';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

interface PromptInputProps {
  onSubmit: () => void;
  isLoading: boolean;
  customPrompt: string;
  onCustomPromptChange: (value: string) => void;
}

const PromptInput: React.FC<PromptInputProps> = ({ 
  onSubmit, 
  isLoading, 
  customPrompt, 
  onCustomPromptChange 
}) => {
  const { isMobile, orientation } = useViewport();
  const { isSlowConnection, isOnline } = useNetworkStatus();
  const [isExpanded, setIsExpanded] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea on mobile
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea && isMobile) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  }, [customPrompt, isMobile]);

  const getContainerClasses = () => {
    const baseClasses = "w-full mx-auto mt-8 flex flex-col items-center gap-4";
    if (isMobile) {
      return `${baseClasses} max-w-full px-4`;
    }
    return `${baseClasses} max-w-2xl`;
  };

  const getTextareaRows = () => {
    if (isMobile) {
      return orientation === 'portrait' ? (isExpanded ? 3 : 2) : 1;
    }
    return 2;
  };

  const getButtonClasses = () => {
    const baseClasses = `
      bg-gradient-to-r from-blue-600 to-teal-600 text-white font-bold rounded-lg shadow-lg
      disabled:bg-gray-600 disabled:cursor-not-allowed 
      transition-all duration-300 flex items-center gap-3
    `;
    
    if (isMobile) {
      return `${baseClasses} py-4 px-6 text-base w-full justify-center
              active:scale-95 hover:from-blue-700 hover:to-teal-700`;
    }
    return `${baseClasses} py-3 px-6 text-lg hover:from-blue-700 hover:to-teal-700 
            transform hover:scale-105`;
  };

  const handleSubmit = () => {
    if (!isOnline) {
      alert('Please check your internet connection and try again.');
      return;
    }
    onSubmit();
  };

  const placeholderText = isMobile 
    ? "Add details... (e.g., 'vintage style', 'outdoor setting')"
    : "Add a creative touch... (e.g., 'in the style of Monet', 'add a golden retriever')";

  return (
    <div className={getContainerClasses()}>
      <div className="w-full relative">
        <textarea
          ref={textareaRef}
          value={customPrompt}
          onChange={(e) => onCustomPromptChange(e.target.value)}
          onFocus={() => isMobile && setIsExpanded(true)}
          onBlur={() => isMobile && setIsExpanded(false)}
          disabled={isLoading}
          placeholder={placeholderText}
          className={`
            w-full bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg p-3 
            text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 
            focus:ring-purple-500 focus:border-purple-500 
            transition-all duration-300 ease-in-out resize-none
            ${isMobile ? 'text-base' : 'text-sm'}
            ${isExpanded ? 'border-purple-500' : ''}
          `}
          rows={getTextareaRows()}
          maxLength={200}
        />
        {customPrompt.length > 0 && (
          <div className="absolute bottom-2 right-2 text-xs text-gray-500 dark:text-gray-400">
            {customPrompt.length}/200
          </div>
        )}
      </div>

      {/* Connection status warning for mobile */}
      {isMobile && !isOnline && (
        <div className="w-full p-3 bg-red-900 border border-red-700 text-red-300 rounded-lg text-sm">
          <div className="flex items-center gap-2">
            <Icon path="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" className="w-4 h-4" />
            <span>No internet connection</span>
          </div>
        </div>
      )}

      {isMobile && isSlowConnection && isOnline && (
        <div className="w-full p-3 bg-yellow-900 border border-yellow-700 text-yellow-300 rounded-lg text-sm">
          <div className="flex items-center gap-2">
            <Icon path="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" className="w-4 h-4" />
            <span>Slow connection detected - generation may take longer</span>
          </div>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={isLoading || !isOnline}
        className={getButtonClasses()}
      >
        {isLoading ? (
          <>
            <Icon 
              path="M12 4.5C7.5 4.5 4.73 7.5 4.5 12h-2c.28-5.5 4.53-9.5 9.5-9.5s9.22 4 9.5 9.5h-2c-.23-4.5-3-7.5-7.5-7.5zM12 19.5c-4.5 0-7.27-3-7.5-7.5h2c.23 4.5 3 7.5 7.5 7.5s7.27-3 7.5-7.5h2c-.28 5.5-4.53 9.5-9.5 9.5z" 
              className={`animate-spin ${isMobile ? 'w-5 h-5' : 'w-6 h-6'}`} 
            />
            <span>{isMobile ? 'Creating Portraits...' : 'Generating Portraits...'}</span>
          </>
        ) : (
          <>
            <Icon 
              path="M17.5 12.5C17.5 15.26 15.26 17.5 12.5 17.5S7.5 15.26 7.5 12.5 9.74 7.5 12.5 7.5 17.5 9.74 17.5 12.5zM12.5 9.5c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3zM20 4v16H4V4h16m0-2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" 
              className={isMobile ? 'w-5 h-5' : 'w-6 h-6'} 
            />
            <span>
              {isMobile ? '🎨 Generate Portraits' : 'Generate 3 Wedding Styles'}
            </span>
          </>
        )}
      </button>

      {isMobile && (
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center px-2">
          Generating 3 styles: Classic, Rustic Barn, and Bohemian Beach
        </p>
      )}
    </div>
  );
};

export default PromptInput;