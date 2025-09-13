# PostHog Implementation Guide for Wedding Portrait Generator

## Phase 1: Initial Setup & Basic Tracking

### 1. PostHog Installation & Configuration

#### Package Installation
```bash
npm install posthog-js
npm install @types/posthog-js --save-dev
```

#### Core Configuration (`/src/analytics/posthog.ts`)
```typescript
import posthog from 'posthog-js';

// Configuration
const POSTHOG_CONFIG = {
  api_host: process.env.REACT_APP_POSTHOG_HOST || 'https://app.posthog.com',
  project_api_key: process.env.REACT_APP_POSTHOG_KEY,
  capture_pageview: false, // We'll handle this manually
  capture_pageleave: true,
  disable_session_recording: false, // Enable for UX insights
  session_recording: {
    maskAllInputs: true,
    maskAllText: false,
    recordCrossOriginIframes: false
  },
  autocapture: false, // We want explicit tracking
  batch_size: 10,
  batch_flush_interval_ms: 5000,
  loaded: (posthog: any) => {
    if (process.env.NODE_ENV === 'development') {
      posthog.debug();
    }
  }
};

// Initialize PostHog
export const initializePostHog = () => {
  if (!POSTHOG_CONFIG.project_api_key) {
    console.warn('PostHog API key not found');
    return;
  }
  
  posthog.init(POSTHOG_CONFIG.project_api_key, POSTHOG_CONFIG);
  
  // Set super properties that apply to all events
  posthog.register({
    app_version: process.env.REACT_APP_VERSION || '1.0.0',
    platform: 'web',
    environment: process.env.NODE_ENV
  });
};

export default posthog;
```

#### Environment Variables (`.env.local`)
```bash
REACT_APP_POSTHOG_KEY=phc_your_project_api_key_here
REACT_APP_POSTHOG_HOST=https://app.posthog.com
REACT_APP_VERSION=1.0.0
```

### 2. Analytics Service Layer

#### Analytics Service (`/src/analytics/analytics.ts`)
```typescript
import posthog from './posthog';
import { GeneratedContent } from '../types';

class AnalyticsService {
  private sessionId: string;
  private sessionStartTime: number;
  private imageCount: number = 0;
  private generationCount: number = 0;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.sessionStartTime = Date.now();
    this.trackSession();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private trackSession() {
    posthog.capture('session_started', {
      session_id: this.sessionId,
      entry_point: window.location.pathname,
      referrer: document.referrer,
      device_type: this.getDeviceType(),
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      user_agent: navigator.userAgent
    });
  }

  private getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }

  private getNetworkQuality(): string {
    // @ts-ignore - NetworkInformation is experimental
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (connection) {
      return connection.effectiveType || 'unknown';
    }
    return 'unknown';
  }

  // Page tracking
  trackPageView(pageName: string) {
    posthog.capture('page_viewed', {
      page_name: pageName,
      session_id: this.sessionId,
      device_type: this.getDeviceType(),
      network_quality: this.getNetworkQuality(),
      timestamp: Date.now()
    });
  }

  // Image upload events
  trackImageUploadStart(method: 'click' | 'drag_drop' | 'camera' | 'gallery') {
    posthog.capture('image_upload_started', {
      upload_method: method,
      session_id: this.sessionId,
      device_type: this.getDeviceType()
    });
  }

  trackImageUploadSuccess(file: File, uploadDuration: number) {
    this.imageCount++;
    
    posthog.capture('image_upload_completed', {
      file_size_kb: Math.round(file.size / 1024),
      file_type: file.type,
      upload_duration_ms: uploadDuration,
      image_dimensions: {
        width: 0, // Will be populated when image loads
        height: 0
      },
      session_id: this.sessionId,
      device_type: this.getDeviceType(),
      images_uploaded_session: this.imageCount
    });

    // Update user properties
    posthog.people.increment('total_uploads');
    posthog.people.set_once({ first_upload_at: new Date().toISOString() });
  }

  trackImageUploadFailed(error: string, fileSize?: number, fileType?: string) {
    posthog.capture('image_upload_failed', {
      error_type: this.categorizeError(error),
      error_message: error,
      file_size_kb: fileSize ? Math.round(fileSize / 1024) : undefined,
      file_type: fileType,
      session_id: this.sessionId,
      device_type: this.getDeviceType()
    });
  }

  // Generation events
  trackGenerationStart(customPrompt: string, styles: string[]) {
    this.generationCount++;
    
    posthog.capture('generation_started', {
      has_custom_prompt: customPrompt.length > 0,
      custom_prompt_length: customPrompt.length,
      selected_styles: styles,
      generation_mode: this.getDeviceType() === 'mobile' ? 'sequential' : 'concurrent',
      session_id: this.sessionId,
      device_type: this.getDeviceType(),
      network_quality: this.getNetworkQuality(),
      generations_this_session: this.generationCount
    });
  }

  trackGenerationStyleComplete(styleName: string, duration: number, styleIndex: number, totalStyles: number) {
    posthog.capture('generation_style_completed', {
      style_name: styleName,
      generation_duration_ms: duration,
      style_index: styleIndex,
      total_styles: totalStyles,
      session_id: this.sessionId,
      device_type: this.getDeviceType()
    });
  }

  trackGenerationStyleFailed(styleName: string, error: string, styleIndex: number) {
    posthog.capture('generation_style_failed', {
      style_name: styleName,
      error_type: this.categorizeError(error),
      error_message: error,
      style_index: styleIndex,
      session_id: this.sessionId,
      device_type: this.getDeviceType()
    });
  }

  trackGenerationComplete(successCount: number, failCount: number, totalDuration: number) {
    posthog.capture('generation_completed', {
      successful_styles: successCount,
      failed_styles: failCount,
      total_duration_ms: totalDuration,
      average_style_duration_ms: Math.round(totalDuration / (successCount + failCount)),
      session_id: this.sessionId,
      device_type: this.getDeviceType(),
      network_quality: this.getNetworkQuality()
    });

    // Update user properties
    posthog.people.increment('total_generations');
    if (successCount > 0) {
      posthog.people.increment('successful_generations', successCount);
    }
    if (failCount > 0) {
      posthog.people.increment('failed_generations', failCount);
    }

    // Update success rate
    this.updateUserSuccessRate();
  }

  // Result interaction events
  trackResultsViewed(resultsCount: number, successCount: number) {
    posthog.capture('result_viewed', {
      results_count: resultsCount,
      successful_results: successCount,
      failed_results: resultsCount - successCount,
      session_id: this.sessionId,
      device_type: this.getDeviceType()
    });
  }

  trackResultDownload(styleName: string, downloadIndex: number, timeToDownload: number) {
    posthog.capture('result_downloaded', {
      style_name: styleName,
      download_index: downloadIndex,
      time_to_download_ms: timeToDownload,
      session_id: this.sessionId,
      device_type: this.getDeviceType()
    });

    // Update user properties
    posthog.people.increment('total_downloads');
    posthog.people.set({ lead_status: 'qualified' });
  }

  trackResultShare(styleName: string, shareMethod: string, shareIndex: number) {
    posthog.capture('result_shared', {
      style_name: styleName,
      share_method: shareMethod,
      share_index: shareIndex,
      session_id: this.sessionId,
      device_type: this.getDeviceType()
    });

    // Update user properties
    posthog.people.increment('total_shares');
    posthog.people.set({ has_shared_results: true });
  }

  // PWA events
  trackPWAPrompt(trigger: 'auto' | 'manual', timeOnSite: number) {
    posthog.capture('pwa_install_prompted', {
      trigger,
      time_on_site_ms: timeOnSite,
      session_id: this.sessionId,
      device_type: this.getDeviceType()
    });

    posthog.people.increment('pwa_install_prompted_count');
  }

  trackPWAInstall(timeToAccept: number) {
    posthog.capture('pwa_install_accepted', {
      time_to_accept_ms: timeToAccept,
      session_id: this.sessionId,
      device_type: this.getDeviceType()
    });

    posthog.people.set({
      pwa_installed: true,
      pwa_install_date: new Date().toISOString()
    });
  }

  // Performance tracking
  trackPerformance(metricName: string, duration: number, context: Record<string, any> = {}) {
    posthog.capture('performance_metric', {
      metric_name: metricName,
      duration_ms: duration,
      device_type: this.getDeviceType(),
      network_quality: this.getNetworkQuality(),
      memory_usage_mb: this.getMemoryUsage(),
      session_id: this.sessionId,
      ...context
    });
  }

  // Error tracking
  trackError(error: Error, context: Record<string, any> = {}) {
    posthog.capture('application_error', {
      error_message: error.message,
      error_stack: error.stack,
      error_name: error.name,
      session_id: this.sessionId,
      device_type: this.getDeviceType(),
      url: window.location.href,
      ...context
    });
  }

  // Helper methods
  private categorizeError(error: string): string {
    if (error.includes('file too large') || error.includes('size')) return 'file_too_large';
    if (error.includes('format') || error.includes('type')) return 'invalid_format';
    if (error.includes('network') || error.includes('connection')) return 'network_error';
    if (error.includes('timeout')) return 'timeout';
    if (error.includes('unsafe') || error.includes('policy')) return 'content_policy';
    return 'other';
  }

  private getMemoryUsage(): number {
    // @ts-ignore - performance.memory is Chrome-specific
    if (performance.memory) {
      // @ts-ignore
      return Math.round(performance.memory.usedJSHeapSize / 1048576);
    }
    return 0;
  }

  private updateUserSuccessRate() {
    const totalGen = posthog.get_property('total_generations') || 0;
    const successGen = posthog.get_property('successful_generations') || 0;
    
    posthog.people.set({
      avg_generation_success_rate: totalGen > 0 ? successGen / totalGen : 0
    });
  }

  // Session end tracking
  trackSessionEnd() {
    const sessionDuration = Date.now() - this.sessionStartTime;
    
    posthog.capture('session_ended', {
      session_duration_ms: sessionDuration,
      images_generated: this.generationCount,
      images_downloaded: posthog.get_property('total_downloads') || 0,
      images_shared: posthog.get_property('total_shares') || 0,
      session_id: this.sessionId,
      device_type: this.getDeviceType()
    });

    // Update user properties
    posthog.people.increment('total_sessions');
    posthog.people.increment('total_session_duration_min', Math.round(sessionDuration / 60000));
    posthog.people.set({
      last_seen_at: new Date().toISOString()
    });
  }
}

export const analytics = new AnalyticsService();
```

### 3. React Integration

#### Analytics Hook (`/src/hooks/useAnalytics.ts`)
```typescript
import { useEffect, useRef } from 'react';
import { analytics } from '../analytics/analytics';

export const useAnalytics = () => {
  const performanceStartRef = useRef<Record<string, number>>({});

  const startPerformanceTimer = (timerName: string) => {
    performanceStartRef.current[timerName] = performance.now();
  };

  const endPerformanceTimer = (timerName: string, context?: Record<string, any>) => {
    const startTime = performanceStartRef.current[timerName];
    if (startTime) {
      const duration = performance.now() - startTime;
      analytics.trackPerformance(timerName, duration, context);
      delete performanceStartRef.current[timerName];
      return duration;
    }
    return 0;
  };

  useEffect(() => {
    // Track page load performance
    const measurePageLoad = () => {
      if (performance.timing.loadEventEnd > 0) {
        const pageLoadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
        analytics.trackPerformance('page_load', pageLoadTime);
      }
    };

    // Measure when page is fully loaded
    if (document.readyState === 'complete') {
      measurePageLoad();
    } else {
      window.addEventListener('load', measurePageLoad);
      return () => window.removeEventListener('load', measurePageLoad);
    }
  }, []);

  return {
    startPerformanceTimer,
    endPerformanceTimer,
    ...analytics
  };
};
```

#### App Component Integration (`App.tsx`)
```typescript
import { useAnalytics } from './hooks/useAnalytics';

function App() {
  const analytics = useAnalytics();
  
  useEffect(() => {
    analytics.trackPageView('home');
    
    // Track session end on page unload
    const handleBeforeUnload = () => {
      analytics.trackSessionEnd();
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const handleImageUpload = (file: File) => {
    analytics.startPerformanceTimer('image_upload');
    
    // Your existing logic
    setSourceImageFile(file);
    setSourceImageUrl(URL.createObjectURL(file));
    
    const uploadDuration = analytics.endPerformanceTimer('image_upload');
    analytics.trackImageUploadSuccess(file, uploadDuration);
  };

  const handleGenerate = async () => {
    if (!sourceImageFile) {
      analytics.trackError(new Error('No image uploaded'), { context: 'generation_attempt' });
      return;
    }

    const startTime = performance.now();
    const stylesToGenerate = getRandomWeddingStyles();
    
    analytics.trackGenerationStart(customPrompt, stylesToGenerate);

    try {
      // Your existing generation logic with analytics
      const results = await Promise.allSettled(generationPromises.map(async (promise, index) => {
        const styleStartTime = performance.now();
        try {
          const result = await promise;
          const styleDuration = performance.now() - styleStartTime;
          analytics.trackGenerationStyleComplete(
            stylesToGenerate[index],
            styleDuration,
            index,
            stylesToGenerate.length
          );
          return result;
        } catch (error) {
          analytics.trackGenerationStyleFailed(
            stylesToGenerate[index],
            error.message,
            index
          );
          throw error;
        }
      }));

      const totalDuration = performance.now() - startTime;
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const failCount = results.filter(r => r.status === 'rejected').length;
      
      analytics.trackGenerationComplete(successCount, failCount, totalDuration);
      
      if (successCount > 0) {
        analytics.trackResultsViewed(results.length, successCount);
      }

    } catch (error) {
      analytics.trackError(error, { context: 'generation_process' });
    }
  };

  // Rest of your component logic
}
```

### 4. Component-Level Integration

#### Image Display Component Updates
```typescript
// In ImageDisplay.tsx
import { useAnalytics } from '../hooks/useAnalytics';

const GeneratedImageCard = ({ content, index }) => {
  const analytics = useAnalytics();
  
  const handleDownloadClick = useCallback(() => {
    if (imageUrl) {
      const downloadStartTime = performance.now();
      
      handleDownload(imageUrl, style);
      
      const downloadDuration = performance.now() - downloadStartTime;
      analytics.trackResultDownload(style, index, downloadDuration);
    }
  }, [imageUrl, style, index, analytics]);

  const handleShareClick = useCallback(() => {
    if (imageUrl) {
      const shareMethod = navigator.share ? 'native_api' : 'fallback';
      analytics.trackResultShare(style, shareMethod, index);
      
      handleShare(imageUrl, style);
    }
  }, [imageUrl, style, index, analytics]);

  // Rest of component
};
```

#### Image Uploader Component Updates  
```typescript
// In ImageUploader.tsx
const ImageUploader = ({ onImageUpload, sourceImageUrl }) => {
  const analytics = useAnalytics();

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    analytics.trackImageUploadStart('click');
    
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  }, [analytics]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    analytics.trackImageUploadStart('drag_drop');
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }, [analytics]);

  // Rest of component
};
```

## Phase 2: Advanced Features Implementation

### 1. Lead Scoring System

```typescript
// /src/analytics/leadScoring.ts
export class LeadScoringService {
  static calculateLeadScore(userProperties: Record<string, any>): {
    score: number;
    grade: 'A' | 'B' | 'C' | 'D';
    components: Record<string, number>;
  } {
    const components = {
      engagement: 0,
      quality: 0,
      retention: 0
    };

    // Engagement Score (0-40)
    if (userProperties.total_uploads > 0) components.engagement += 10;
    if (userProperties.total_generations > 0) components.engagement += 15;
    if (userProperties.total_downloads > 0) components.engagement += 10;
    if (userProperties.total_shares > 0) components.engagement += 5;

    // Quality Score (0-30)
    if (userProperties.has_used_custom_prompt) components.quality += 5;
    if (userProperties.total_generations > 2) components.quality += 10;
    if (userProperties.avg_generation_success_rate > 0.8) components.quality += 5;
    if (userProperties.pwa_installed) components.quality += 10;

    // Retention Score (0-30)
    if (userProperties.has_multiple_sessions) components.retention += 10;
    if (userProperties.avg_session_duration_min > 5) components.retention += 10;
    if (userProperties.total_downloads >= 3) components.retention += 10;

    const score = components.engagement + components.quality + components.retention;
    
    let grade: 'A' | 'B' | 'C' | 'D';
    if (score >= 80) grade = 'A';
    else if (score >= 60) grade = 'B';
    else if (score >= 40) grade = 'C';
    else grade = 'D';

    return { score, grade, components };
  }

  static updateUserLeadScore(userId: string) {
    const userProperties = posthog.get_property(); // Get all user properties
    const { score, grade, components } = this.calculateLeadScore(userProperties);

    posthog.people.set({
      lead_score: score,
      lead_grade: grade,
      lead_score_components: components,
      lead_score_updated_at: new Date().toISOString()
    });

    // Track lead score change
    posthog.capture('lead_score_updated', {
      new_score: score,
      new_grade: grade,
      score_components: components
    });
  }
}
```

### 2. Feature Flags Integration

```typescript
// /src/analytics/featureFlags.ts
export const useFeatureFlags = () => {
  const [flags, setFlags] = useState<Record<string, any>>({});

  useEffect(() => {
    // Get all feature flags
    const currentFlags = {
      upload_cta_test: posthog.getFeatureFlag('upload_cta_test'),
      generation_flow: posthog.getFeatureFlag('generation_flow'),
      premium_preview: posthog.getFeatureFlag('premium_preview')
    };
    
    setFlags(currentFlags);

    // Track flag assignments
    Object.entries(currentFlags).forEach(([flagName, variant]) => {
      if (variant) {
        posthog.capture('feature_flag_assigned', {
          flag_name: flagName,
          variant: variant,
          user_segment: getUserSegment()
        });
      }
    });
  }, []);

  return flags;
};
```

## Phase 3: Monitoring & Maintenance

### 1. Error Boundary with Analytics

```typescript
// /src/components/ErrorBoundary.tsx
import { Component, ErrorInfo, ReactNode } from 'react';
import { analytics } from '../analytics/analytics';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    analytics.trackError(error, {
      context: 'react_error_boundary',
      component_stack: errorInfo.componentStack
    });
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <div>Something went wrong.</div>;
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
```

### 2. Performance Monitoring

```typescript
// /src/utils/performanceMonitor.ts
export class PerformanceMonitor {
  private static observer?: PerformanceObserver;

  static init() {
    // Monitor Core Web Vitals
    this.observeWebVitals();
    
    // Monitor resource loading
    this.observeResourceTiming();
  }

  private static observeWebVitals() {
    if ('PerformanceObserver' in window) {
      this.observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'largest-contentful-paint') {
            analytics.trackPerformance('lcp', entry.startTime);
          }
          if (entry.entryType === 'first-input') {
            // @ts-ignore - processingStart exists on PerformanceEventTiming
            analytics.trackPerformance('fid', entry.processingStart - entry.startTime);
          }
          if (entry.entryType === 'layout-shift' && !entry.hadRecentInput) {
            analytics.trackPerformance('cls', entry.value);
          }
        });
      });

      this.observer.observe({
        entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift']
      });
    }
  }

  private static observeResourceTiming() {
    if ('PerformanceObserver' in window) {
      const resourceObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.name.includes('gemini') || entry.name.includes('api')) {
            analytics.trackPerformance('api_call', entry.duration, {
              endpoint: entry.name,
              response_size: entry.transferSize || 0
            });
          }
        });
      });

      resourceObserver.observe({ entryTypes: ['resource'] });
    }
  }
}
```

### 3. Data Quality Validation

```typescript
// /src/analytics/dataValidation.ts
export const validateAnalyticsData = {
  // Validate event properties
  validateEvent: (eventName: string, properties: Record<string, any>) => {
    const errors: string[] = [];
    
    // Required properties for all events
    if (!properties.session_id) errors.push('Missing session_id');
    if (!properties.device_type) errors.push('Missing device_type');
    
    // Event-specific validation
    switch (eventName) {
      case 'generation_started':
        if (typeof properties.selected_styles !== 'object') {
          errors.push('selected_styles must be an array');
        }
        break;
      
      case 'result_downloaded':
        if (!properties.style_name) errors.push('Missing style_name');
        break;
    }
    
    return errors;
  },

  // Validate user properties
  validateUserProperties: (properties: Record<string, any>) => {
    const warnings: string[] = [];
    
    if (properties.lead_score && (properties.lead_score < 0 || properties.lead_score > 100)) {
      warnings.push('Lead score out of range (0-100)');
    }
    
    return warnings;
  }
};
```

This comprehensive implementation guide provides the foundation for robust analytics tracking in your wedding portrait generator. The modular approach makes it easy to implement incrementally and maintain over time.