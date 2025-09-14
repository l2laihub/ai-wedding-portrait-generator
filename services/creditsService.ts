/**
 * Credits Service
 * 
 * Manages user credit balances, consumption, and history
 * Handles both free daily credits and paid credits
 */

import { supabase } from './supabaseClient';
import { authService } from './authService';

export interface UserCredits {
  user_id: string;
  free_credits_used_today: number;
  paid_credits: number;
  bonus_credits: number;
  last_free_reset: string;
  total_available: number; // computed field
}

export interface CreditBalance {
  freeCreditsUsed: number;
  freeCreditsRemaining: number;
  paidCredits: number;
  bonusCredits: number;
  totalAvailable: number;
  canUseCredits: boolean;
}

export interface CreditTransaction {
  id: string;
  user_id: string;
  type: 'free_daily' | 'purchase' | 'bonus' | 'usage' | 'refund';
  amount: number;
  balance_after: number;
  description?: string;
  stripe_payment_id?: string;
  created_at: string;
}

export interface ConsumeResult {
  success: boolean;
  newBalance: CreditBalance;
  error?: string;
}

const FREE_DAILY_LIMIT = 5;
const DISPLAY_DAILY_LIMIT = 3; // What we show to users

class CreditsService {
  /**
   * Get current user's credit balance
   */
  async getBalance(): Promise<CreditBalance> {
    try {
      const user = authService.getCurrentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get user credits with automatic daily reset
      const { data, error } = await supabase.rpc(
        'get_user_credits_with_reset',
        { p_user_id: user.id }
      );

      if (error) {
        console.error('Error getting credit balance:', error);
        throw new Error('Failed to get credit balance');
      }

      const credits = data || {
        free_credits_used_today: 0,
        paid_credits: 0,
        bonus_credits: 0,
        last_free_reset: new Date().toISOString().split('T')[0]
      };

      const freeCreditsRemaining = Math.max(0, FREE_DAILY_LIMIT - credits.free_credits_used_today);
      const totalAvailable = freeCreditsRemaining + credits.paid_credits + credits.bonus_credits;

      return {
        freeCreditsUsed: credits.free_credits_used_today,
        freeCreditsRemaining,
        paidCredits: credits.paid_credits,
        bonusCredits: credits.bonus_credits,
        totalAvailable,
        canUseCredits: totalAvailable > 0
      };
    } catch (error) {
      console.error('Failed to get credit balance:', error);
      return {
        freeCreditsUsed: 0,
        freeCreditsRemaining: 0,
        paidCredits: 0,
        bonusCredits: 0,
        totalAvailable: 0,
        canUseCredits: false
      };
    }
  }

  /**
   * Consume one credit for portrait generation
   */
  async consumeCredit(description: string = 'Portrait generation'): Promise<ConsumeResult> {
    try {
      const user = authService.getCurrentUser();
      if (!user) {
        return {
          success: false,
          newBalance: await this.getBalance(),
          error: 'User not authenticated'
        };
      }

      // Check balance before consumption
      const currentBalance = await this.getBalance();
      if (!currentBalance.canUseCredits) {
        return {
          success: false,
          newBalance: currentBalance,
          error: 'Insufficient credits'
        };
      }

      // Consume credit atomically
      const { data, error } = await supabase.rpc(
        'consume_credit_atomic',
        { 
          p_user_id: user.id,
          p_description: description
        }
      );

      if (error) {
        console.error('Error consuming credit:', error);
        return {
          success: false,
          newBalance: currentBalance,
          error: 'Failed to consume credit'
        };
      }

      // Get updated balance
      const newBalance = await this.getBalance();
      
      // Emit custom event for counter synchronization
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('counterUpdate', {
          detail: { credits: newBalance.balance }
        }));
      }
      
      return {
        success: true,
        newBalance
      };

    } catch (error) {
      console.error('Failed to consume credit:', error);
      const currentBalance = await this.getBalance();
      return {
        success: false,
        newBalance: currentBalance,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Add paid credits (called by webhook after successful payment)
   */
  async addPaidCredits(
    credits: number,
    stripePaymentId: string,
    description: string = 'Credit purchase'
  ): Promise<boolean> {
    try {
      const user = authService.getCurrentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase.rpc(
        'add_paid_credits',
        {
          p_user_id: user.id,
          p_credits: credits,
          p_stripe_payment_id: stripePaymentId,
          p_description: description
        }
      );

      if (error) {
        console.error('Error adding paid credits:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to add paid credits:', error);
      return false;
    }
  }

  /**
   * Add bonus credits (for referrals, promotions, etc.)
   */
  async addBonusCredits(
    credits: number,
    description: string = 'Bonus credits'
  ): Promise<boolean> {
    try {
      const user = authService.getCurrentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase.rpc(
        'add_bonus_credits',
        {
          p_user_id: user.id,
          p_credits: credits,
          p_description: description
        }
      );

      if (error) {
        console.error('Error adding bonus credits:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to add bonus credits:', error);
      return false;
    }
  }

  /**
   * Get credit transaction history
   */
  async getTransactionHistory(limit: number = 50): Promise<CreditTransaction[]> {
    try {
      const user = authService.getCurrentUser();
      if (!user) {
        return [];
      }

      const { data, error } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error getting transaction history:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Failed to get transaction history:', error);
      return [];
    }
  }

  /**
   * Reset daily credits (for testing/admin purposes)
   */
  async resetDailyCredits(): Promise<boolean> {
    try {
      const user = authService.getCurrentUser();
      if (!user) {
        return false;
      }

      const { error } = await supabase.rpc(
        'reset_daily_credits_for_user',
        { p_user_id: user.id }
      );

      return !error;
    } catch (error) {
      console.error('Failed to reset daily credits:', error);
      return false;
    }
  }

  /**
   * Get credits needed for a specific number of portraits
   */
  getCreditsNeeded(portraitCount: number): number {
    return portraitCount; // 1 credit = 1 portrait
  }

  /**
   * Format credit amount for display
   */
  formatCredits(amount: number): string {
    return amount === 1 ? '1 credit' : `${amount} credits`;
  }

  /**
   * Get next free credit reset time
   */
  getNextResetTime(): Date {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0); // Midnight
    return tomorrow;
  }

  /**
   * Get time until next reset in human readable format
   */
  getTimeUntilReset(): string {
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
}

// Export singleton instance
export const creditsService = new CreditsService();
export default creditsService;