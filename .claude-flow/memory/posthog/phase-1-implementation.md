# Phase 1: PostHog Foundation Setup - Implementation Guide

## Overview
This guide provides step-by-step implementation details for integrating PostHog analytics into the AI Wedding Portrait Generator.

## Prerequisites
- PostHog account (free tier is sufficient)
- PostHog project API key
- PostHog host URL (default: https://app.posthog.com)

## Step 1: Install PostHog SDK

```bash
npm install posthog-js
```

## Step 2: Environment Configuration

Add to `.env.local`:
```env
VITE_POSTHOG_KEY=your_posthog_api_key
VITE_POSTHOG_HOST=https://app.posthog.com
```

Update `vite.config.ts` to ensure env vars are exposed:
```typescript
// Already configured, but verify these are available
define: {
  'process.env.VITE_POSTHOG_KEY': JSON.stringify(process.env.VITE_POSTHOG_KEY),
  'process.env.VITE_POSTHOG_HOST': JSON.stringify(process.env.VITE_POSTHOG_HOST),
}
```

## Step 3: Create PostHog Service

Create `src/services/posthog.ts`:
```typescript
import posthog from 'posthog-js';

export const initPostHog = () => {
  const apiKey = process.env.VITE_POSTHOG_KEY;
  const apiHost = process.env.VITE_POSTHOG_HOST || 'https://app.posthog.com';

  if (!apiKey) {
    console.warn('PostHog API key not found. Analytics disabled.');
    return;
  }

  posthog.init(apiKey, {
    api_host: apiHost,
    // Performance optimizations
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: false, // We'll manually track important events
    persistence: 'localStorage',
    // Privacy settings
    disable_session_recording: true, // Enable later if needed
    mask_all_text: false,
    mask_all_element_attributes: false,
    // Feature flags
    bootstrap: {
      featureFlags: {
        // Add default feature flags here
      }
    },
    // Mobile optimizations
    batch_requests: true,
    batch_size: 10,
    batch_flush_interval_ms: 5000,
  });

  // Set super properties that persist across sessions
  posthog.register({
    app_version: '1.0.0',
    platform: 'web',
  });
};

export { posthog };
```

## Step 4: Initialize in App Entry

Update `src/index.tsx`:
```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { initPostHog } from './services/posthog';

// Initialize PostHog before rendering
initPostHog();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

## Step 5: Create Analytics Hook

Create `src/hooks/useAnalytics.ts`:
```typescript
import { useCallback, useEffect } from 'react';
import { posthog } from '../services/posthog';
import { useViewport } from './useViewport';
import { useNetworkStatus } from './useNetworkStatus';
import { useTheme } from './useTheme';

interface EventProperties {
  [key: string]: any;
}

export const useAnalytics = () => {
  const { isMobile, orientation } = useViewport();
  const { isOnline, isSlowConnection } = useNetworkStatus();
  const { theme } = useTheme();

  // Add context to all events
  const getEventContext = useCallback((): EventProperties => {
    return {
      device_type: isMobile ? 'mobile' : 'desktop',
      viewport_orientation: orientation,
      network_status: isOnline ? (isSlowConnection ? 'slow' : 'fast') : 'offline',
      theme: theme,
      timestamp: new Date().toISOString(),
    };
  }, [isMobile, orientation, isOnline, isSlowConnection, theme]);

  // Track event with context
  const track = useCallback((eventName: string, properties?: EventProperties) => {
    if (!posthog) return;

    const eventData = {
      ...getEventContext(),
      ...properties,
    };

    posthog.capture(eventName, eventData);
  }, [getEventContext]);

  // Track timing events
  const trackTiming = useCallback((eventName: string, duration: number, properties?: EventProperties) => {
    track(eventName, {
      duration_ms: duration,
      duration_seconds: duration / 1000,
      ...properties,
    });
  }, [track]);

  // Track errors
  const trackError = useCallback((errorName: string, error: Error | string, properties?: EventProperties) => {
    track('error_occurred', {
      error_name: errorName,
      error_message: error instanceof Error ? error.message : error,
      error_stack: error instanceof Error ? error.stack : undefined,
      ...properties,
    });
  }, [track]);

  // Identify user (for lead capture later)
  const identify = useCallback((userId: string, properties?: EventProperties) => {
    if (!posthog) return;
    posthog.identify(userId, properties);
  }, []);

  // Reset user (on logout/clear)
  const reset = useCallback(() => {
    if (!posthog) return;
    posthog.reset();
  }, []);

  // Get feature flag
  const getFeatureFlag = useCallback((flagName: string, defaultValue: boolean = false): boolean => {
    if (!posthog) return defaultValue;
    return posthog.isFeatureEnabled(flagName) ?? defaultValue;
  }, []);

  // Track page view on mount
  useEffect(() => {
    track('app_loaded', {
      referrer: document.referrer,
      url: window.location.href,
      user_agent: navigator.userAgent,
    });
  }, [track]);

  return {
    track,
    trackTiming,
    trackError,
    identify,
    reset,
    getFeatureFlag,
  };
};
```

## Step 6: Privacy Compliance Helper

Create `src/components/AnalyticsConsent.tsx`:
```typescript
import React, { useState, useEffect } from 'react';
import { posthog } from '../services/posthog';

const CONSENT_KEY = 'analytics_consent';

export const AnalyticsConsent: React.FC = () => {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(CONSENT_KEY);
    if (!consent) {
      setShowBanner(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(CONSENT_KEY, 'accepted');
    setShowBanner(false);
    posthog?.opt_in_capturing();
  };

  const handleDecline = () => {
    localStorage.setItem(CONSENT_KEY, 'declined');
    setShowBanner(false);
    posthog?.opt_out_capturing();
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-800 text-white p-4 shadow-lg z-50">
      <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm">
          We use analytics to improve your experience. No personal images are tracked.
        </p>
        <div className="flex gap-3">
          <button
            onClick={handleDecline}
            className="px-4 py-2 text-sm border border-gray-600 rounded hover:bg-gray-700"
          >
            Decline
          </button>
          <button
            onClick={handleAccept}
            className="px-4 py-2 text-sm bg-blue-600 rounded hover:bg-blue-700"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
};
```

## Step 7: Add Consent Banner to App

Update `src/App.tsx` (add before closing div):
```typescript
import { AnalyticsConsent } from './components/AnalyticsConsent';

// ... existing code ...

      {/* Analytics Consent */}
      <AnalyticsConsent />
    </div>
  );
}
```

## Testing Phase 1

1. **Verify Installation**:
   - Check PostHog is loaded in browser console: `window.posthog`
   - Check network tab for PostHog API calls

2. **Test Basic Events**:
   - Page view should auto-track on load
   - Check PostHog dashboard for incoming events

3. **Test Context Data**:
   - Verify device type, theme, network status are captured
   - Test on mobile and desktop

4. **Test Consent**:
   - Verify banner appears on first visit
   - Test accept/decline functionality
   - Verify opt-out stops tracking

## Next Steps

After Phase 1 is complete and tested:
1. Move to Phase 2: Core Event Tracking
2. Implement specific event tracking in components
3. Set up custom dashboards in PostHog

## Troubleshooting

**PostHog not initializing:**
- Check API key in .env.local
- Verify environment variables are loaded
- Check browser console for errors

**Events not appearing:**
- Check network tab for blocked requests
- Verify opt-in status
- Check PostHog project settings

**Performance issues:**
- Adjust batch settings
- Implement event sampling for high-frequency events
- Use debouncing for rapid events