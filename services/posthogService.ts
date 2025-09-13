import posthog from 'posthog-js';

// PostHog configuration types
interface PostHogConfig {
  apiKey: string;
  apiHost?: string;
  autocapture?: boolean;
  capturePageview?: boolean;
  capturePageleave?: boolean;
  persistence?: 'localStorage' | 'sessionStorage' | 'cookie' | 'memory';
  loaded?: (posthog: any) => void;
}

// Event types for type safety
export enum EventName {
  // Page events
  PAGE_VIEW = 'page_view',
  
  // Image upload events
  IMAGE_UPLOAD_STARTED = 'image_upload_started',
  IMAGE_UPLOAD_COMPLETED = 'image_upload_completed',
  IMAGE_UPLOAD_FAILED = 'image_upload_failed',
  
  // Generation events
  GENERATION_STARTED = 'generation_started',
  GENERATION_COMPLETED = 'generation_completed',
  GENERATION_FAILED = 'generation_failed',
  STYLE_GENERATED = 'style_generated',
  
  // User interaction events
  STYLE_VIEWED = 'style_viewed',
  IMAGE_DOWNLOADED = 'image_downloaded',
  PROMPT_MODIFIED = 'prompt_modified',
  
  // Feature engagement
  FEATURE_FLAG_ACCESSED = 'feature_flag_accessed',
  
  // Lead tracking
  USER_IDENTIFIED = 'user_identified',
  EMAIL_PROVIDED = 'email_provided',
  
  // Counter tracking
  GENERATION_COUNTER_INCREMENTED = 'generation_counter_incremented',
}

// Event properties interfaces
export interface ImageUploadProperties {
  fileSize: number;
  fileType: string;
  uploadMethod: 'drag' | 'click';
  uploadDuration?: number;
  error?: string;
}

export interface GenerationProperties {
  styles: string[];
  customPrompt?: string;
  generationId: string;
  timestamp: number;
}

export interface GenerationCompleteProperties extends GenerationProperties {
  duration: number;
  successfulStyles: string[];
  failedStyles: string[];
}

export interface StyleGeneratedProperties {
  style: string;
  generationId: string;
  duration: number;
  success: boolean;
  error?: string;
}

export interface UserIdentificationProperties {
  email?: string;
  name?: string;
  source?: string;
  timestamp: number;
  userAgent?: string;
  screenWidth?: number;
  screenHeight?: number;
  devicePixelRatio?: number;
  language?: string;
  timezone?: string;
}

export interface CounterIncrementProperties {
  generationId: string;
  totalGenerations: number;
  dailyGenerations: number;
  successfulStyles: number;
  totalStyles: number;
  successRate: number;
  photoType: 'single' | 'couple' | 'family';
  familyMemberCount?: number;
  customPrompt?: string;
  generationDuration?: number;
  styles?: string[];
  timestamp: number;
}

class PostHogService {
  private static instance: PostHogService;
  private initialized = false;
  private generationStartTimes: Map<string, number> = new Map();
  private uploadStartTime?: number;

  private constructor() {}

  static getInstance(): PostHogService {
    if (!PostHogService.instance) {
      PostHogService.instance = new PostHogService();
    }
    return PostHogService.instance;
  }

  /**
   * Initialize PostHog with project configuration
   */
  init(config: PostHogConfig): void {
    if (this.initialized) {
      console.warn('PostHog already initialized');
      return;
    }

    // Validate API key format
    if (!config.apiKey || !config.apiKey.startsWith('phc_')) {
      console.error('Invalid PostHog API key format. Key should start with "phc_"');
      return;
    }

    try {
      posthog.init(config.apiKey, {
        api_host: config.apiHost || 'https://app.posthog.com',
        autocapture: config.autocapture ?? false, // Reduce noise
        capture_pageview: config.capturePageview ?? false, // We'll handle manually
        capture_pageleave: config.capturePageleave ?? false,
        persistence: config.persistence || 'localStorage',
        disable_session_recording: true, // Disable session recording to reduce bandwidth
        disable_surveys: true, // Disable surveys
        rate_limiting: {
          events_burst_limit: 10,
          events_per_second: 2
        },
        loaded: (posthog) => {
          this.initialized = true;
          console.log('PostHog initialized successfully');
          config.loaded?.(posthog);
        },
        on_request_error: (error) => {
          console.warn('PostHog request error (continuing silently):', error);
        }
      });
    } catch (error) {
      console.error('Failed to initialize PostHog:', error);
      // Set initialized to true to prevent retry loops
      this.initialized = true;
    }
  }

  /**
   * Identify a user for lead tracking
   */
  identify(userId: string, properties?: UserIdentificationProperties): void {
    if (!this.initialized) {
      return; // Silently ignore if not initialized
    }

    try {
      posthog.identify(userId, properties);
      this.track(EventName.USER_IDENTIFIED, {
        ...properties,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.warn('PostHog identify error (continuing silently):', error);
    }
  }

  /**
   * Track custom events
   */
  track(eventName: EventName | string, properties?: Record<string, any>): void {
    if (!this.initialized) {
      return; // Silently ignore if not initialized
    }

    try {
      posthog.capture(eventName, {
        ...properties,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.warn('PostHog tracking error (continuing silently):', error);
    }
  }

  /**
   * Track image upload events
   */
  trackImageUpload(status: 'started' | 'completed' | 'failed', properties: Partial<ImageUploadProperties>): void {
    if (status === 'started') {
      this.uploadStartTime = Date.now();
      this.track(EventName.IMAGE_UPLOAD_STARTED, properties);
    } else if (status === 'completed' && this.uploadStartTime) {
      const duration = Date.now() - this.uploadStartTime;
      this.track(EventName.IMAGE_UPLOAD_COMPLETED, {
        ...properties,
        uploadDuration: duration,
      });
      this.uploadStartTime = undefined;
    } else if (status === 'failed') {
      this.track(EventName.IMAGE_UPLOAD_FAILED, properties);
      this.uploadStartTime = undefined;
    }
  }

  /**
   * Track generation lifecycle
   */
  trackGenerationStarted(generationId: string, properties: GenerationProperties): void {
    this.generationStartTimes.set(generationId, Date.now());
    this.track(EventName.GENERATION_STARTED, properties);
  }

  trackGenerationCompleted(generationId: string, successfulStyles: string[], failedStyles: string[]): void {
    const startTime = this.generationStartTimes.get(generationId);
    if (!startTime) {
      console.warn(`No start time found for generation ${generationId}`);
      return;
    }

    const duration = Date.now() - startTime;
    this.track(EventName.GENERATION_COMPLETED, {
      styles: [...successfulStyles, ...failedStyles],
      generationId,
      timestamp: Date.now(),
      duration,
      successfulStyles,
      failedStyles,
      totalStyles: successfulStyles.length + failedStyles.length,
      successRate: successfulStyles.length / (successfulStyles.length + failedStyles.length),
    } as GenerationCompleteProperties);

    this.generationStartTimes.delete(generationId);
  }

  trackGenerationFailed(generationId: string, error: string): void {
    const startTime = this.generationStartTimes.get(generationId);
    const duration = startTime ? Date.now() - startTime : 0;

    this.track(EventName.GENERATION_FAILED, {
      generationId,
      duration,
      error,
    });

    this.generationStartTimes.delete(generationId);
  }

  /**
   * Track individual style generation
   */
  trackStyleGenerated(properties: StyleGeneratedProperties): void {
    this.track(EventName.STYLE_GENERATED, properties);
  }

  /**
   * Track style interactions
   */
  trackStyleViewed(style: string, generationId: string): void {
    this.track(EventName.STYLE_VIEWED, {
      style,
      generationId,
    });
  }

  trackImageDownloaded(style: string, generationId: string): void {
    this.track(EventName.IMAGE_DOWNLOADED, {
      style,
      generationId,
    });
  }

  /**
   * Track prompt modifications
   */
  trackPromptModified(customPrompt: string): void {
    this.track(EventName.PROMPT_MODIFIED, {
      customPrompt,
      promptLength: customPrompt.length,
    });
  }

  /**
   * Get feature flag value (without tracking to avoid rate limits)
   */
  getFeatureFlag(flagKey: string): boolean | string | undefined {
    if (!this.initialized) {
      return undefined;
    }

    try {
      return posthog.getFeatureFlag(flagKey);
    } catch (error) {
      console.warn('PostHog feature flag error (continuing silently):', error);
      return undefined;
    }
  }

  /**
   * Get feature flag value and track access (use sparingly)
   */
  getFeatureFlagWithTracking(flagKey: string): boolean | string | undefined {
    const flagValue = this.getFeatureFlag(flagKey);
    
    if (this.initialized && flagValue !== undefined) {
      try {
        this.track(EventName.FEATURE_FLAG_ACCESSED, {
          flagKey,
          flagValue,
        });
      } catch (error) {
        console.warn('PostHog tracking error (continuing silently):', error);
      }
    }
    
    return flagValue;
  }

  /**
   * Check if feature flag is enabled
   */
  isFeatureEnabled(flagKey: string): boolean {
    const flagValue = this.getFeatureFlag(flagKey);
    return flagValue === true || flagValue === 'true';
  }

  /**
   * Set user properties
   */
  setUserProperties(properties: Record<string, any>): void {
    if (!this.initialized) {
      console.warn('PostHog not initialized');
      return;
    }

    posthog.people.set(properties);
  }

  /**
   * Reset user (for logout)
   */
  reset(): void {
    if (!this.initialized) {
      console.warn('PostHog not initialized');
      return;
    }

    posthog.reset();
    this.generationStartTimes.clear();
    this.uploadStartTime = undefined;
  }

  /**
   * Get distinct ID for current user
   */
  getDistinctId(): string | undefined {
    if (!this.initialized) {
      console.warn('PostHog not initialized');
      return undefined;
    }

    return posthog.get_distinct_id();
  }

  /**
   * Opt user out of tracking
   */
  optOut(): void {
    if (!this.initialized) {
      console.warn('PostHog not initialized');
      return;
    }

    posthog.opt_out_capturing();
  }

  /**
   * Opt user back into tracking
   */
  optIn(): void {
    if (!this.initialized) {
      console.warn('PostHog not initialized');
      return;
    }

    posthog.opt_in_capturing();
  }

  /**
   * Track counter increment with comprehensive metadata
   */
  trackCounterIncrement(properties: CounterIncrementProperties): void {
    if (!this.initialized) {
      return; // Silently ignore if not initialized
    }

    try {
      this.track(EventName.GENERATION_COUNTER_INCREMENTED, {
        ...properties,
        timestamp: Date.now(),
        // Add derived metrics for better analytics
        averageSuccessRate: properties.successRate,
        isFullySuccessful: properties.successfulStyles === properties.totalStyles,
        hasCustomPrompt: !!properties.customPrompt,
        customPromptLength: properties.customPrompt?.length || 0,
        // Add user context
        userAgent: navigator.userAgent,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
    } catch (error) {
      console.warn('PostHog counter tracking error (continuing silently):', error);
    }
  }

  /**
   * Track counter milestone achievements
   */
  trackCounterMilestone(milestone: number, totalGenerations: number): void {
    if (!this.initialized) {
      return;
    }

    try {
      this.track('counter_milestone_reached', {
        milestone,
        totalGenerations,
        achievedAt: Date.now(),
        userAgent: navigator.userAgent,
      });
    } catch (error) {
      console.warn('PostHog milestone tracking error (continuing silently):', error);
    }
  }

  /**
   * Track user engagement patterns
   */
  trackUserEngagementMetrics(metrics: {
    sessionDuration: number;
    generationsInSession: number;
    timeToFirstGeneration: number;
    averageTimeBetweenGenerations?: number;
  }): void {
    if (!this.initialized) {
      return;
    }

    try {
      this.track('user_engagement_metrics', {
        ...metrics,
        timestamp: Date.now(),
        engagementScore: this.calculateEngagementScore(metrics),
      });
    } catch (error) {
      console.warn('PostHog engagement tracking error (continuing silently):', error);
    }
  }

  /**
   * Calculate engagement score based on user behavior
   */
  private calculateEngagementScore(metrics: {
    sessionDuration: number;
    generationsInSession: number;
    timeToFirstGeneration: number;
  }): number {
    // Simple engagement scoring algorithm
    const durationScore = Math.min(metrics.sessionDuration / (5 * 60 * 1000), 1); // Max 5 minutes
    const generationScore = Math.min(metrics.generationsInSession / 5, 1); // Max 5 generations
    const speedScore = Math.max(0, 1 - (metrics.timeToFirstGeneration / (2 * 60 * 1000))); // Faster is better, max 2 minutes
    
    return (durationScore * 0.4 + generationScore * 0.4 + speedScore * 0.2) * 100;
  }

  /**
   * Get aggregated metrics (placeholder for future PostHog API integration)
   * This would require server-side implementation or PostHog personal API key
   */
  async getAggregatedMetrics(): Promise<{
    totalGenerations?: number;
    uniqueUsers?: number;
    averageGenerationsPerUser?: number;
    message: string;
  }> {
    // This is a placeholder for future implementation
    // Real implementation would require:
    // 1. Server-side API with PostHog personal API key
    // 2. Query PostHog's analytics API
    // 3. Aggregate GENERATION_COMPLETED events
    
    return {
      message: 'PostHog metrics API integration pending. Use counterService.getMetrics() for local data.',
      totalGenerations: undefined,
      uniqueUsers: undefined,
      averageGenerationsPerUser: undefined,
    };
  }
}

// Export singleton instance
export const posthogService = PostHogService.getInstance();

// Export types for use in components
export type { PostHogConfig };