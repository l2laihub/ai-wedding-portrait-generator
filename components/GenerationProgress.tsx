import React, { useState, useEffect } from 'react';
import Icon from './Icon';

interface GenerationProgressProps {
  styles: string[];
  currentIndex?: number;
  completedCount?: number;
  className?: string;
  progressData?: Array<{
    style: string;
    status: 'waiting' | 'in_progress' | 'completed' | 'failed';
    startTime?: number;
  }>;
}

const GenerationProgress: React.FC<GenerationProgressProps> = ({ 
  styles, 
  currentIndex = 0,
  completedCount = 0,
  className = '',
  progressData
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
          // Use progressData if available, otherwise fall back to simple index-based logic
          let status: 'waiting' | 'in_progress' | 'completed' | 'failed' = 'waiting';
          
          if (progressData) {
            const styleData = progressData.find(p => p.style === style);
            status = styleData?.status || 'waiting';
          } else {
            // Fallback logic
            if (index < completedCount) status = 'completed';
            else if (index === currentIndex) status = 'in_progress';
            else status = 'waiting';
          }
          
          const isCompleted = status === 'completed';
          const isInProgress = status === 'in_progress';
          const isFailed = status === 'failed';
          const isPending = status === 'waiting';

          return (
            <div key={style} className="flex items-center gap-4">
              <div className={`
                flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center
                transition-all duration-300
                ${isCompleted 
                  ? 'bg-green-500 text-white' 
                  : isFailed
                    ? 'bg-red-500 text-white'
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
                ) : isFailed ? (
                  <Icon 
                    path="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"
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
                    : isFailed
                      ? 'text-red-600 dark:text-red-400'
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
                  {isFailed && (
                    <p className="text-xs text-red-600 dark:text-red-400">Failed</p>
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
          {(() => {
            if (progressData) {
              const completed = progressData.filter(p => p.status === 'completed').length;
              const inProgress = progressData.filter(p => p.status === 'in_progress').length;
              const failed = progressData.filter(p => p.status === 'failed').length;
              
              if (completed === styles.length) {
                return '✨ All portraits generated successfully!';
              } else if (completed + failed === styles.length) {
                return `🎨 ${completed} portraits completed, ${failed} failed`;
              } else if (inProgress > 0) {
                return `🎨 Processing ${inProgress} style${inProgress > 1 ? 's' : ''}, ${completed} completed...`;
              } else {
                return `⏳ Preparing to generate ${styles.length} wedding styles...`;
              }
            } else {
              return completedCount === styles.length 
                ? '✨ All portraits generated successfully!' 
                : `Generating portrait ${Math.min(currentIndex + 1, styles.length)} of ${styles.length}...`;
            }
          })()} 
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