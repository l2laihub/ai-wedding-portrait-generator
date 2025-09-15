/**
 * Stripe Service
 * 
 * Handles Stripe payment operations, customer management, and checkout sessions
 * Security-focused implementation with proper error handling
 */

import { loadStripe, Stripe as StripeJS } from '@stripe/stripe-js';
import { authService } from './authService';

// Client-side Stripe instance
let stripePromise: Promise<StripeJS | null> | null = null;

const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');
  }
  return stripePromise;
};

// Types for payment operations
export interface PricingTier {
  id: string;
  name: string;
  description: string;
  credits: number;
  price: number; // in cents
  priceId: string; // Stripe price ID
  popular?: boolean;
  bestValue?: boolean;
  features: string[];
}

export interface CouponValidation {
  valid: boolean;
  discountPercent?: number;
  error?: string;
}

export interface CheckoutResult {
  success: boolean;
  sessionId?: string;
  error?: string;
}

// Pre-defined payment plans matching implementation plan
export const PRICING_TIERS: PricingTier[] = [
  {
    id: 'starter',
    name: 'Starter',
    description: 'Launch price - Perfect for trying out our AI portraits',
    credits: 10,
    price: 499, // $4.99
    priceId: 'price_1QSxxxxxxxxxxx', // Replace with actual Stripe price ID
    features: [
      '10 AI portrait credits',
      'All 12 wedding themes available',
      'High-resolution downloads',
      'Commercial usage rights'
    ]
  },
  {
    id: 'wedding',
    name: 'Wedding',
    description: 'Most popular choice for couples',
    credits: 25,
    price: 999, // $9.99
    priceId: 'price_1QSyxxxxxxxxxx', // Replace with actual Stripe price ID
    popular: true,
    features: [
      '25 AI portrait credits',
      'All 12 premium wedding themes',
      'High-resolution downloads',
      'Priority processing',
      'Commercial usage rights',
      'Email support'
    ]
  },
  {
    id: 'party',
    name: 'Party',
    description: 'Best value for large celebrations',
    credits: 75,
    price: 2499, // $24.99
    priceId: 'price_1QSzxxxxxxxxxx', // Replace with actual Stripe price ID
    bestValue: true,
    features: [
      '75 AI portrait credits',
      'All exclusive themes',
      'Ultra high-resolution downloads',
      'Priority processing',
      'Commercial usage rights',
      'Dedicated support',
      'Bulk generation tools'
    ]
  }
];

/**
 * Stripe Service Implementation
 */
class StripeService {
  /**
   * Check if Stripe is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const stripe = await getStripe();
      return !!stripe && !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    } catch (error) {
      console.error('Stripe availability check failed:', error);
      return false;
    }
  }

  /**
   * Get pricing tiers
   */
  getPricingTiers(): PricingTier[] {
    return PRICING_TIERS;
  }

  /**
   * Get pricing tier by ID
   */
  getPricingTier(tierId: string): PricingTier | null {
    return PRICING_TIERS.find(tier => tier.id === tierId) || null;
  }

  /**
   * Format price for display
   */
  formatPrice(cents: number): string {
    return `$${(cents / 100).toFixed(2)}`;
  }

  /**
   * Calculate discounted price
   */
  calculateDiscountedPrice(originalPrice: number, discountPercent: number): number {
    return Math.round(originalPrice * (1 - discountPercent / 100));
  }

  /**
   * Validate coupon code
   */
  async validateCoupon(couponCode: string): Promise<CouponValidation> {
    try {
      // For now, support a hardcoded EARLYBIRD coupon (50% off)
      // In production, this should call your backend to validate with Stripe
      if (couponCode.toUpperCase() === 'EARLYBIRD') {
        return {
          valid: true,
          discountPercent: 50
        };
      }

      return {
        valid: false,
        error: 'Invalid coupon code'
      };
    } catch (error) {
      console.error('Coupon validation error:', error);
      return {
        valid: false,
        error: 'Failed to validate coupon'
      };
    }
  }

  /**
   * Create checkout session
   */
  async createCheckoutSession(
    priceId: string,
    couponCode?: string
  ): Promise<CheckoutResult> {
    try {
      const user = authService.getCurrentUser();
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      const stripe = await getStripe();
      if (!stripe) {
        return {
          success: false,
          error: 'Stripe not available'
        };
      }

      // Call our API to create checkout session
      const response = await fetch('/api/checkout/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          priceId,
          userId: user.id,
          couponCode
        })
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Failed to create checkout session'
        };
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      }

      return {
        success: true,
        sessionId: data.sessionId
      };

    } catch (error) {
      console.error('Checkout session creation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}

// Export singleton instance
export const stripeService = new StripeService();

// Export for backward compatibility and direct access
export { getStripe };
export default stripeService;