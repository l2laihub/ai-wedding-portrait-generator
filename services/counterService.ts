import { posthogService, EventName } from './posthogService';
import { databaseService } from './databaseService';
import { supabase, isSupabaseConfigured } from './supabaseClient';

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
   * Load metrics from database (preferred) or localStorage fallback
   */
  private loadMetrics(): CounterMetrics {
    const defaultMetrics = {
      totalGenerations: 0,
      dailyGenerations: 0,
      lastResetDate: new Date().toISOString().split('T')[0],
      generationHistory: [],
    };

    try {
      // Load from localStorage for immediate display
      const historyJson = localStorage.getItem(STORAGE_KEYS.GENERATION_HISTORY) || '[]';
      const generationHistory = JSON.parse(historyJson) as GenerationHistoryEntry[];
      const lastResetDate = localStorage.getItem(STORAGE_KEYS.LAST_RESET_DATE) || new Date().toISOString().split('T')[0];
      
      // Try to load from localStorage first for immediate display
      const storedTotal = parseInt(localStorage.getItem(STORAGE_KEYS.TOTAL_GENERATIONS) || '0', 10);
      const storedDaily = parseInt(localStorage.getItem(STORAGE_KEYS.DAILY_GENERATIONS) || '0', 10);

      const metrics = {
        totalGenerations: storedTotal,
        dailyGenerations: storedDaily,
        lastResetDate,
        generationHistory: generationHistory.slice(-100),
      };

      // Asynchronously refresh from database
      this.refreshFromDatabase();

      return metrics;
    } catch (error) {
      console.error('Error loading counter metrics:', error);
      return defaultMetrics;
    }
  }

  /**
   * Refresh metrics from database and sync with localStorage
   */
  private async refreshFromDatabase(): Promise<void> {
    try {
      if (!isSupabaseConfigured()) {
        console.log('Database not configured, using localStorage only');
        return;
      }

      // Query admin_stats view for accurate counts
      const { data: adminStats, error } = await supabase
        .from('admin_stats')
        .select('total_generations, today_generations')
        .single();

      if (error) {
        console.warn('Failed to fetch admin stats, falling back to databaseService:', error);
        // Fallback to databaseService method
        const summary = await databaseService.getAnalyticsSummary();
        this.updateMetricsFromDatabase(summary.totalGenerations, summary.todayGenerations);
        return;
      }

      if (adminStats) {
        this.updateMetricsFromDatabase(adminStats.total_generations || 0, adminStats.today_generations || 0);
      }
    } catch (error) {
      console.warn('Error refreshing from database:', error);
      // Try fallback method
      try {
        const summary = await databaseService.getAnalyticsSummary();
        this.updateMetricsFromDatabase(summary.totalGenerations, summary.todayGenerations);
      } catch (fallbackError) {
        console.error('Fallback database query also failed:', fallbackError);
      }
    }
  }

  /**
   * Update metrics with database values and save to localStorage
   */
  private updateMetricsFromDatabase(totalFromDB: number, todayFromDB: number): void {
    // Only update if database values are higher (prevents going backwards)
    const oldTotal = this.metrics.totalGenerations;
    const oldDaily = this.metrics.dailyGenerations;
    
    this.metrics.totalGenerations = Math.max(this.metrics.totalGenerations, totalFromDB);
    this.metrics.dailyGenerations = Math.max(this.metrics.dailyGenerations, todayFromDB);
    
    // If values changed, save to localStorage and notify listeners
    if (this.metrics.totalGenerations !== oldTotal || this.metrics.dailyGenerations !== oldDaily) {
      this.saveMetrics();
      this.notifyListeners();
      console.log(`Counter synced from database: ${this.metrics.totalGenerations} total, ${this.metrics.dailyGenerations} daily`);
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
   * Get daily generation count with automatic refresh
   */
  getDailyGenerations(): number {
    this.checkDailyReset();
    // Refresh from database periodically
    this.refreshFromDatabaseIfStale();
    return this.metrics.dailyGenerations;
  }

  /**
   * Get total generation count with automatic refresh
   */
  getTotalGenerations(): number {
    // Refresh from database periodically
    this.refreshFromDatabaseIfStale();
    return this.metrics.totalGenerations;
  }

  /**
   * Refresh from database if data is stale (more than 5 minutes old)
   */
  private refreshFromDatabaseIfStale(): void {
    const lastRefresh = parseInt(localStorage.getItem('wedai_last_db_refresh') || '0', 10);
    const now = Date.now();
    const FIVE_MINUTES = 5 * 60 * 1000;

    if (now - lastRefresh > FIVE_MINUTES) {
      localStorage.setItem('wedai_last_db_refresh', now.toString());
      this.refreshFromDatabase(); // Don't await, let it run in background
    }
  }

  /**
   * Force refresh from database (public method for manual refresh)
   */
  async forceRefreshFromDatabase(): Promise<void> {
    localStorage.setItem('wedai_last_db_refresh', Date.now().toString());
    await this.refreshFromDatabase();
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
export const getDailyCount = () => counterService.getDailyGenerations();
export const refreshCounterFromDatabase = () => counterService.forceRefreshFromDatabase();
export const subscribeToCounterChanges = (listener: (count: number) => void) => 
  counterService.subscribe(() => listener(counterService.getTotalGenerations()));