
import React, { useState, useEffect } from 'react';
import Icon from './Icon';
import { useViewport } from '../hooks/useViewport';

interface LoaderProps {
  message?: string;
}

const loadingMessages = [
  "🎨 Analyzing your photo...",
  "✨ Applying wedding magic...",
  "👰 Creating bride & groom looks...",
  "🎭 Styling the perfect scene...",
  "🖼️ Finalizing your portraits..."
];

const Loader: React.FC<LoaderProps> = ({ message = "Conjuring pixels..." }) => {
  const { isMobile } = useViewport();
  const [currentMessage, setCurrentMessage] = useState(message);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Cycle through loading messages for better UX
    let messageIndex = 0;
    let progressValue = 0;
    
    const messageInterval = setInterval(() => {
      if (messageIndex < loadingMessages.length - 1) {
        messageIndex++;
        setCurrentMessage(loadingMessages[messageIndex]);
      }
    }, 3000); // Change message every 3 seconds

    const progressInterval = setInterval(() => {
      if (progressValue < 90) { // Don't reach 100% until actually done
        progressValue += Math.random() * 15;
        setProgress(Math.min(progressValue, 90));
      }
    }, 500);

    return () => {
      clearInterval(messageInterval);
      clearInterval(progressInterval);
    };
  }, []);

  const getContainerClasses = () => {
    if (isMobile) {
      return "flex flex-col items-center justify-center p-6 text-center text-gray-400 min-h-[200px]";
    }
    return "flex flex-col items-center justify-center p-8 text-center text-gray-400";
  };

  const getIconSize = () => {
    return isMobile ? "w-12 h-12" : "w-16 h-16";
  };

  const getMessageSize = () => {
    return isMobile ? "text-base" : "text-lg";
  };

  return (
    <div className={getContainerClasses()}>
      {/* Animated Loading Spinner */}
      <div className="relative">
        <Icon 
          path="M12 4.5C7.5 4.5 4.73 7.5 4.5 12h-2c.28-5.5 4.53-9.5 9.5-9.5s9.22 4 9.5 9.5h-2c-.23-4.5-3-7.5-7.5-7.5zM12 19.5c-4.5 0-7.27-3-7.5-7.5h2c.23 4.5 3 7.5 7.5 7.5s7.27-3 7.5-7.5h2c-.28 5.5-4.53 9.5-9.5 9.5z" 
          className={`${getIconSize()} animate-spin text-purple-500`} 
        />
        
        {/* Progress ring for mobile */}
        {isMobile && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-purple-200 border-t-purple-500 animate-spin"></div>
          </div>
        )}
      </div>

      {/* Main Loading Message */}
      <p className={`mt-4 ${getMessageSize()} font-medium text-black dark:text-white`}>
        {currentMessage}
      </p>
      
      {/* Secondary Message */}
      <p className={`text-gray-500 mt-2 ${isMobile ? 'text-sm px-4' : 'text-base'}`}>
        {isMobile 
          ? "Creating your wedding portraits..." 
          : "This can take a moment, please be patient."
        }
      </p>

      {/* Progress Bar for Mobile */}
      {isMobile && (
        <div className="w-full max-w-xs mt-4">
          <div className="bg-gray-700 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            {Math.round(progress)}% Complete
          </p>
        </div>
      )}

      {/* Floating Dots Animation */}
      <div className="flex items-center gap-1 mt-4">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`
              bg-purple-500 rounded-full animate-bounce
              ${isMobile ? 'w-2 h-2' : 'w-3 h-3'}
            `}
            style={{ 
              animationDelay: `${i * 0.1}s`,
              animationDuration: '1s'
            }}
          ></div>
        ))}
      </div>

      {/* Fun Facts for Longer Waits */}
      <div className="mt-6 max-w-md">
        <p className={`text-gray-600 italic ${isMobile ? 'text-xs' : 'text-sm'}`}>
          💡 Did you know? Our AI analyzes facial features, lighting, and composition to create the perfect wedding look!
        </p>
      </div>
    </div>
  );
};

export default Loader;
