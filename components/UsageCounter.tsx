import React, { useState, useEffect } from 'react';
import Icon from './Icon';
import { rateLimiter, RateLimitResult } from '../utils/rateLimiter';
import { creditsService, CreditBalance } from '../services/creditsService';
import { useAuth } from '../hooks/useAuth';

interface UsageCounterProps {
  className?: string;
  variant?: 'compact' | 'detailed';
  showTimeUntilReset?: boolean;
}

const UsageCounter: React.FC<UsageCounterProps> = ({
  className = '',
  variant = 'compact',
  showTimeUntilReset = false
}) => {
  const { user } = useAuth();
  const [limitInfo, setLimitInfo] = useState<RateLimitResult | null>(null);
  const [creditBalance, setCreditBalance] = useState<CreditBalance | null>(null);
  const [timeUntilReset, setTimeUntilReset] = useState<string>('');

  const updateUsageInfo = async () => {
    if (user) {
      // For authenticated users, get credit balance
      const balance = await creditsService.getBalance();
      setCreditBalance(balance);
      setLimitInfo(null);
      
      if (showTimeUntilReset) {
        setTimeUntilReset(creditsService.getTimeUntilReset());
      }
    } else {
      // For anonymous users, use rate limiter
      const info = rateLimiter.checkLimit();
      setLimitInfo(info);
      setCreditBalance(null);
      
      if (showTimeUntilReset) {
        setTimeUntilReset(rateLimiter.getTimeUntilReset());
      }
    }
  };

  useEffect(() => {
    // Initial load
    updateUsageInfo();

    // Update every minute to keep time until reset accurate
    const interval = setInterval(updateUsageInfo, 60000);

    // Listen for storage changes (in case user opens multiple tabs) - only for anonymous users
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'wedai_usage' && !user) {
        updateUsageInfo();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [showTimeUntilReset, user]);

  if (!limitInfo && !creditBalance) {
    return null;
  }

  // Determine display values based on user type
  const isAuthenticated = !!user;
  const remaining = isAuthenticated ? creditBalance?.totalAvailable || 0 : limitInfo?.remaining || 0;
  const total = isAuthenticated ? creditBalance?.totalAvailable || 0 : limitInfo?.total || 0;
  const used = isAuthenticated ? 
    (creditBalance?.freeCreditsUsed || 0) : 
    (limitInfo?.total || 0) - (limitInfo?.remaining || 0);

  const getStatusColor = () => {
    if (remaining === 0) return 'text-red-600 dark:text-red-400';
    if (remaining <= 2) return 'text-amber-600 dark:text-amber-400';
    return 'text-green-600 dark:text-green-400';
  };

  const getProgressBarColor = () => {
    if (remaining === 0) return 'bg-red-500';
    if (remaining <= 2) return 'bg-amber-500';
    return 'bg-green-500';
  };

  const progressPercentage = isAuthenticated ? 
    (total > 0 ? Math.round(((total - remaining) / total) * 100) : 0) :
    Math.round(((limitInfo?.total || 0) - (limitInfo?.remaining || 0)) / (limitInfo?.total || 1) * 100);

  if (variant === 'compact') {
    return (
      <div className={`inline-flex items-center gap-2 text-sm ${className}`}>
        <Icon 
          path="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M9 1L5 3l4 2 4-2-4-2z" 
          className={`w-4 h-4 ${getStatusColor()}`} 
        />
        <span className={`font-medium ${getStatusColor()}`}>
          {isAuthenticated ? (
            creditBalance?.totalAvailable ? (
              creditBalance.freeCreditsRemaining > 0 ? 
                `${creditBalance.freeCreditsRemaining}/3 free + ${creditBalance.paidCredits + creditBalance.bonusCredits} credits` :
                `${creditBalance.totalAvailable} credits available`
            ) : (
              '0 credits remaining'
            )
          ) : (
            `${limitInfo?.remaining}/${limitInfo?.total} free portraits today`
          )}
        </span>
        {showTimeUntilReset && remaining === 0 && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            (resets in {timeUntilReset})
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon 
            path="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M9 1L5 3l4 2 4-2-4-2z" 
            className={`w-5 h-5 ${getStatusColor()}`} 
          />
          <h3 className="font-medium text-gray-900 dark:text-white">
            {isAuthenticated ? 'Credit Balance' : 'Daily Usage'}
          </h3>
        </div>
        <span className={`text-lg font-bold ${getStatusColor()}`}>
          {isAuthenticated ? 
            `${creditBalance?.totalAvailable || 0} credits` :
            `${limitInfo?.remaining}/${limitInfo?.total}`
          }
        </span>
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
          <span>Portraits used</span>
          <span>{progressPercentage}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor()}`}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Status Message */}
      <div className="text-sm text-gray-600 dark:text-gray-400">
        {isAuthenticated ? (
          creditBalance?.totalAvailable && creditBalance.totalAvailable > 0 ? (
            <div className="space-y-1">
              {creditBalance.freeCreditsRemaining > 0 && (
                <div>Free today: <strong className={getStatusColor()}>{creditBalance.freeCreditsRemaining}/3</strong></div>
              )}
              {creditBalance.paidCredits > 0 && (
                <div>Purchased: <strong className="text-blue-600 dark:text-blue-400">{creditBalance.paidCredits}</strong></div>
              )}
              {creditBalance.bonusCredits > 0 && (
                <div>Bonus: <strong className="text-green-600 dark:text-green-400">{creditBalance.bonusCredits}</strong></div>
              )}
            </div>
          ) : (
            <span>
              No credits remaining. Purchase credits to generate more portraits.
            </span>
          )
        ) : (
          limitInfo?.remaining && limitInfo.remaining > 0 ? (
            <span>
              You have <strong className={getStatusColor()}>{limitInfo.remaining}</strong> free portrait
              {limitInfo.remaining !== 1 ? 's' : ''} remaining today.
            </span>
          ) : (
            <span>
              You've reached your daily limit. 
              {showTimeUntilReset && (
                <span className="ml-1">
                  Resets in <strong>{timeUntilReset}</strong>.
                </span>
              )}
            </span>
          )
        )}
      </div>

      {/* Reset Info */}
      {showTimeUntilReset && !isAuthenticated && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <Icon 
              path="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
              className="w-3 h-3" 
            />
            <span>Limits reset daily at midnight PT</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsageCounter;