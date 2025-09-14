import React, { useState, useEffect } from 'react';
import Icon from './Icon';

interface GenerationProgressProps {
  styles: string[];
  currentIndex?: number;
  completedCount?: number;
  className?: string;
}

const GenerationProgress: React.FC<GenerationProgressProps> = ({ 
  styles, 
  currentIndex = 0,
  completedCount = 0,
  className = '' 
}) => {
  const [animatedDots, setAnimatedDots] = useState('');
  
  // Animate dots
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimatedDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg ${className}`}>
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Creating Your Wedding Portraits{animatedDots}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          AI is generating 3 unique styles for you
        </p>
      </div>

      <div className="space-y-4">
        {styles.map((style, index) => {
          const isCompleted = index < completedCount;
          const isInProgress = index === currentIndex && !isCompleted;
          const isPending = index > currentIndex && !isCompleted;

          return (
            <div key={style} className="flex items-center gap-4">
              <div className={`
                flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center
                transition-all duration-300
                ${isCompleted 
                  ? 'bg-green-500 text-white' 
                  : isInProgress 
                    ? 'bg-blue-500 text-white animate-pulse' 
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
                }
              `}>
                {isCompleted ? (
                  <Icon 
                    path="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"
                    className="w-5 h-5"
                  />
                ) : isInProgress ? (
                  <Icon 
                    path="M12 4V2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10h-2c0 4.41-3.59 8-8 8s-8-3.59-8-8 3.59-8 8-8z"
                    className="w-5 h-5 animate-spin"
                  />
                ) : (
                  <span className="text-sm font-medium">{index + 1}</span>
                )}
              </div>
              
              <div className="flex-1">
                <h4 className={`
                  font-medium transition-colors duration-300
                  ${isCompleted 
                    ? 'text-gray-900 dark:text-white' 
                    : isInProgress 
                      ? 'text-blue-600 dark:text-blue-400' 
                      : 'text-gray-400 dark:text-gray-600'
                  }
                `}>
                  {style}
                </h4>
                <div className="mt-1">
                  {isInProgress && (
                    <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full animate-progress" />
                    </div>
                  )}
                  {isCompleted && (
                    <p className="text-xs text-green-600 dark:text-green-400">Complete!</p>
                  )}
                  {isPending && (
                    <p className="text-xs text-gray-400">Waiting...</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {completedCount === styles.length 
            ? '✨ All portraits generated successfully!' 
            : `Generating portrait ${Math.min(currentIndex + 1, styles.length)} of ${styles.length}...`
          }
        </p>
      </div>

      <style jsx>{`
        @keyframes progress {
          0% { width: 0%; }
          100% { width: 100%; }
        }
        .animate-progress {
          animation: progress 20s ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default GenerationProgress;