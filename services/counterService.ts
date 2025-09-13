import { posthogService, EventName } from './posthogService';

// Counter storage keys
const STORAGE_KEYS = {
  TOTAL_GENERATIONS: 'wedai_total_generations',
  DAILY_GENERATIONS: 'wedai_daily_generations',
  LAST_RESET_DATE: 'wedai_last_reset_date',
  GENERATION_HISTORY: 'wedai_generation_history',
} as const;

// Generation history entry
interface GenerationHistoryEntry {
  generationId: string;
  timestamp: number;
  successfulStyles: number;
  totalStyles: number;
  photoType: 'single' | 'couple' | 'family';
}

// Counter metrics interface
export interface CounterMetrics {
  totalGenerations: number;
  dailyGenerations: number;
  generationHistory: GenerationHistoryEntry[];
  lastResetDate: string;
}

// Custom event for counter tracking
export const COUNTER_EVENT = 'generation_counter_incremented' as const;

class CounterService {
  private static instance: CounterService;
  private metrics: CounterMetrics;
  private listeners: Set<(metrics: CounterMetrics) => void> = new Set();

  private constructor() {
    this.metrics = this.loadMetrics();
    this.checkDailyReset();
  }

  static getInstance(): CounterService {
    if (!CounterService.instance) {
      CounterService.instance = new CounterService();
    }
    return CounterService.instance;
  }

  /**
   * Load metrics from localStorage
   */
  private loadMetrics(): CounterMetrics {
    try {
      // Set realistic baseline values - app released YESTERDAY with 2k requests today
      // Assuming ~3 API calls per user generation session (3 styles generated)
      const BASELINE_TOTAL = 950;   // Realistic: ~200 yesterday + ~750 today
      const BASELINE_DAILY = 650;   // Today's estimate: ~2k requests ÷ 3 styles = ~650 generations
      
      const storedTotal = localStorage.getItem(STORAGE_KEYS.TOTAL_GENERATIONS);
      const storedDaily = localStorage.getItem(STORAGE_KEYS.DAILY_GENERATIONS);
      
      // Use stored values if they exist and are higher than baseline, otherwise use baseline
      const totalGenerations = Math.max(
        parseInt(storedTotal || '0', 10),
        BASELINE_TOTAL
      );
      const dailyGenerations = Math.max(
        parseInt(storedDaily || '0', 10), 
        BASELINE_DAILY
      );
      
      const lastResetDate = localStorage.getItem(STORAGE_KEYS.LAST_RESET_DATE) || new Date().toISOString().split('T')[0];
      const historyJson = localStorage.getItem(STORAGE_KEYS.GENERATION_HISTORY) || '[]';
      const generationHistory = JSON.parse(historyJson) as GenerationHistoryEntry[];

      return {
        totalGenerations,
        dailyGenerations,
        lastResetDate,
        generationHistory: generationHistory.slice(-100), // Keep last 100 entries
      };
    } catch (error) {
      console.error('Error loading counter metrics:', error);
      return {
        totalGenerations: 950,   // Fallback to day-old app baseline
        dailyGenerations: 650,   // Fallback to today's usage baseline
        lastResetDate: new Date().toISOString().split('T')[0],
        generationHistory: [],
      };
    }
  }

  /**
   * Save metrics to localStorage
   */
  private saveMetrics(): void {
    try {
      localStorage.setItem(STORAGE_KEYS.TOTAL_GENERATIONS, this.metrics.totalGenerations.toString());
      localStorage.setItem(STORAGE_KEYS.DAILY_GENERATIONS, this.metrics.dailyGenerations.toString());
      localStorage.setItem(STORAGE_KEYS.LAST_RESET_DATE, this.metrics.lastResetDate);
      localStorage.setItem(STORAGE_KEYS.GENERATION_HISTORY, JSON.stringify(this.metrics.generationHistory));
    } catch (error) {
      console.error('Error saving counter metrics:', error);
    }
  }

  /**
   * Check if daily counter needs reset
   */
  private checkDailyReset(): void {
    const today = new Date().toISOString().split('T')[0];
    if (this.metrics.lastResetDate !== today) {
      this.metrics.dailyGenerations = 0;
      this.metrics.lastResetDate = today;
      this.saveMetrics();
    }
  }

  /**
   * Increment generation counter
   */
  incrementCounter(generationId: string, successfulStyles: number, totalStyles: number, photoType: 'single' | 'couple' | 'family' = 'couple'): void {
    // Check daily reset before incrementing
    this.checkDailyReset();

    // Increment counters
    this.metrics.totalGenerations += 1;
    this.metrics.dailyGenerations += 1;

    // Add to history
    const historyEntry: GenerationHistoryEntry = {
      generationId,
      timestamp: Date.now(),
      successfulStyles,
      totalStyles,
      photoType,
    };
    this.metrics.generationHistory.push(historyEntry);

    // Keep only last 100 entries
    if (this.metrics.generationHistory.length > 100) {
      this.metrics.generationHistory = this.metrics.generationHistory.slice(-100);
    }

    // Save to localStorage
    this.saveMetrics();

    // Notify listeners
    this.notifyListeners();

    // Track in PostHog with enhanced metadata
    try {
      posthogService.trackCounterIncrement({
        generationId,
        totalGenerations: this.metrics.totalGenerations,
        dailyGenerations: this.metrics.dailyGenerations,
        successfulStyles,
        totalStyles,
        successRate: totalStyles > 0 ? successfulStyles / totalStyles : 0,
        photoType,
        timestamp: Date.now(),
      });

      // Track milestone achievements
      this.checkAndTrackMilestones(this.metrics.totalGenerations);
    } catch (error) {
      console.warn('Failed to track counter increment in PostHog:', error);
    }
  }

  /**
   * Check and track milestone achievements
   */
  private checkAndTrackMilestones(totalGenerations: number): void {
    const milestones = [1, 10, 50, 100, 500, 1000, 5000, 10000];
    const lastMilestone = parseInt(localStorage.getItem('wedai_last_milestone') || '0', 10);
    
    for (const milestone of milestones) {
      if (totalGenerations >= milestone && lastMilestone < milestone) {
        posthogService.trackCounterMilestone(milestone, totalGenerations);
        localStorage.setItem('wedai_last_milestone', milestone.toString());
        break; // Only track one milestone at a time
      }
    }
  }

  /**
   * Get current counter value
   */
  getTotalGenerations(): number {
    return this.metrics.totalGenerations;
  }

  /**
   * Get daily generation count
   */
  getDailyGenerations(): number {
    this.checkDailyReset();
    return this.metrics.dailyGenerations;
  }

  /**
   * Get all metrics
   */
  getMetrics(): CounterMetrics {
    this.checkDailyReset();
    return { ...this.metrics };
  }

  /**
   * Get generation statistics
   */
  getStatistics() {
    const history = this.metrics.generationHistory;
    const last24Hours = Date.now() - 24 * 60 * 60 * 1000;
    const last7Days = Date.now() - 7 * 24 * 60 * 60 * 1000;

    const recent24h = history.filter(h => h.timestamp > last24Hours);
    const recent7d = history.filter(h => h.timestamp > last7Days);

    return {
      total: this.metrics.totalGenerations,
      today: this.metrics.dailyGenerations,
      last24Hours: recent24h.length,
      last7Days: recent7d.length,
      averageSuccessRate: this.calculateAverageSuccessRate(history),
      successRateLast24h: this.calculateAverageSuccessRate(recent24h),
      photoTypeDistribution: this.getPhotoTypeDistribution(history),
    };
  }

  /**
   * Calculate average success rate
   */
  private calculateAverageSuccessRate(history: GenerationHistoryEntry[]): number {
    if (history.length === 0) return 0;
    const totalSuccess = history.reduce((sum, h) => sum + h.successfulStyles, 0);
    const totalAttempts = history.reduce((sum, h) => sum + h.totalStyles, 0);
    return totalAttempts > 0 ? totalSuccess / totalAttempts : 0;
  }

  /**
   * Get photo type distribution
   */
  private getPhotoTypeDistribution(history: GenerationHistoryEntry[]): Record<string, number> {
    const distribution: Record<string, number> = {
      single: 0,
      couple: 0,
      family: 0,
    };

    history.forEach(h => {
      distribution[h.photoType] = (distribution[h.photoType] || 0) + 1;
    });

    return distribution;
  }

  /**
   * Prepare for future PostHog API integration
   * This method will be used when we have server-side access to PostHog data
   */
  async getAggregatedMetricsFromPostHog(): Promise<any> {
    // Placeholder for future PostHog API integration
    // This will require server-side implementation or PostHog personal API key
    console.info('PostHog aggregated metrics will be available in future update');
    return {
      message: 'PostHog API integration pending',
      localMetrics: this.getStatistics(),
    };
  }

  /**
   * Reset counters (for testing or admin purposes)
   */
  resetCounters(resetHistory = false): void {
    this.metrics.totalGenerations = 0;
    this.metrics.dailyGenerations = 0;
    this.metrics.lastResetDate = new Date().toISOString().split('T')[0];
    
    if (resetHistory) {
      this.metrics.generationHistory = [];
    }

    this.saveMetrics();
  }

  /**
   * Export metrics for debugging
   */
  exportMetrics(): string {
    return JSON.stringify(this.getMetrics(), null, 2);
  }

  /**
   * Admin method to update baseline counters (for production updates)
   * Call this when you have updated API usage statistics
   */
  updateBaseline(totalGenerations: number, dailyGenerations: number): void {
    // Only update if new values are higher than current
    if (totalGenerations > this.metrics.totalGenerations) {
      this.metrics.totalGenerations = totalGenerations;
    }
    if (dailyGenerations > this.metrics.dailyGenerations) {
      this.metrics.dailyGenerations = dailyGenerations;
    }
    
    this.saveMetrics();
    this.notifyListeners();
  }

  /**
   * Admin method to sync with real API usage data
   * This could be called periodically or manually by admin
   */
  async syncWithAPIUsage(apiRequestsToday: number, totalApiRequests: number): Promise<void> {
    try {
      // Conservative estimation: 3-5 API requests per user generation
      const REQUESTS_PER_GENERATION = 4;
      
      const estimatedDailyGenerations = Math.floor(apiRequestsToday / REQUESTS_PER_GENERATION);
      const estimatedTotalGenerations = Math.floor(totalApiRequests / REQUESTS_PER_GENERATION);

      // Update baseline if API-derived numbers are higher
      this.updateBaseline(estimatedTotalGenerations, estimatedDailyGenerations);
      
      console.log(`Counter synced with API usage: ${estimatedTotalGenerations} total, ${estimatedDailyGenerations} daily`);
    } catch (error) {
      console.error('Failed to sync with API usage:', error);
    }
  }

  /**
   * Get formatted counter display string
   */
  getFormattedCounter(): string {
    const total = this.getTotalGenerations();
    if (total === 0) return 'Be the first to generate!';
    if (total < 10) return `${total} portraits generated`;
    if (total < 100) return `${total} happy couples`;
    if (total < 1000) return `${total} love stories`;
    if (total < 10000) return `${Math.floor(total / 1000)}k+ dreams created`;
    return `${Math.floor(total / 1000)}k+ memories made`;
  }

  /**
   * Subscribe to counter updates (for reactive UI)
   */
  subscribe(listener: (metrics: CounterMetrics) => void): () => void {
    this.listeners.add(listener);
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of metric changes
   */
  private notifyListeners(): void {
    const metrics = this.getMetrics();
    this.listeners.forEach(listener => {
      try {
        listener(metrics);
      } catch (error) {
        console.error('Error in counter listener:', error);
      }
    });
  }

}

// Export singleton instance
export const counterService = CounterService.getInstance();

// Make counter service available globally for admin scripts (development/admin only)
if (typeof window !== 'undefined') {
  (window as any).counterServiceInstance = counterService;
}

// Export types
export type { GenerationHistoryEntry };

// Export convenience functions for easy access
export const getGenerationCount = () => counterService.getTotalGenerations();
export const getDailyCount = () => counterService.getDailyCount();
export const incrementGenerationCount = (metadata: GenerationMetadata) => 
  counterService.incrementGeneration(metadata);
export const subscribeToCounterChanges = (listener: (count: number) => void) => 
  counterService.subscribe(() => listener(counterService.getTotalGenerations()));