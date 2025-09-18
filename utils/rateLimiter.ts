/**
 * Rate Limiter for Wedding Portrait Generator
 * Implements daily limits with localStorage persistence and midnight reset
 * Enhanced with authentication rate limiting and package integration
 */

import { PhotoPackagesService, type RateLimitCheck } from '../services/photoPackagesService';

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

export interface PackageRateLimitResult extends RateLimitResult {
  packageLimitCheck?: RateLimitCheck;
  userType?: 'anonymous' | 'free' | 'paid' | 'premium';
}

class RateLimiter {
  private config: RateLimitConfig = {
    FREE_DAILY: 3, // Daily limit is 3 photo shoots for anonymous users
    SESSION_KEY: 'wedai_usage',
    RESET_HOUR: 0 // midnight Pacific Time
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
    // Use Intl.DateTimeFormat to properly handle Pacific Time with DST
    const pacificDateStr = now.toLocaleDateString('en-US', {
      timeZone: 'America/Los_Angeles',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    // Convert MM/DD/YYYY to YYYY-MM-DD
    const [month, day, year] = pacificDateStr.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  /**
   * Get the next reset time (midnight Pacific Time)
   */
  private getNextResetTime(): Date {
    const now = new Date();
    
    // Get tomorrow's date in Pacific Time
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Format tomorrow's date in Pacific Time as YYYY-MM-DD
    const tomorrowPacific = tomorrow.toLocaleDateString('en-US', {
      timeZone: 'America/Los_Angeles',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    
    // Convert MM/DD/YYYY to YYYY-MM-DD 00:00:00 Pacific Time
    const [month, day, year] = tomorrowPacific.split('/');
    const midnightPacificStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00`;
    
    // Create a formatter for Pacific Time with specific format
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    
    // Find the local time that corresponds to midnight Pacific Time tomorrow
    // We'll check times in the next 48 hours to find when Pacific Time hits our target
    for (let hoursAhead = 0; hoursAhead < 48; hoursAhead++) {
      const checkTime = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);
      const pacificTimeStr = formatter.format(checkTime);
      
      // Extract date portion in YYYY-MM-DD format
      const [datePart] = pacificTimeStr.split(', ');
      const [m, d, y] = datePart.split('/');
      const checkDateStr = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T00:00:00`;
      
      // Check if this matches our target midnight
      if (checkDateStr === midnightPacificStr) {
        // Check if we're at midnight (00:00:00)
        const timePart = pacificTimeStr.split(', ')[1];
        if (timePart.startsWith('00:00:')) {
          return checkTime;
        }
      }
    }
    
    // Fallback: return tomorrow at local midnight
    const fallback = new Date(now);
    fallback.setDate(fallback.getDate() + 1);
    fallback.setHours(0, 0, 0, 0);
    return fallback;
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
        console.log('Date changed in getUsageData, creating fresh data. Old:', data.date, 'New:', currentDate);
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
    // Always check for auto-reset first
    this.checkAndAutoReset();
    
    const usage = this.getUsageData();
    
    console.log('consumeCredit called:', {
      currentUsage: usage.used,
      limit: this.config.FREE_DAILY,
      canConsume: usage.used < this.config.FREE_DAILY,
      date: usage.date,
      currentDate: this.getCurrentDateKey()
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
   * Restore one credit (call this when generation fails after consuming)
   */
  public restoreCredit(): RateLimitResult {
    const usage = this.getUsageData();
    
    console.log('restoreCredit called:', {
      currentUsage: usage.used,
      canRestore: usage.used > 0
    });
    
    if (usage.used <= 0) {
      console.warn('Attempted to restore credit but usage is already 0');
      return this.checkLimit();
    }

    // Decrement usage
    usage.used -= 1;
    this.saveUsageData(usage);
    
    const newLimit = this.checkLimit();
    console.log('Credit restored successfully:', {
      newUsage: usage.used,
      remaining: newLimit.remaining
    });
    
    return newLimit;
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
    // Always check for auto-reset first
    this.checkAndAutoReset();
    
    const usage = this.getUsageData();
    const remaining = Math.max(0, this.config.FREE_DAILY - usage.used);
    const percentage = Math.round((usage.used / this.config.FREE_DAILY) * 100);

    console.log('Usage stats:', {
      used: usage.used,
      remaining,
      total: this.config.FREE_DAILY,
      percentage,
      date: usage.date,
      currentDate: this.getCurrentDateKey()
    });

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
    try {
      const stored = localStorage.getItem(this.config.SESSION_KEY);
      if (!stored) {
        console.log('No stored usage data in checkAndAutoReset, creating fresh data');
        this.resetUsage();
        return true;
      }

      const usage: UsageData = JSON.parse(stored);
      const currentDate = this.getCurrentDateKey();

      console.log('Auto-reset check:', {
        storedDate: usage.date,
        currentDate,
        needsReset: usage.date !== currentDate
      });

      if (usage.date !== currentDate) {
        console.log('Date changed, resetting usage. Old:', usage.date, 'New:', currentDate);
        this.resetUsage();
        return true; // Reset occurred
      }
      
      return false; // No reset needed
    } catch (error) {
      console.error('Error in checkAndAutoReset:', error);
      // On error, reset to be safe
      this.resetUsage();
      return true;
    }
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

  /**
   * Package-aware rate limiting
   */
  
  /**
   * Check package-specific rate limits
   */
  public async checkPackageLimit(
    userIdentifier: string,
    packageId: string,
    userType: 'anonymous' | 'free' | 'paid' | 'premium' = 'anonymous'
  ): Promise<PackageRateLimitResult> {
    try {
      // First check traditional rate limits
      const traditionalLimit = this.checkLimit();
      
      // Then check package-specific limits
      const packageLimitCheck = await PhotoPackagesService.checkPackageRateLimit(
        userIdentifier,
        packageId,
        userType
      );

      // Combine the results - both must pass
      const canProceed = traditionalLimit.canProceed && packageLimitCheck.allowed;
      const remaining = Math.min(traditionalLimit.remaining, packageLimitCheck.hourly_remaining);

      return {
        canProceed,
        remaining,
        total: traditionalLimit.total,
        resetsAt: traditionalLimit.resetsAt,
        isAtLimit: !canProceed,
        packageLimitCheck,
        userType
      };
    } catch (error) {
      console.error('Error checking package rate limit:', error);
      // Fallback to traditional rate limiting
      const fallback = this.checkLimit();
      return {
        ...fallback,
        userType: 'anonymous'
      };
    }
  }

  /**
   * Consume package usage and increment counters
   */
  public async consumePackageCredit(
    userIdentifier: string,
    packageId: string
  ): Promise<PackageRateLimitResult> {
    try {
      // Consume traditional credit first
      const traditionalResult = this.consumeCredit();
      
      // Increment package usage counter
      await PhotoPackagesService.incrementPackageUsage(userIdentifier, packageId, 1);
      
      return {
        ...traditionalResult,
        userType: 'anonymous' // TODO: Determine actual user type
      };
    } catch (error) {
      console.error('Error consuming package credit:', error);
      // Fallback to traditional consumption only
      const fallback = this.consumeCredit();
      return {
        ...fallback,
        userType: 'anonymous'
      };
    }
  }

  /**
   * Check if user can proceed with package generation
   */
  public async canProceedWithPackage(
    userIdentifier: string,
    packageId: string,
    userType: 'anonymous' | 'free' | 'paid' | 'premium' = 'anonymous'
  ): Promise<{
    canProceed: boolean;
    reason?: string;
    traditionalCheck: RateLimitResult;
    packageCheck?: RateLimitCheck;
    userType: string;
  }> {
    try {
      // Check both traditional and package limits
      const packageResult = await this.checkPackageLimit(userIdentifier, packageId, userType);
      
      if (!packageResult.canProceed) {
        let reason = 'Rate limit exceeded';
        
        if (!packageResult.packageLimitCheck?.allowed) {
          reason = packageResult.packageLimitCheck?.reason || 'Package rate limit exceeded';
        } else if (packageResult.isAtLimit) {
          reason = 'Daily generation limit reached';
        }
        
        return {
          canProceed: false,
          reason,
          traditionalCheck: {
            canProceed: packageResult.canProceed,
            remaining: packageResult.remaining,
            total: packageResult.total,
            resetsAt: packageResult.resetsAt,
            isAtLimit: packageResult.isAtLimit
          },
          packageCheck: packageResult.packageLimitCheck,
          userType: packageResult.userType || 'anonymous'
        };
      }
      
      return {
        canProceed: true,
        traditionalCheck: {
          canProceed: packageResult.canProceed,
          remaining: packageResult.remaining,
          total: packageResult.total,
          resetsAt: packageResult.resetsAt,
          isAtLimit: packageResult.isAtLimit
        },
        packageCheck: packageResult.packageLimitCheck,
        userType: packageResult.userType || 'anonymous'
      };
    } catch (error) {
      console.error('Error checking package generation eligibility:', error);
      // Fallback to traditional check only
      const traditionalCheck = this.checkLimit();
      return {
        canProceed: traditionalCheck.canProceed,
        reason: traditionalCheck.canProceed ? undefined : 'Daily generation limit reached',
        traditionalCheck,
        userType: 'anonymous'
      };
    }
  }

  /**
   * Get comprehensive rate limit status including package info
   */
  public async getPackageRateLimitStatus(
    userIdentifier: string,
    packageId?: string,
    userType: 'anonymous' | 'free' | 'paid' | 'premium' = 'anonymous'
  ): Promise<{
    traditional: RateLimitResult;
    package?: RateLimitCheck;
    canProceed: boolean;
    nextResetTime: Date;
    userType: string;
  }> {
    const traditional = this.checkLimit();
    let packageCheck: RateLimitCheck | undefined;
    let canProceed = traditional.canProceed;

    if (packageId) {
      try {
        packageCheck = await PhotoPackagesService.checkPackageRateLimit(
          userIdentifier,
          packageId,
          userType
        );
        canProceed = traditional.canProceed && packageCheck.allowed;
      } catch (error) {
        console.error('Error getting package rate limit status:', error);
        // Continue with traditional limits only
      }
    }

    return {
      traditional,
      package: packageCheck,
      canProceed,
      nextResetTime: this.getNextResetTime(),
      userType
    };
  }
}

// Export singleton instance
export const rateLimiter = new RateLimiter();

// Export types and utilities
export default rateLimiter;