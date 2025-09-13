import React from 'react';
import { useFormattedCounter, useGenerationCounter } from '../hooks/useGenerationCounter';

interface GenerationCounterProps {
  className?: string;
  showIcon?: boolean;
}

/**
 * Simple component to display the generation counter
 * Can be placed anywhere in the UI where counter visibility is desired
 */
export const GenerationCounter: React.FC<GenerationCounterProps> = ({ 
  className = '', 
  showIcon = true 
}) => {
  const formattedCounter = useFormattedCounter();

  return (
    <div className={`flex items-center gap-2 text-gray-600 dark:text-gray-400 ${className}`}>
      {showIcon && (
        <svg 
          className="w-4 h-4" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" 
          />
        </svg>
      )}
      <span className="text-sm font-medium">{formattedCounter}</span>
    </div>
  );
};

/**
 * Detailed counter stats component for admin/debug views
 */
export const GenerationCounterStats: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { statistics } = useGenerationCounter();

  return (
    <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 ${className}`}>
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
        <div className="text-2xl font-bold text-gray-900 dark:text-white">
          {statistics.total.toLocaleString()}
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400">Total Portraits</div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
        <div className="text-2xl font-bold text-gray-900 dark:text-white">
          {statistics.today}
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400">Today</div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
        <div className="text-2xl font-bold text-gray-900 dark:text-white">
          {statistics.last24Hours}
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400">Last 24h</div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
        <div className="text-2xl font-bold text-gray-900 dark:text-white">
          {Math.round(statistics.averageSuccessRate * 100)}%
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400">Success Rate</div>
      </div>
    </div>
  );
};

export default GenerationCounter;