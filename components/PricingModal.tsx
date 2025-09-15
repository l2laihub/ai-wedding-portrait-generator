import React, { useState } from 'react';
import Icon from './Icon';
import { AuthUser } from '../services/authService';

interface PricingTier {
  id: string;
  name: string;
  description: string;
  credits: number;
  price: number;
  priceId: string;
  popular: boolean;
  bestValue: boolean;
  features: string[];
}

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPurchase: (priceId: string, planId: string) => Promise<void>;
  user: AuthUser | null;
  isAuthenticated: boolean;
}

const PricingModal: React.FC<PricingModalProps> = ({
  isOpen,
  onClose,
  onPurchase,
  user,
  isAuthenticated
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const pricingTiers: PricingTier[] = [
    {
      id: 'starter',
      name: 'Starter',
      description: 'Perfect for trying out the service',
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

  const handlePurchaseClick = async (tier: PricingTier) => {
    if (!isAuthenticated || !user) {
      alert('Please sign in to purchase credits');
      return;
    }

    setIsLoading(true);
    setSelectedPlan(tier.id);
    
    try {
      await onPurchase(tier.priceId, tier.id);
    } catch (error) {
      console.error('Purchase failed:', error);
    } finally {
      setIsLoading(false);
      setSelectedPlan(null);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto animate-in fade-in duration-200"
      onClick={handleBackdropClick}
      style={{
        paddingTop: 'max(1rem, env(safe-area-inset-top))',
        paddingBottom: 'max(1rem, env(safe-area-inset-bottom))'
      }}
    >
      <div className="min-h-full flex items-center justify-center p-4">
        <div 
          className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
          style={{ maxHeight: 'calc(100vh - 2rem)' }}
        >
          {/* Header */}
          <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Choose Your Wedding Pack
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Select the perfect credit package for your needs
              </p>
            </div>
            <button
              onClick={onClose}
              className="flex items-center justify-center w-10 h-10 text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 border-2 border-gray-300 dark:border-gray-500 rounded-full transition-all duration-200 shadow-sm hover:shadow-md"
              aria-label="Close modal"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto flex-1">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {pricingTiers.map((tier) => (
                <div
                  key={tier.id}
                  className={`relative bg-white dark:bg-gray-700 rounded-xl border-2 p-6 transition-all duration-200 ${
                    tier.popular
                      ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-lg transform scale-105'
                      : tier.bestValue
                      ? 'border-green-500 ring-2 ring-green-500/20 shadow-lg'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  {/* Badge */}
                  {tier.popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                        Most Popular
                      </span>
                    </div>
                  )}
                  {tier.bestValue && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                        Best Value
                      </span>
                    </div>
                  )}

                  <div className="text-center mb-6">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                      {tier.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      {tier.description}
                    </p>
                    <div className="mb-4">
                      <span className="text-3xl font-bold text-gray-900 dark:text-white">
                        ${(tier.price / 100).toFixed(2)}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-400 ml-1">
                        / {tier.credits} credits
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      ${((tier.price / 100) / tier.credits).toFixed(2)} per credit
                    </div>
                  </div>

                  {/* Features */}
                  <ul className="space-y-3 mb-6">
                    {tier.features.map((feature, index) => (
                      <li key={index} className="flex items-center text-sm">
                        <Icon 
                          path="M5 13l4 4L19 7" 
                          className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" 
                        />
                        <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Purchase Button */}
                  <button
                    onClick={() => handlePurchaseClick(tier)}
                    disabled={isLoading}
                    className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                      tier.popular
                        ? 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white'
                        : tier.bestValue
                        ? 'bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white'
                        : 'bg-gray-900 hover:bg-gray-800 disabled:bg-gray-400 text-white dark:bg-gray-600 dark:hover:bg-gray-500'
                    }`}
                  >
                    {isLoading && selectedPlan === tier.id ? (
                      <span className="flex items-center justify-center gap-2">
                        <Icon path="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" className="w-4 h-4 animate-spin" />
                        Processing...
                      </span>
                    ) : (
                      `Purchase ${tier.name}`
                    )}
                  </button>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="mt-8 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                Secure payment powered by Stripe • 30-day money-back guarantee
              </p>
              <div className="flex justify-center items-center gap-4 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <Icon path="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" className="w-4 h-4" />
                  Secure Payment
                </span>
                <span className="flex items-center gap-1">
                  <Icon path="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" className="w-4 h-4" />
                  SSL Protected
                </span>
                <span className="flex items-center gap-1">
                  <Icon path="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" className="w-4 h-4" />
                  No Subscription
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingModal;