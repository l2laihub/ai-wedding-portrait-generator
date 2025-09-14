
import React from 'react';
import ReactDOM from 'react-dom/client';
import Router from './components/Router';
import './index.css';
import { posthogService } from './services/posthogService';

// Initialize PostHog analytics
const posthogApiKey = process.env.POSTHOG_API_KEY;

if (posthogApiKey && posthogApiKey.startsWith('phc_')) {
  console.log('Initializing PostHog analytics...');
  posthogService.init({
    apiKey: posthogApiKey,
    apiHost: process.env.POSTHOG_API_HOST,
    autocapture: false,
    capturePageview: true,
    capturePageleave: false,
    persistence: 'localStorage',
    loaded: (posthog) => {
      console.log('✅ PostHog analytics ready');
      
      // Track initial page view with additional context
      posthogService.track('app_loaded', {
        url: window.location.href,
        referrer: document.referrer,
        userAgent: navigator.userAgent,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        devicePixelRatio: window.devicePixelRatio,
      });
      
      // Track page view for web analytics
      posthogService.trackPageView('Home');
    }
  });
} else {
  if (!posthogApiKey) {
    console.warn('⚠️ PostHog API key not found. Analytics disabled.');
    console.info('💡 Add POSTHOG_API_KEY to your .env file to enable analytics');
  } else {
    console.error('❌ Invalid PostHog API key format. Key should start with "phc_"');
    console.info('💡 Please check your POSTHOG_API_KEY in the .env file');
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <Router />
  </React.StrictMode>
);
