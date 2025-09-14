import React, { useState, useEffect } from 'react'
import { stripeService, PricingTier, CouponValidation } from '../services/stripeService'
import { authService } from '../services/authService'
import { useAuth } from '../hooks/useAuth'
import { LoginModal } from './LoginModal'

interface PricingPageProps {
  onClose?: () => void
}

interface CouponState {
  code: string
  validation: CouponValidation | null
  loading: boolean
}

export const PricingPage: React.FC<PricingPageProps> = ({ onClose }) => {
  const { user } = useAuth()
  const [loading, setLoading] = useState<string | null>(null)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [coupon, setCoupon] = useState<CouponState>({
    code: '',
    validation: null,
    loading: false
  })
  const [stripeAvailable, setStripeAvailable] = useState(true)

  const tiers = stripeService.getPricingTiers()

  // Check Stripe availability on component mount
  useEffect(() => {
    const checkStripeAvailability = async () => {
      const available = await stripeService.isAvailable()
      setStripeAvailable(available)
    }
    checkStripeAvailability()
  }, [])

  const handlePurchase = async (tier: PricingTier) => {
    if (!user) {
      setShowLoginModal(true)
      return
    }

    if (!stripeAvailable) {
      alert('Payment system is currently unavailable. Please try again later.')
      return
    }

    setLoading(tier.id)

    try {
      const result = await stripeService.createCheckoutSession(
        tier.priceId,
        coupon.validation?.valid ? coupon.code : undefined
      )

      if (!result.success) {
        throw new Error(result.error || 'Payment failed')
      }

      // Stripe will handle the redirect to checkout
    } catch (error) {
      console.error('Purchase error:', error)
      alert(error instanceof Error ? error.message : 'Purchase failed. Please try again.')
    } finally {
      setLoading(null)
    }
  }

  const handleCouponChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const code = e.target.value
    setCoupon(prev => ({ ...prev, code, validation: null }))
  }

  const validateCoupon = async () => {
    if (!coupon.code.trim()) {
      setCoupon(prev => ({ ...prev, validation: null }))
      return
    }

    setCoupon(prev => ({ ...prev, loading: true }))

    try {
      const validation = await stripeService.validateCoupon(coupon.code.trim())
      setCoupon(prev => ({ ...prev, validation, loading: false }))
    } catch (error) {
      console.error('Coupon validation error:', error)
      setCoupon(prev => ({
        ...prev,
        validation: { valid: false, error: 'Failed to validate coupon' },
        loading: false
      }))
    }
  }

  const getDiscountedPrice = (originalPrice: number): number => {
    if (!coupon.validation?.valid || !coupon.validation.discountPercent) {
      return originalPrice
    }
    return stripeService.calculateDiscountedPrice(originalPrice, coupon.validation.discountPercent)
  }

  const formatPrice = (price: number): string => {
    return stripeService.formatPrice(price)
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold">Choose Your Plan</h1>
            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">
            Transform Your Photos into Beautiful Wedding Portraits
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Choose the perfect plan for your wedding planning needs. Generate stunning AI portraits
            with our advanced Gemini 2.5 Flash technology.
          </p>
        </div>

        {/* Coupon Code Section */}
        <div className="max-w-md mx-auto mb-8 bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold mb-3">Have a coupon code?</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={coupon.code}
              onChange={handleCouponChange}
              onBlur={validateCoupon}
              placeholder="Enter code (e.g., EARLYBIRD)"
              className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={validateCoupon}
              disabled={coupon.loading || !coupon.code.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
            >
              {coupon.loading ? 'Checking...' : 'Apply'}
            </button>
          </div>
          
          {coupon.validation && (
            <div className={`mt-2 text-sm ${coupon.validation.valid ? 'text-green-400' : 'text-red-400'}`}>
              {coupon.validation.valid ? (
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  {coupon.validation.discountPercent}% discount applied!
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {coupon.validation.error}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Pricing Tiers */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {tiers.map((tier) => {
            const originalPrice = tier.price
            const discountedPrice = getDiscountedPrice(originalPrice)
            const hasDiscount = discountedPrice < originalPrice

            return (
              <div
                key={tier.id}
                className={`relative bg-gray-800 rounded-2xl p-8 border-2 transition-all duration-200 hover:scale-105 ${
                  tier.popular
                    ? 'border-blue-500 ring-2 ring-blue-500 ring-opacity-50'
                    : tier.bestValue
                    ? 'border-green-500 ring-2 ring-green-500 ring-opacity-50'
                    : 'border-gray-600 hover:border-gray-500'
                }`}
              >
                {/* Badge */}
                {tier.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                      Most Popular
                    </span>
                  </div>
                )}
                {tier.bestValue && !tier.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-green-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                      Best Value
                    </span>
                  </div>
                )}

                {/* Header */}
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold mb-2">{tier.name}</h3>
                  <p className="text-gray-300 mb-4">{tier.description}</p>
                  
                  {/* Price */}
                  <div className="mb-4">
                    {hasDiscount && (
                      <div className="text-gray-400 line-through text-lg mb-1">
                        {formatPrice(originalPrice)}
                      </div>
                    )}
                    <div className={`text-4xl font-bold ${hasDiscount ? 'text-green-400' : 'text-white'}`}>
                      {formatPrice(discountedPrice)}
                    </div>
                    {hasDiscount && (
                      <div className="text-green-400 text-sm font-medium mt-1">
                        Save {formatPrice(originalPrice - discountedPrice)}!
                      </div>
                    )}
                  </div>

                  <div className="text-gray-300">
                    {tier.credits} AI Portrait Credits
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-8">
                  {tier.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <svg
                        className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <button
                  onClick={() => handlePurchase(tier)}
                  disabled={loading === tier.id || !stripeAvailable}
                  className={`w-full py-3 px-6 rounded-lg font-semibold text-lg transition-all duration-200 ${
                    tier.popular
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : tier.bestValue
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-gray-700 hover:bg-gray-600 text-white'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {loading === tier.id ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                        <circle
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          className="opacity-25"
                        />
                        <path
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          className="opacity-75"
                        />
                      </svg>
                      Processing...
                    </span>
                  ) : !stripeAvailable ? (
                    'Payment Unavailable'
                  ) : (
                    `Get ${tier.name}`
                  )}
                </button>
              </div>
            )
          })}
        </div>

        {/* Security & Guarantee */}
        <div className="mt-12 text-center">
          <div className="max-w-4xl mx-auto bg-gray-800 rounded-lg p-8 border border-gray-700">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="flex items-center justify-center gap-3">
                <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <div>
                  <div className="font-semibold">Secure Payment</div>
                  <div className="text-sm text-gray-400">SSL encrypted checkout</div>
                </div>
              </div>
              
              <div className="flex items-center justify-center gap-3">
                <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                <div>
                  <div className="font-semibold">Money Back Guarantee</div>
                  <div className="text-sm text-gray-400">30-day refund policy</div>
                </div>
              </div>
              
              <div className="flex items-center justify-center gap-3">
                <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <div>
                  <div className="font-semibold">Instant Access</div>
                  <div className="text-sm text-gray-400">Credits available immediately</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-16">
          <h3 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h3>
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h4 className="font-semibold mb-2">How do credits work?</h4>
              <p className="text-gray-300">
                Each credit allows you to generate one AI portrait. You can choose from multiple style themes
                and get high-resolution downloads. Credits never expire once purchased.
              </p>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h4 className="font-semibold mb-2">What payment methods do you accept?</h4>
              <p className="text-gray-300">
                We accept all major credit cards, Apple Pay, Google Pay, and other payment methods
                supported by Stripe. All transactions are secure and encrypted.
              </p>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h4 className="font-semibold mb-2">Can I get a refund?</h4>
              <p className="text-gray-300">
                Yes! We offer a 30-day money-back guarantee. If you're not satisfied with your AI portraits,
                contact our support team for a full refund.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Login Modal */}
      {showLoginModal && (
        <LoginModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          title="Sign in to continue"
          message="Please create an account or sign in to purchase credits and generate your AI wedding portraits."
        />
      )}
    </div>
  )
}