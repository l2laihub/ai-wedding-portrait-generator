import React, { useState } from 'react';
import Icon from './Icon';
import { useAuth } from '../hooks/useAuth';

interface UpgradePromptProps {
  variant?: 'banner' | 'card' | 'compact';
  className?: string;
  onJoinWaitlist?: () => void;
  showClose?: boolean;
  onClose?: () => void;
  onShowPricing?: () => void;
}

const UpgradePrompt: React.FC<UpgradePromptProps> = ({
  variant = 'card',
  className = '',
  onJoinWaitlist,
  showClose = false,
  onClose,
  onShowPricing
}) => {
  const { user, isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  // const pricingTiers = stripeService.getPricingTiers();
  const pricingTiers = [
    {
      id: 'starter',
      name: 'Starter',
      description: 'Launch price - Perfect for trying out our AI portraits',
      credits: 10,
      price: 499,
      priceId: 'price_1S7S5jBMCTqpTWpd2zgC1IPm',
      popular: false,
      bestValue: false,
      features: ['10 AI portrait credits', 'All 12 wedding themes available']
    },
    {
      id: 'wedding',
      name: 'Wedding',
      description: 'Most popular choice for couples',
      credits: 25,
      price: 999,
      priceId: 'price_1S7S6gBMCTqpTWpdAPUdabYB',
      popular: true,
      bestValue: false,
      features: ['25 AI portrait credits', 'All 12 premium wedding themes']
    },
    {
      id: 'party',
      name: 'Party',
      description: 'Best value for large celebrations',
      credits: 75,
      price: 2499,
      priceId: 'price_1S7S87BMCTqpTWpdtNWuNtjy',
      popular: false,
      bestValue: true,
      features: ['75 AI portrait credits', 'All exclusive themes']
    }
  ];

  const handlePurchase = async (priceId: string, planId: string) => {
    if (!isAuthenticated || !user) {
      // Show login modal or redirect to login
      alert('Please sign in to purchase credits');
      return;
    }

    setIsLoading(true);
    setSelectedPlan(planId);

    try {
      // Create checkout session using Supabase Edge Function
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const apiUrl = `${supabaseUrl}/functions/v1/stripe-checkout`;
        
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          priceId,
          userId: user.id
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Purchase error:', error);
      alert(`Failed to start checkout: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
      setSelectedPlan(null);
    }
  };
  if (variant === 'banner') {
    return (
      <div className={`bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-lg p-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Icon 
              path="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" 
              className="w-5 h-5 text-yellow-300" 
            />
            <div>
              <span className="font-semibold">Get More Credits</span>
              <span className="ml-2 text-blue-100">Continue creating beautiful portraits</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <button
                onClick={onShowPricing}
                className="bg-white/20 hover:bg-white/30 backdrop-blur-sm px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Buy Credits
              </button>
            ) : (
              <button
                onClick={onJoinWaitlist}
                className="bg-white/20 hover:bg-white/30 backdrop-blur-sm px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Sign In to Buy
              </button>
            )}
            {showClose && (
              <button
                onClick={onClose}
                className="text-white/70 hover:text-white transition-colors p-1"
                aria-label="Close"
              >
                <Icon path="M6 18L18 6M6 6l12 12" className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={`inline-flex items-center gap-2 bg-gradient-to-r from-blue-50 to-teal-50 dark:from-blue-900/20 dark:to-teal-900/20 text-blue-800 dark:text-blue-200 px-3 py-2 rounded-lg text-sm ${className}`}>
        <Icon 
          path="M13 10V3L4 14h7v7l9-11h-7z" 
          className="w-4 h-4 text-blue-600 dark:text-blue-400" 
        />
        <span>🚀 Launch weekend special - 50% OFF!</span>
        {isAuthenticated ? (
          <button
            onClick={onShowPricing}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 font-medium ml-1 transition-colors"
          >
            Buy Now →
          </button>
        ) : (
          <button
            onClick={onJoinWaitlist}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 font-medium ml-1 transition-colors"
          >
            Sign In →
          </button>
        )}
      </div>
    );
  }

  // Card variant (default)
  return (
    <div className={`bg-gradient-to-br from-blue-50 via-white to-teal-50 dark:from-blue-900/20 dark:via-gray-800 dark:to-teal-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6 ${className}`}>
      {showClose && (
        <div className="flex justify-end mb-2">
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Close"
          >
            <Icon path="M6 18L18 6M6 6l12 12" className="w-4 h-4" />
          </button>
        </div>
      )}
      
      <div className="text-center">
        {/* Premium Icon */}
        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
          <Icon 
            path="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" 
            className="w-8 h-8 text-white" 
          />
        </div>

        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Get More Credits
        </h3>
        
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Choose a plan to continue creating beautiful wedding portraits with all 12 themes.
        </p>

        {/* Feature List */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-3 text-left">
            <div className="w-8 h-8 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center flex-shrink-0">
              <Icon path="M5 13l4 4L19 7" className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            <span className="text-gray-700 dark:text-gray-300">
              <strong>All 12 themes</strong> - Access to every wedding style
            </span>
          </div>
          
          <div className="flex items-center gap-3 text-left">
            <div className="w-8 h-8 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center flex-shrink-0">
              <Icon path="M5 13l4 4L19 7" className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            <span className="text-gray-700 dark:text-gray-300">
              <strong>High-quality downloads</strong> - Perfect for printing and sharing
            </span>
          </div>
          
          <div className="flex items-center gap-3 text-left">
            <div className="w-8 h-8 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center flex-shrink-0">
              <Icon path="M5 13l4 4L19 7" className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            <span className="text-gray-700 dark:text-gray-300">
              <strong>No daily limits</strong> - Generate as many portraits as you need
            </span>
          </div>
          
          <div className="flex items-center gap-3 text-left">
            <div className="w-8 h-8 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center flex-shrink-0">
              <Icon path="M5 13l4 4L19 7" className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            <span className="text-gray-700 dark:text-gray-300">
              <strong>Instant processing</strong> - Skip any queues, get results faster
            </span>
          </div>
        </div>

        {/* Pricing Options */}
        <div className="bg-white dark:bg-gray-700 rounded-lg p-4 mb-6 border border-gray-200 dark:border-gray-600">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-2 text-center">🚀 Launch Weekend Special</div>
          <div className="text-xs text-center text-orange-600 dark:text-orange-400 font-medium mb-4">50% OFF - This Weekend Only!</div>
          <div className="space-y-3">
            {/* Pricing Cards with Purchase Buttons */}
            {pricingTiers.map((tier) => (
              <div 
                key={tier.id}
                className={`
                  relative bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border-2 transition-all
                  ${tier.popular 
                    ? 'border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20' 
                    : tier.bestValue 
                    ? 'border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/20'
                    : 'border-gray-200 dark:border-gray-600'
                  }
                `}
              >
                {tier.popular && (
                  <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                    <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full font-medium">
                      Most Popular
                    </span>
                  </div>
                )}
                {tier.bestValue && (
                  <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                    <span className="bg-green-600 text-white text-xs px-2 py-1 rounded-full font-medium">
                      Best Value
                    </span>
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white">{tier.name}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{tier.credits} credits</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      ${(tier.price / 100).toFixed(2)}
                    </p>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    ${((tier.price / 100) / tier.credits).toFixed(2)} per credit
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Call to Action Button */}
        <button
          onClick={onShowPricing}
          className="w-full bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 mb-6"
        >
          View Pricing & Choose Your Plan
        </button>

        {/* Alternative: Join Waitlist */}
        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Want to wait for more features? 
          </p>
          <button
            onClick={onJoinWaitlist}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 font-medium transition-colors"
          >
            🎁 Join Waitlist & Get 10 Bonus Credits
          </button>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 text-center">
          {isAuthenticated 
            ? "Secure payment powered by Stripe. Credits are added instantly!" 
            : "Please sign in to purchase credits"
          }
        </p>
      </div>
    </div>
  );
};

export default UpgradePrompt;