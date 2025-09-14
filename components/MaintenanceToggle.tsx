import React, { useState, useEffect } from 'react';
import Icon from './Icon';

/**
 * Simple maintenance mode toggle for admin use
 * Access this by adding ?maintenance=toggle to your URL
 * Or use browser console: toggleMaintenance()
 */

interface MaintenanceToggleProps {
  className?: string;
}

const MaintenanceToggle: React.FC<MaintenanceToggleProps> = ({ className = '' }) => {
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(() => {
    return localStorage.getItem('maintenance-mode') === 'true';
  });

  const [showToggle, setShowToggle] = useState(() => {
    return new URLSearchParams(window.location.search).get('maintenance') === 'toggle' ||
           localStorage.getItem('show-maintenance-toggle') === 'true';
  });

  useEffect(() => {
    // Make toggle function globally available
    (window as any).toggleMaintenance = (enabled?: boolean) => {
      const newState = enabled !== undefined ? enabled : !isMaintenanceMode;
      setIsMaintenanceMode(newState);
      localStorage.setItem('maintenance-mode', newState.toString());
      console.log(`🔧 Maintenance mode ${newState ? 'ENABLED' : 'DISABLED'}`);
    };

    (window as any).showMaintenanceToggle = () => {
      setShowToggle(true);
      localStorage.setItem('show-maintenance-toggle', 'true');
    };

    (window as any).hideMaintenanceToggle = () => {
      setShowToggle(false);
      localStorage.removeItem('show-maintenance-toggle');
    };
  }, [isMaintenanceMode]);

  const handleToggle = () => {
    const newState = !isMaintenanceMode;
    setIsMaintenanceMode(newState);
    localStorage.setItem('maintenance-mode', newState.toString());
    
    // Track in PostHog if available
    if ((window as any).posthog) {
      (window as any).posthog.capture('maintenance_mode_toggled', {
        enabled: newState,
        timestamp: new Date().toISOString()
      });
    }
  };

  // Don't show toggle unless explicitly enabled
  if (!showToggle) {
    return null;
  }

  return (
    <div className={`fixed top-4 right-4 z-[60] ${className}`}>
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Icon 
              path="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" 
              className="w-4 h-4 text-gray-500 dark:text-gray-400" 
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Maintenance
            </span>
          </div>
          
          <button
            onClick={handleToggle}
            className={`
              relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              ${isMaintenanceMode ? 'bg-red-600' : 'bg-gray-200 dark:bg-gray-600'}
            `}
          >
            <span
              className={`
                inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                ${isMaintenanceMode ? 'translate-x-6' : 'translate-x-1'}
              `}
            />
          </button>
          
          <span className={`text-xs font-medium ${isMaintenanceMode ? 'text-red-600' : 'text-green-600'}`}>
            {isMaintenanceMode ? 'ON' : 'OFF'}
          </span>
        </div>
        
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          {isMaintenanceMode ? '🔧 Site in maintenance mode' : '✅ Site is live'}
        </div>
      </div>
    </div>
  );
};

export default MaintenanceToggle;