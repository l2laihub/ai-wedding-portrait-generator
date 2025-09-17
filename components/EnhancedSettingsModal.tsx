import React, { useState, useEffect } from 'react';
import Icon from './Icon';
import { useTheme } from '../hooks/useTheme';
import ThemePreferences, { UserThemePreferences } from './ThemePreferences';

interface SettingsItem {
  label: string;
  type: 'toggle' | 'select' | 'action' | 'component';
  value?: any;
  description?: string;
  options?: Array<{ value: string; label: string }>;
  onChange?: (value: any) => void;
  action?: () => void;
  actionLabel?: string;
  component?: React.ReactNode;
}

interface EnhancedSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onThemePreferencesChange?: (preferences: UserThemePreferences) => void;
}

const EnhancedSettingsModal: React.FC<EnhancedSettingsModalProps> = ({
  isOpen,
  onClose,
  onThemePreferencesChange
}) => {
  const { theme, setTheme } = useTheme();
  const [notifications, setNotifications] = useState(true);
  const [analytics, setAnalytics] = useState(true);
  const [activeTab, setActiveTab] = useState<'general' | 'themes' | 'advanced'>('general');

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleEscapeKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  // Load settings from localStorage
  useEffect(() => {
    if (isOpen) {
      const savedNotifications = localStorage.getItem('wedai_notifications');
      const savedAnalytics = localStorage.getItem('wedai_analytics');
      
      setNotifications(savedNotifications ? JSON.parse(savedNotifications) : true);
      setAnalytics(savedAnalytics ? JSON.parse(savedAnalytics) : true);
    }
  }, [isOpen]);

  // Add escape key listener
  React.useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
      document.body.style.overflow = 'hidden';
      return () => {
        document.removeEventListener('keydown', handleEscapeKey);
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen]);

  const handleNotificationsChange = (value: boolean) => {
    setNotifications(value);
    localStorage.setItem('wedai_notifications', JSON.stringify(value));
  };

  const handleAnalyticsChange = (value: boolean) => {
    setAnalytics(value);
    localStorage.setItem('wedai_analytics', JSON.stringify(value));
  };

  const clearCache = () => {
    try {
      localStorage.removeItem('wedai_generation_cache');
      localStorage.removeItem('wedai_image_cache');
      localStorage.removeItem('wedai_autosave');
      // Clear browser cache if possible
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => {
            caches.delete(name);
          });
        });
      }
      alert('Cache cleared successfully!');
    } catch (error) {
      alert('Failed to clear cache. Please try refreshing the page.');
    }
  };

  if (!isOpen) return null;

  const generalSettings: SettingsItem[] = [
    {
      label: 'Theme',
      type: 'select',
      value: theme,
      options: [
        { value: 'light', label: '☀️ Light' },
        { value: 'dark', label: '🌙 Dark' },
        { value: 'system', label: '⚙️ System' }
      ],
      onChange: (value: string) => {
        setTheme(value as 'light' | 'dark' | 'system');
      }
    },
    {
      label: 'Browser Notifications',
      type: 'toggle',
      value: notifications,
      description: 'Get notified when portraits are ready',
      onChange: handleNotificationsChange
    },
    {
      label: 'Anonymous Analytics',
      type: 'toggle',
      value: analytics,
      description: 'Help improve the app with usage data',
      onChange: handleAnalyticsChange
    }
  ];

  const advancedSettings: SettingsItem[] = [
    {
      label: 'Clear Cache',
      type: 'action',
      description: 'Clear stored images and app cache',
      action: clearCache,
      actionLabel: 'Clear Now'
    }
  ];

  const tabs = [
    { id: 'general', label: 'General', icon: '⚙️' },
    { id: 'themes', label: 'Themes', icon: '🎨' },
    { id: 'advanced', label: 'Advanced', icon: '🛠️' }
  ];

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-[60] p-4 animate-in fade-in duration-200 overflow-y-auto"
      onClick={handleBackdropClick}
      style={{ paddingTop: 'max(2rem, env(safe-area-inset-top))' }}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full mx-4 my-8 animate-in zoom-in-95 duration-200 flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: 'calc(100vh - 4rem)' }}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Settings
          </h2>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-10 h-10 text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 border-2 border-gray-300 dark:border-gray-500 rounded-full transition-all duration-200 shadow-sm hover:shadow-md"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div className="space-y-4">
                {generalSettings.map((item, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {item.label}
                        </label>
                        {item.description && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {item.description}
                          </p>
                        )}
                      </div>
                      
                      {/* Toggle Switch */}
                      {item.type === 'toggle' && item.onChange && (
                        <button
                          onClick={() => item.onChange && item.onChange(!item.value)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            item.value 
                              ? 'bg-blue-600' 
                              : 'bg-gray-200 dark:bg-gray-600'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              item.value ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      )}
                      
                      {/* Select Dropdown */}
                      {item.type === 'select' && item.onChange && item.options && (
                        <select
                          value={item.value || ''}
                          onChange={(e) => item.onChange && item.onChange(e.target.value)}
                          className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                        >
                          {item.options.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'themes' && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <p className="text-gray-600 dark:text-gray-400">
                  Customize how themes are selected for your wedding portraits
                </p>
              </div>
              <ThemePreferences onPreferencesChange={onThemePreferencesChange} />
            </div>
          )}

          {activeTab === 'advanced' && (
            <div className="space-y-6">
              <div className="space-y-4">
                {advancedSettings.map((item, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {item.label}
                        </label>
                        {item.description && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {item.description}
                          </p>
                        )}
                      </div>
                      
                      {/* Action Button */}
                      {item.type === 'action' && item.action && (
                        <button
                          onClick={item.action}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          {item.actionLabel}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Storage Info */}
              <div className="mt-8 p-4 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Storage Information
                </h4>
                <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                  <p>• Theme preferences are stored locally</p>
                  <p>• Generated images are cached for faster loading</p>
                  <p>• No personal data is stored on servers</p>
                </div>
              </div>
            </div>
          )}

          {/* App Info */}
          <div className="text-center text-xs text-gray-500 dark:text-gray-400 pt-6 mt-6 border-t border-gray-200 dark:border-gray-700">
            <p>WedAI v1.0 • Built with React & Vite</p>
            <p className="mt-1">Settings are saved locally on your device</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedSettingsModal;