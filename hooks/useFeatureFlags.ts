import { useState, useEffect, useMemo, useCallback } from 'react';
import { posthogService } from '../services/posthogService';

/**
 * Custom hook for managing feature flags with PostHog
 */
export const useFeatureFlag = (flagKey: string, defaultValue: boolean = false) => {
  const [isEnabled, setIsEnabled] = useState<boolean>(defaultValue);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkFeatureFlag = () => {
      try {
        const flagValue = posthogService.getFeatureFlag(flagKey);
        
        // Handle different types of flag values
        if (typeof flagValue === 'boolean') {
          setIsEnabled(flagValue);
        } else if (typeof flagValue === 'string') {
          setIsEnabled(flagValue === 'true' || flagValue === 'on');
        } else {
          setIsEnabled(defaultValue);
        }
      } catch (error) {
        console.warn(`Error checking feature flag ${flagKey}:`, error);
        setIsEnabled(defaultValue);
      } finally {
        setIsLoading(false);
      }
    };

    // Check flag immediately
    checkFeatureFlag();

    // Set up a periodic check in case flags are updated
    const interval = setInterval(checkFeatureFlag, 60000); // Check every 60 seconds

    return () => clearInterval(interval);
  }, [flagKey, defaultValue]);

  return { isEnabled, isLoading };
};

/**
 * Hook for getting multiple feature flags at once
 */
export const useFeatureFlags = (flags: Record<string, boolean>) => {
  const [flagValues, setFlagValues] = useState<Record<string, boolean>>(flags);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Memoize flag keys to prevent unnecessary re-renders
  const flagKeys = useMemo(() => Object.keys(flags), [JSON.stringify(Object.keys(flags))]);
  const defaultValues = useMemo(() => flags, [JSON.stringify(flags)]);

  const checkAllFlags = useCallback(() => {
    try {
      const updatedFlags: Record<string, boolean> = {};
      
      flagKeys.forEach((flagKey) => {
        const defaultValue = defaultValues[flagKey];
        const flagValue = posthogService.getFeatureFlag(flagKey);
        
        if (typeof flagValue === 'boolean') {
          updatedFlags[flagKey] = flagValue;
        } else if (typeof flagValue === 'string') {
          updatedFlags[flagKey] = flagValue === 'true' || flagValue === 'on';
        } else {
          updatedFlags[flagKey] = defaultValue;
        }
      });
      
      setFlagValues(prev => {
        // Only update if values actually changed
        const hasChanges = flagKeys.some(key => prev[key] !== updatedFlags[key]);
        return hasChanges ? updatedFlags : prev;
      });
    } catch (error) {
      console.warn('Error checking feature flags:', error);
      setFlagValues(defaultValues);
    } finally {
      setIsLoading(false);
    }
  }, [flagKeys, defaultValues]);

  useEffect(() => {
    checkAllFlags();
    
    // Only set interval if we actually have flag keys
    if (flagKeys.length > 0) {
      const interval = setInterval(checkAllFlags, 60000); // Reduced frequency to 1 minute
      return () => clearInterval(interval);
    }
  }, [checkAllFlags]);

  return { flags: flagValues, isLoading };
};

/**
 * Predefined feature flags for the application
 */
export const FEATURE_FLAGS = {
  ENABLE_SEQUENTIAL_GENERATION: 'enable_sequential_generation',
  SHOW_GENERATION_PROGRESS: 'show_generation_progress',
  ENABLE_ADVANCED_PROMPTS: 'enable_advanced_prompts',
  SHOW_STYLE_PICKER: 'show_style_picker',
  ENABLE_DOWNLOAD_ANALYTICS: 'enable_download_analytics',
  SHOW_BETA_FEATURES: 'show_beta_features',
  ENABLE_PREMIUM_STYLES: 'enable_premium_styles',
  SHOW_SOCIAL_SHARING: 'show_social_sharing',
} as const;

// Stable object to prevent re-renders
const APP_FEATURE_FLAGS_CONFIG = {
  [FEATURE_FLAGS.ENABLE_SEQUENTIAL_GENERATION]: false,
  [FEATURE_FLAGS.SHOW_GENERATION_PROGRESS]: true,
  [FEATURE_FLAGS.ENABLE_ADVANCED_PROMPTS]: false,
  [FEATURE_FLAGS.SHOW_STYLE_PICKER]: false,
  [FEATURE_FLAGS.ENABLE_DOWNLOAD_ANALYTICS]: true,
  [FEATURE_FLAGS.SHOW_BETA_FEATURES]: false,
  [FEATURE_FLAGS.ENABLE_PREMIUM_STYLES]: false,
  [FEATURE_FLAGS.SHOW_SOCIAL_SHARING]: true,
} as const;

/**
 * Application-specific feature flags hook
 */
export const useAppFeatureFlags = () => {
  return useFeatureFlags(APP_FEATURE_FLAGS_CONFIG);
};

export default useFeatureFlag;