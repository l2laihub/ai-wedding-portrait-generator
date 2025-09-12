import React, { Suspense, lazy } from 'react';
import Loader from './Loader';

// Lazy-loaded components for better code splitting
const LazyImageUploader = lazy(() => import('./ImageUploader'));
const LazyImageDisplay = lazy(() => import('./ImageDisplay'));
const LazyPromptInput = lazy(() => import('./PromptInput'));

// Fallback component for loading states
const ComponentLoader: React.FC<{ message?: string }> = ({ message = "Loading..." }) => (
  <div className="flex justify-center items-center p-8">
    <div className="animate-pulse flex items-center gap-3">
      <div className="w-4 h-4 bg-purple-400 rounded-full animate-bounce"></div>
      <div className="w-4 h-4 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
      <div className="w-4 h-4 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
      <span className="ml-3 text-gray-400 text-sm">{message}</span>
    </div>
  </div>
);

// Wrapper components with Suspense
export const SuspenseImageUploader: React.FC<React.ComponentProps<typeof LazyImageUploader>> = (props) => (
  <Suspense fallback={<ComponentLoader message="Loading image uploader..." />}>
    <LazyImageUploader {...props} />
  </Suspense>
);

export const SuspenseImageDisplay: React.FC<React.ComponentProps<typeof LazyImageDisplay>> = (props) => (
  <Suspense fallback={<ComponentLoader message="Loading results display..." />}>
    <LazyImageDisplay {...props} />
  </Suspense>
);

export const SuspensePromptInput: React.FC<React.ComponentProps<typeof LazyPromptInput>> = (props) => (
  <Suspense fallback={<ComponentLoader message="Loading prompt input..." />}>
    <LazyPromptInput {...props} />
  </Suspense>
);

// Preloader for critical components on mobile
export const preloadCriticalComponents = () => {
  if (typeof window !== 'undefined' && 'ontouchstart' in window) {
    // Preload components that are likely to be needed on mobile
    import('./ImageUploader');
    import('./PromptInput');
    
    // Delay loading of ImageDisplay until it's more likely to be needed
    setTimeout(() => {
      import('./ImageDisplay');
    }, 2000);
  }
};

export default {
  SuspenseImageUploader,
  SuspenseImageDisplay,
  SuspensePromptInput,
  preloadCriticalComponents
};