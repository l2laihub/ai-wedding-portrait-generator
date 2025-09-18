/**
 * Rate Limiter for Wedding Portrait Generator
 * Implements daily limits with localStorage persistence and midnight reset
 * Enhanced with authentication rate limiting
 */

export interface RateLimitConfig {
  FREE_DAILY: number;
  SESSION_KEY: string;
  RESET_HOUR: number; // 0 = midnight
}

export interface AuthRateLimitConfig {
  LOGIN_ATTEMPTS: number;
  SIGNUP_ATTEMPTS: number;
  PASSWORD_RESET_ATTEMPTS: number;
  WINDOW_MINUTES: number;
  BLOCK_DURATION_MINUTES: number;
}

export interface UsageData {
  date: string; // YYYY-MM-DD format
  used: number;
  lastReset: number; // timestamp
}

export interface AuthAttemptData {
  identifier: string; // email or IP
  action: string;
  attempts: number;
  windowStart: number; // timestamp
  blockedUntil?: number; // timestamp
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

  private authConfig: AuthRateLimitConfig = {
    LOGIN_ATTEMPTS: 5,
    SIGNUP_ATTEMPTS: 3,
    PASSWORD_RESET_ATTEMPTS: 3,
    WINDOW_MINUTES: 60, // 1 hour window
    BLOCK_DURATION_MINUTES: 15 // 15 minute block
  };

  // Display limit for UI (same as internal limit now)
  public readonly DISPLAY_LIMIT = 3;

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
   * Get the next reset time (midnight local time)
   */
  private getNextResetTime(): Date {
    const now = new Date();
    const resetTime = new Date(now);
    
    // Set to midnight tonight
    resetTime.setHours(24, 0, 0, 0);
    
    // If it's already past midnight (shouldn't happen with proper reset), add a day
    if (resetTime.getTime() <= now.getTime()) {
      resetTime.setDate(resetTime.getDate() + 1);
    }
    
    return resetTime;
  }

  /**
   * Get current usage data from localStorage
   */
  private getUsageData(): UsageData {
    try {
      const stored = localStorage.getItem(this.config.SESSION_KEY);
      if (!stored) {
        console.log('No stored usage data found, creating fresh data');
        return this.createFreshUsageData();
      }

      const data: UsageData = JSON.parse(stored);
      const currentDate = this.getCurrentDateKey();

      // Validate data structure
      if (!data.date || typeof data.used !== 'number' || !data.lastReset) {
        console.warn('Invalid usage data structure, creating fresh data:', data);
        return this.createFreshUsageData();
      }

      // Check if we need to reset for a new day
      if (data.date !== currentDate) {
        console.log('Date changed, creating fresh data. Old:', data.date, 'New:', currentDate);
        return this.createFreshUsageData();
      }

      // Validate usage count isn't negative or excessive
      if (data.used < 0 || data.used > this.config.FREE_DAILY) {
        console.warn('Invalid usage count, resetting. Usage:', data.used, 'Limit:', this.config.FREE_DAILY);
        return this.createFreshUsageData();
      }

      console.log('Using existing usage data:', data);
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
    const freshData = {
      date: this.getCurrentDateKey(),
      used: 0,
      lastReset: Date.now()
    };
    
    console.log('Creating fresh usage data:', freshData);
    
    // Immediately save fresh data to localStorage and trigger events
    this.saveUsageData(freshData);
    
    return freshData;
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
    // Force auto-reset check before checking limits
    this.checkAndAutoReset();
    
    const usage = this.getUsageData();
    const remaining = Math.max(0, this.config.FREE_DAILY - usage.used);
    const canProceed = remaining > 0;

    console.log('Rate limit check:', {
      usage: usage.used,
      remaining,
      total: this.config.FREE_DAILY,
      canProceed,
      date: usage.date
    });

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
    
    console.log('consumeCredit called:', {
      currentUsage: usage.used,
      limit: this.config.FREE_DAILY,
      canConsume: usage.used < this.config.FREE_DAILY
    });
    
    if (usage.used >= this.config.FREE_DAILY) {
      console.warn('Attempted to consume credit but already at limit');
      // Already at limit, don't increment
      return this.checkLimit();
    }

    // Increment usage
    usage.used += 1;
    console.log('Credit consumed, new usage:', usage.used);
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
   * Force refresh counter (for troubleshooting localStorage issues)
   */
  public forceRefresh(): void {
    const usage = this.getUsageData();
    // Re-save to trigger events
    this.saveUsageData(usage);
  }

  /**
   * Strict validation - returns true if user definitely CANNOT proceed
   */
  public isStrictlyAtLimit(): boolean {
    const usage = this.getUsageData();
    const stats = this.getUsageStats();
    const limit = this.checkLimit();
    
    const atLimit = (
      usage.used >= this.config.FREE_DAILY ||
      stats.remaining <= 0 ||
      stats.used >= this.config.FREE_DAILY ||
      !limit.canProceed ||
      limit.remaining <= 0
    );
    
    console.log('Strict limit check:', {
      usage: usage.used,
      limit: this.config.FREE_DAILY,
      statsRemaining: stats.remaining,
      statsUsed: stats.used,
      canProceed: limit.canProceed,
      limitRemaining: limit.remaining,
      atLimit
    });
    
    return atLimit;
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

  /**
   * Authentication Rate Limiting Methods
   */

  /**
   * Get auth attempt data from localStorage
   */
  private getAuthAttemptData(identifier: string, action: string): AuthAttemptData | null {
    try {
      const key = `wedai_auth_${action}_${identifier}`;
      const stored = localStorage.getItem(key);
      if (!stored) return null;

      const data: AuthAttemptData = JSON.parse(stored);
      const now = Date.now();
      const windowDuration = this.authConfig.WINDOW_MINUTES * 60 * 1000;

      // Check if window has expired
      if (now - data.windowStart > windowDuration) {
        localStorage.removeItem(key);
        return null;
      }

      return data;
    } catch (error) {
      console.warn('Failed to read auth attempt data:', error);
      return null;
    }
  }

  /**
   * Save auth attempt data to localStorage
   */
  private saveAuthAttemptData(data: AuthAttemptData): void {
    try {
      const key = `wedai_auth_${data.action}_${data.identifier}`;
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save auth attempt data:', error);
    }
  }

  /**
   * Check authentication rate limit
   */
  public async checkAuthLimit(identifier: string, action: string): Promise<boolean> {
    const now = Date.now();
    const data = this.getAuthAttemptData(identifier, action);

    // Check if currently blocked
    if (data?.blockedUntil && now < data.blockedUntil) {
      return false;
    }

    // Get max attempts for this action
    let maxAttempts: number;
    switch (action) {
      case 'login_attempt':
        maxAttempts = this.authConfig.LOGIN_ATTEMPTS;
        break;
      case 'signup_attempt':
        maxAttempts = this.authConfig.SIGNUP_ATTEMPTS;
        break;
      case 'password_reset':
        maxAttempts = this.authConfig.PASSWORD_RESET_ATTEMPTS;
        break;
      default:
        maxAttempts = 5; // default limit
    }

    // Check if within limits
    if (!data) {
      return true; // No previous attempts
    }

    return data.attempts < maxAttempts;
  }

  /**
   * Record authentication attempt
   */
  public recordAuthAttempt(identifier: string, action: string, failed: boolean = false): void {
    const now = Date.now();
    let data = this.getAuthAttemptData(identifier, action);

    if (!data) {
      // First attempt
      data = {
        identifier,
        action,
        attempts: 1,
        windowStart: now
      };
    } else {
      // Increment attempts
      data.attempts += 1;
    }

    // Check if should be blocked
    let maxAttempts: number;
    switch (action) {
      case 'login_attempt':
        maxAttempts = this.authConfig.LOGIN_ATTEMPTS;
        break;
      case 'signup_attempt':
        maxAttempts = this.authConfig.SIGNUP_ATTEMPTS;
        break;
      case 'password_reset':
        maxAttempts = this.authConfig.PASSWORD_RESET_ATTEMPTS;
        break;
      default:
        maxAttempts = 5;
    }

    if (failed && data.attempts >= maxAttempts) {
      const blockDuration = this.authConfig.BLOCK_DURATION_MINUTES * 60 * 1000;
      data.blockedUntil = now + blockDuration;
    }

    this.saveAuthAttemptData(data);

    // If successful, clear the attempt data
    if (!failed) {
      this.clearAuthAttempts(identifier, action);
    }
  }

  /**
   * Clear authentication attempts (called after successful auth)
   */
  public clearAuthAttempts(identifier: string, action: string): void {
    try {
      const key = `wedai_auth_${action}_${identifier}`;
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('Failed to clear auth attempts:', error);
    }
  }

  /**
   * Check if identifier is currently blocked
   */
  public isBlocked(identifier: string, action: string): boolean {
    const data = this.getAuthAttemptData(identifier, action);
    if (!data || !data.blockedUntil) return false;

    const now = Date.now();
    return now < data.blockedUntil;
  }

  /**
   * Get time until unblocked
   */
  public getTimeUntilUnblocked(identifier: string, action: string): number {
    const data = this.getAuthAttemptData(identifier, action);
    if (!data || !data.blockedUntil) return 0;

    const now = Date.now();
    return Math.max(0, data.blockedUntil - now);
  }

  /**
   * Get remaining attempts for action
   */
  public getRemainingAttempts(identifier: string, action: string): number {
    const data = this.getAuthAttemptData(identifier, action);
    
    let maxAttempts: number;
    switch (action) {
      case 'login_attempt':
        maxAttempts = this.authConfig.LOGIN_ATTEMPTS;
        break;
      case 'signup_attempt':
        maxAttempts = this.authConfig.SIGNUP_ATTEMPTS;
        break;
      case 'password_reset':
        maxAttempts = this.authConfig.PASSWORD_RESET_ATTEMPTS;
        break;
      default:
        maxAttempts = 5;
    }

    if (!data) return maxAttempts;
    return Math.max(0, maxAttempts - data.attempts);
  }

  /**
   * Clean up expired auth attempt data
   */
  public cleanupExpiredAuthData(): void {
    try {
      const now = Date.now();
      const windowDuration = this.authConfig.WINDOW_MINUTES * 60 * 1000;

      // Get all localStorage keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith('wedai_auth_')) continue;

        try {
          const stored = localStorage.getItem(key);
          if (!stored) continue;

          const data: AuthAttemptData = JSON.parse(stored);
          
          // Remove if window expired and not currently blocked
          if (now - data.windowStart > windowDuration && (!data.blockedUntil || now > data.blockedUntil)) {
            localStorage.removeItem(key);
          }
        } catch (error) {
          // Remove invalid data
          localStorage.removeItem(key);
        }
      }
    } catch (error) {
      console.warn('Failed to cleanup auth data:', error);
    }
  }
}

// Export singleton instance
export const rateLimiter = new RateLimiter();

// Export types and utilities
export default rateLimiter;