/**
 * Rate Limiter for Wedding Portrait Generator
 * Implements daily limits with localStorage persistence and midnight reset
 */

export interface RateLimitConfig {
  FREE_DAILY: number;
  SESSION_KEY: string;
  RESET_HOUR: number; // 0 = midnight
}

export interface UsageData {
  date: string; // YYYY-MM-DD format
  used: number;
  lastReset: number; // timestamp
}

export interface RateLimitResult {
  canProceed: boolean;
  remaining: number;
  total: number;
  resetsAt: Date;
  isAtLimit: boolean;
}

class RateLimiter {
  private config: RateLimitConfig = {
    FREE_DAILY: 3,
    SESSION_KEY: 'wedai_usage',
    RESET_HOUR: 0 // midnight
  };

  /**
   * Get current date in YYYY-MM-DD format for tracking
   */
  private getCurrentDateKey(): string {
    const now = new Date();
    // Adjust for Pacific Time (UTC-8 or UTC-7 depending on DST)
    const pacificOffset = -8 * 60; // PST is UTC-8
    const pacificTime = new Date(now.getTime() + (pacificOffset * 60 * 1000));
    return pacificTime.toISOString().split('T')[0];
  }

  /**
   * Get the next reset time (midnight PT)
   */
  private getNextResetTime(): Date {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(this.config.RESET_HOUR, 0, 0, 0);
    
    // Adjust for Pacific Time
    const pacificOffset = -8 * 60; // PST is UTC-8
    return new Date(tomorrow.getTime() + (pacificOffset * 60 * 1000));
  }

  /**
   * Get current usage data from localStorage
   */
  private getUsageData(): UsageData {
    try {
      const stored = localStorage.getItem(this.config.SESSION_KEY);
      if (!stored) {
        return this.createFreshUsageData();
      }

      const data: UsageData = JSON.parse(stored);
      const currentDate = this.getCurrentDateKey();

      // Check if we need to reset for a new day
      if (data.date !== currentDate) {
        return this.createFreshUsageData();
      }

      return data;
    } catch (error) {
      console.warn('Failed to read usage data from localStorage:', error);
      return this.createFreshUsageData();
    }
  }

  /**
   * Create fresh usage data for a new day
   */
  private createFreshUsageData(): UsageData {
    return {
      date: this.getCurrentDateKey(),
      used: 0,
      lastReset: Date.now()
    };
  }

  /**
   * Save usage data to localStorage and emit update event
   */
  private saveUsageData(data: UsageData): void {
    try {
      localStorage.setItem(this.config.SESSION_KEY, JSON.stringify(data));
      // Emit custom event for counter synchronization
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('counterUpdate', {
          detail: { remaining: this.config.FREE_DAILY - data.used }
        }));
      }
    } catch (error) {
      console.warn('Failed to save usage data to localStorage:', error);
    }
  }

  /**
   * Check if user can proceed with generation and get remaining credits
   */
  public checkLimit(): RateLimitResult {
    const usage = this.getUsageData();
    const remaining = Math.max(0, this.config.FREE_DAILY - usage.used);
    const canProceed = remaining > 0;

    return {
      canProceed,
      remaining,
      total: this.config.FREE_DAILY,
      resetsAt: this.getNextResetTime(),
      isAtLimit: remaining === 0
    };
  }

  /**
   * Consume one credit (call this when generation starts)
   */
  public consumeCredit(): RateLimitResult {
    const usage = this.getUsageData();
    
    if (usage.used >= this.config.FREE_DAILY) {
      // Already at limit, don't increment
      return this.checkLimit();
    }

    // Increment usage
    usage.used += 1;
    this.saveUsageData(usage);

    return this.checkLimit();
  }

  /**
   * Get time until next reset in human readable format
   */
  public getTimeUntilReset(): string {
    const resetTime = this.getNextResetTime();
    const now = new Date();
    const diff = resetTime.getTime() - now.getTime();

    if (diff <= 0) {
      return 'Resetting now...';
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  /**
   * Reset usage (for testing or admin purposes)
   */
  public resetUsage(): void {
    const freshData = this.createFreshUsageData();
    this.saveUsageData(freshData);
  }

  /**
   * Get current usage stats for display
   */
  public getUsageStats(): { used: number; remaining: number; total: number; percentage: number } {
    const usage = this.getUsageData();
    const remaining = Math.max(0, this.config.FREE_DAILY - usage.used);
    const percentage = Math.round((usage.used / this.config.FREE_DAILY) * 100);

    return {
      used: usage.used,
      remaining,
      total: this.config.FREE_DAILY,
      percentage
    };
  }

  /**
   * Check if it's a new day and auto-reset if needed
   */
  public checkAndAutoReset(): boolean {
    const usage = this.getUsageData();
    const currentDate = this.getCurrentDateKey();

    if (usage.date !== currentDate) {
      this.resetUsage();
      return true; // Reset occurred
    }
    return false; // No reset needed
  }
}

// Export singleton instance
export const rateLimiter = new RateLimiter();

// Export types and utilities
export default rateLimiter;