# Production Testing Guide
## AI Wedding Portrait Generator - Comprehensive Testing Procedures

This guide provides step-by-step testing procedures to verify all functionality works correctly in production.

## 🧪 Pre-Production Testing

### Environment Validation

**Test Stripe Configuration**
```bash
# 1. Test webhook endpoint health
curl -X POST https://your-domain.supabase.co/functions/v1/stripe-webhook \
  -H "Content-Type: application/json" \
  -d '{"test": "health_check"}'

# Expected: 400 status (missing signature) but endpoint responds

# 2. Verify edge function secrets
npx supabase secrets list

# Expected: STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET are set
```

**Test Database Functions**
```bash
# Run credit calculation test
node scripts/test-credit-calculation.js

# Run payment flow test  
node scripts/test-payment-flow.js

# Expected: All tests pass without errors
```

## 💳 Payment System Testing

### Test Card Numbers (Use in Stripe Test Mode First)

```
Success: 4242424242424242
Declined: 4000000000000002
Requires Authentication: 4000002500003155
Insufficient Funds: 4000000000009995
Expired Card: 4000000000000069
Incorrect CVC: 4000000000000127
Processing Error: 4000000000000119
```

### Test Procedure: Complete Payment Flow

**Test 1: Successful Payment - Starter Pack**
1. Navigate to pricing page
2. Click "Buy Starter Pack ($4.99)"
3. Use test card: `4242424242424242`
4. Complete payment
5. Verify:
   - Redirected to success page
   - Credits added to account (10 credits)
   - Webhook event processed
   - Payment logged in admin dashboard

**Test 2: Successful Payment - Wedding Pack**
1. Click "Buy Wedding Pack ($9.99)"  
2. Use test card: `4242424242424242`
3. Complete payment
4. Verify:
   - 25 credits added to account
   - Webhook processed correctly
   - Payment appears in Stripe Dashboard

**Test 3: Declined Payment**
1. Click "Buy Party Pack ($24.99)"
2. Use declined card: `4000000000000002`
3. Verify:
   - Payment fails gracefully
   - User shown appropriate error message
   - No credits added to account
   - Failed payment logged

**Test 4: 3D Secure Payment**
1. Use card requiring authentication: `4000002500003155`
2. Complete 3D Secure challenge
3. Verify payment succeeds after authentication

### Webhook Testing

**Test webhook event processing:**

```bash
# Use Stripe CLI to send test events
stripe events resend evt_test_webhook

# Check edge function logs
npx supabase functions logs stripe-webhook

# Verify in database:
# - webhook_events table has entry
# - payment_logs table updated
# - user_credits updated correctly
```

## 🎨 Core Application Testing

### User Registration & Authentication

**Test 1: New User Registration**
1. Go to signup page
2. Register with new email
3. Verify email confirmation
4. Complete profile setup
5. Verify:
   - User can log in
   - Gets 3 free daily credits
   - Credits reset at midnight

**Test 2: Existing User Login**
1. Log in with existing account
2. Verify:
   - Credits display correctly
   - Previous generation history loads
   - Settings are preserved

### Image Generation Testing

**Test 1: Free Credit Usage**
1. Use free daily credits
2. Upload couple photo
3. Generate portraits in all themes
4. Verify:
   - All 3 themes generate successfully
   - Credits are deducted correctly
   - Generation completes within 30 seconds
   - Images are high quality

**Test 2: Paid Credit Usage**
1. Purchase credits via Stripe
2. Use purchased credits for generation
3. Verify:
   - Paid credits used before free credits
   - Credit balance updates correctly
   - No interruption in service

**Test 3: Credit Exhaustion**
1. Use all available credits
2. Try to generate more portraits
3. Verify:
   - Generation blocked appropriately
   - User prompted to purchase more credits
   - Clear messaging about credit status

### Mobile Responsiveness

**Test on devices:**
- iPhone (Safari, Chrome)
- Android (Chrome, Samsung Browser)
- iPad (Safari)

**Verify:**
- Payment flow works on mobile
- Image upload works correctly
- Generated images display properly
- All buttons and links are tappable

## 🔒 Security Testing

### Authentication Security

**Test 1: Unauthorized Access**
1. Try accessing protected routes without login
2. Verify:
   - Redirected to login page
   - Cannot access user data
   - Cannot make API calls

**Test 2: Session Validation**
1. Log in and get session token
2. Manually expire session
3. Try using app
4. Verify:
   - User prompted to re-authenticate
   - No data leakage occurs

### Payment Security

**Test 1: Webhook Security**
1. Send webhook without proper signature
2. Verify:
   - Webhook rejected
   - No credits added
   - Security event logged

**Test 2: API Rate Limiting**
1. Make rapid API requests
2. Verify:
   - Rate limits enforce properly
   - User gets appropriate feedback
   - System remains stable

## 📊 Performance Testing

### Load Testing

**Test 1: Concurrent Users**
```bash
# Use tool like Apache Bench or k6
ab -n 100 -c 10 https://your-domain.com/

# Expected: Response times < 2 seconds
```

**Test 2: Image Generation Load**
1. Submit multiple image generations simultaneously
2. Monitor:
   - Response times
   - Memory usage
   - Error rates
   - Database performance

**Test 3: Payment Processing Load**
1. Process multiple payments concurrently
2. Verify:
   - All payments processed correctly
   - No webhook events missed
   - Database consistency maintained

### Performance Benchmarks

| Metric | Target | Acceptable | Critical |
|--------|--------|------------|----------|
| Page Load Time | < 2s | < 3s | > 5s |
| Image Generation | < 30s | < 45s | > 60s |
| Payment Processing | < 5s | < 10s | > 15s |
| API Response Time | < 1s | < 2s | > 3s |

## 🚨 Error Handling Testing

### Network Failures

**Test 1: API Timeouts**
1. Simulate slow network
2. Verify:
   - Appropriate loading indicators
   - Timeout handling
   - User feedback on failures

**Test 2: Service Outages**
1. Temporarily disable Gemini API
2. Verify:
   - Graceful error messages
   - No credit consumption
   - System remains stable

### Payment Failures

**Test 1: Stripe Webhook Failures**
1. Temporarily break webhook endpoint
2. Process payment
3. Verify:
   - Stripe retries webhook
   - Payment eventually processes
   - User gets credits after retry

**Test 2: Database Failures**
1. Simulate database connection issues
2. Verify:
   - Appropriate error messages
   - No data corruption
   - System recovers gracefully

## 📈 Monitoring & Analytics

### Key Metrics to Monitor

**Business Metrics:**
- Payment success rate (target: >95%)
- Credit purchase conversion (target: >10%)
- User retention (target: >60% day 7)
- Average revenue per user

**Technical Metrics:**
- API response times
- Error rates by endpoint
- Database query performance
- Webhook success rates

**User Experience:**
- Image generation success rate
- Time to first successful generation
- Support ticket volume
- User satisfaction scores

### Monitoring Setup

**Supabase Dashboard:**
1. Enable all performance metrics
2. Set up alerts for error rate spikes
3. Monitor database performance
4. Track API usage patterns

**Stripe Dashboard:**
1. Monitor payment success rates
2. Track webhook delivery success
3. Set up alerts for failed payments
4. Monitor dispute rates

**Custom Analytics:**
```javascript
// Track key user actions
posthog.capture('credit_purchase', {
  amount: purchaseAmount,
  credits: creditsReceived,
  payment_method: 'stripe'
});

posthog.capture('image_generation', {
  theme: selectedTheme,
  success: generationSuccess,
  duration: generationTime
});
```

## 🔧 Production Testing Scripts

### Automated Testing Script

```bash
#!/bin/bash
# production-test.sh

echo "🧪 Running Production Tests..."

# Test 1: Health checks
echo "Testing health endpoints..."
curl -f https://your-domain.com/health || exit 1
curl -f https://your-api-domain.supabase.co/functions/v1/stripe-webhook || exit 1

# Test 2: Authentication
echo "Testing authentication..."
# Add authentication tests here

# Test 3: Payment flow
echo "Testing payment processing..."
node scripts/test-payment-flow.js || exit 1

# Test 4: Image generation
echo "Testing image generation..."
node scripts/test-image-generation.js || exit 1

echo "✅ All tests passed!"
```

### Credit Verification Script

```javascript
// scripts/verify-credits.js
const { supabase } = require('./supabase-client');

async function verifyCredits() {
  try {
    // Test credit calculation
    const { data, error } = await supabase.rpc('get_user_credits_with_reset', {
      p_user_id: 'test-user-id'
    });
    
    if (error) throw error;
    
    console.log('Credit calculation working:', data);
    return true;
  } catch (error) {
    console.error('Credit verification failed:', error);
    return false;
  }
}

verifyCredits();
```

## 📋 Testing Checklist

### Pre-Launch Testing
- [ ] All payment flows tested with real test cards
- [ ] Webhook events processed correctly
- [ ] Credits added/consumed properly
- [ ] Image generation works for all themes
- [ ] Mobile responsiveness verified
- [ ] Security measures tested
- [ ] Performance benchmarks met
- [ ] Error handling validated
- [ ] Monitoring systems active

### Post-Launch Testing (First 24 Hours)
- [ ] Monitor payment success rates
- [ ] Track image generation success
- [ ] Watch for error spikes
- [ ] Verify webhook delivery rates
- [ ] Monitor user feedback
- [ ] Check credit consumption patterns
- [ ] Validate analytics data

### Weekly Testing (Ongoing)
- [ ] Run automated test suite
- [ ] Verify payment processing
- [ ] Check credit calculations
- [ ] Monitor performance metrics
- [ ] Review error logs
- [ ] Test new features
- [ ] Validate security measures

---

**🎯 Testing Complete**: All critical paths verified and working correctly

**📅 Testing Date**: _______________

**👤 Tested By**: _______________

**📊 Results**: _______________

---

> **Important**: Keep detailed logs of all testing activities for troubleshooting and compliance purposes.