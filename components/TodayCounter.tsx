import React from 'react';
import Icon from './Icon';
import { useGenerationCounter } from '../hooks/useGenerationCounter';

interface TodayCounterProps {
  className?: string;
  showTotal?: boolean;
}

/**
 * Focused component to display today's portrait count
 * Can optionally show total count as well
 */
const TodayCounter: React.FC<TodayCounterProps> = ({ 
  className = '',
  showTotal = false 
}) => {
  const { totalGenerations, dailyGenerations } = useGenerationCounter();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Today's Count - Primary */}
      <div className="flex items-center gap-1 md:gap-2 bg-gradient-to-r from-orange-500/10 to-red-500/10 dark:from-orange-400/10 dark:to-red-400/10 px-3 py-1.5 rounded-full border border-orange-200 dark:border-orange-800 transition-colors duration-300">
        <Icon 
          path="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" 
          className="w-4 h-4 text-orange-500 dark:text-orange-400" 
        />
        <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
          Today's Portraits: <span className="font-bold">{dailyGenerations}</span>
        </span>
      </div>

      {/* Total Count - Secondary (if enabled) */}
      {showTotal && (
        <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
          <span className="text-xs">
            ({totalGenerations.toLocaleString()} total)
          </span>
        </div>
      )}
    </div>
  );
};

export default TodayCounter;