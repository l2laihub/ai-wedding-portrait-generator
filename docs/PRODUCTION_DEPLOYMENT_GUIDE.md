# Production Deployment Guide
## AI Wedding Portrait Generator with Stripe Integration

This guide covers deploying the AI Wedding Portrait Generator to production with full Stripe payment functionality and credit system.

## Prerequisites

- [ ] Domain name configured and SSL certificate set up
- [ ] Supabase production project created
- [ ] Stripe production account with business verification complete
- [ ] Gemini API key for production use
- [ ] PostHog account for analytics (optional)

## Environment Configuration

### Frontend Environment Variables (.env.local)

```bash
# Production Gemini AI Configuration
GEMINI_API_KEY=your_production_gemini_api_key

# Production Supabase Configuration
VITE_SUPABASE_URL=https://your-prod-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_production_supabase_anon_key

# Production Stripe Configuration
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_your_production_stripe_key

# Production settings
NODE_ENV=production
VITE_APP_URL=https://your-domain.com
VITE_MAINTENANCE_MODE=false

# PostHog Analytics (optional)
VITE_POSTHOG_KEY=your_posthog_key
VITE_POSTHOG_HOST=https://app.posthog.com
```

### Supabase Edge Function Secrets

Set these secrets in your Supabase project:

```bash
# Stripe production keys
npx supabase secrets set STRIPE_SECRET_KEY=sk_live_your_production_stripe_secret_key
npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_your_production_webhook_secret

# Supabase configuration
npx supabase secrets set SUPABASE_URL=https://your-prod-project-id.supabase.co
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_production_service_role_key
```

## Stripe Production Setup

### 1. Create Production Products

Create these exact products in your Stripe Dashboard with these Price IDs:

**Starter Pack - $4.99**
- Product: "10 AI Portrait Credits"
- Price ID: `price_1S7S5jBMCTqpTWpd2zgC1IPm` (update in stripeService.ts)
- Credits: 10

**Wedding Pack - $9.99** 
- Product: "25 AI Portrait Credits"
- Price ID: `price_1S7S6gBMCTqpTWpdAPUdabYB` (update in stripeService.ts)
- Credits: 25

**Party Pack - $24.99**
- Product: "75 AI Portrait Credits" 
- Price ID: `price_1S7S87BMCTqpTWpdtNWuNtjy` (update in stripeService.ts)
- Credits: 75

### 2. Configure Webhook Endpoint

**Important**: Create webhook endpoint in Stripe Dashboard:

- **URL**: `https://your-domain.supabase.co/functions/v1/stripe-webhook`
- **Events to send**:
  - `checkout.session.completed`
  - `payment_intent.succeeded`
  - `payment_intent.payment_failed`
  - `charge.dispute.created`
  - `invoice.payment_failed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`

**Critical**: Copy the webhook signing secret and set it:
```bash
npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_your_actual_webhook_secret
```

### 3. Update Price IDs

Update production Price IDs in `services/stripeService.ts`:

```typescript
export const PRICING_TIERS: PricingTier[] = [
  {
    id: 'starter',
    priceId: 'price_YOUR_PRODUCTION_STARTER_PRICE_ID', // Update this
    // ... other fields
  },
  {
    id: 'wedding', 
    priceId: 'price_YOUR_PRODUCTION_WEDDING_PRICE_ID', // Update this
    // ... other fields
  },
  {
    id: 'party',
    priceId: 'price_YOUR_PRODUCTION_PARTY_PRICE_ID', // Update this
    // ... other fields
  }
];
```

## Database Migration

Deploy database schema to production:

```bash
# Deploy migrations to production
npx supabase db push --db-url "postgresql://postgres:[password]@db.[project-id].supabase.co:5432/postgres"

# Or link to production project and push
npx supabase link --project-ref your-prod-project-id
npx supabase db push
```

### Required Database Tables

Ensure these tables exist in production:
- `user_credits` - User credit balances
- `credit_transactions` - Credit transaction history  
- `payment_logs` - Stripe payment tracking
- `webhook_events` - Webhook deduplication
- `stripe_customers` - Customer to user mapping
- `user_subscriptions` - Subscription management
- `user_activity_logs` - User activity tracking
- `alert_history` - Admin alert system

### Required Database Functions

Ensure these RPC functions are deployed:
- `get_user_credits_with_reset()` - Get credits with daily reset
- `consume_credit_atomic()` - Atomically consume credits
- `add_paid_credits()` - Add purchased credits
- `add_bonus_credits()` - Add bonus credits
- `link_stripe_customer()` - Link Stripe customer to user
- `reset_daily_credits_for_user()` - Reset daily credits

## Supabase Edge Functions Deployment

Deploy payment processing functions:

```bash
# Deploy stripe webhook handler
npx supabase functions deploy stripe-webhook

# Deploy checkout session creator  
npx supabase functions deploy stripe-checkout

# Verify deployments
npx supabase functions list
```

## Security Configuration

### 1. Row Level Security (RLS)

Ensure RLS is enabled on all tables:

```sql
-- Enable RLS on all payment-related tables
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;
```

### 2. API Key Security

- [ ] Store Gemini API key securely (not in frontend code)
- [ ] Use Supabase secrets for all sensitive keys
- [ ] Restrict Stripe webhook to your domain only
- [ ] Enable CORS properly for your domain

### 3. Rate Limiting

Configure rate limiting for:
- Image generation endpoints
- Payment API calls
- User registration/authentication

## Frontend Deployment

### Build Configuration

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Verify build output
ls -la dist/
```

### Deployment Options

**Option 1: Vercel**
```bash
npm install -g vercel
vercel deploy --prod
```

**Option 2: Netlify**
```bash
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

**Option 3: Traditional hosting**
- Upload `dist/` folder contents to web server
- Configure web server for SPA (redirect all routes to index.html)

## Testing Production Setup

### 1. Webhook Testing

```bash
# Test webhook endpoint
curl -X POST https://your-domain.supabase.co/functions/v1/stripe-webhook \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

### 2. Payment Flow Testing

Use Stripe test cards in production mode:
- **Success**: `4242424242424242`
- **Declined**: `4000000000000002`
- **Requires authentication**: `4000002500003155`

### 3. Credit System Testing

```bash
# Run credit calculation test
node scripts/test-credit-calculation.js

# Test payment flow
node scripts/test-payment-flow.js
```

## Monitoring and Alerting

### 1. Supabase Monitoring

Monitor in Supabase Dashboard:
- Edge function logs
- Database performance
- API usage
- Error rates

### 2. Stripe Monitoring

Monitor in Stripe Dashboard:
- Payment success rates
- Webhook delivery
- Failed payments
- Dispute notifications

### 3. Application Monitoring

Set up monitoring for:
- Image generation success rates
- User registration/login issues
- Credit consumption patterns
- Payment conversion rates

## Post-Deployment Checklist

- [ ] Test complete payment flow with real cards
- [ ] Verify webhook events are being received and processed
- [ ] Confirm credits are being added after successful payments
- [ ] Test image generation with purchased credits
- [ ] Verify email notifications (if implemented)
- [ ] Check all environment variables are correctly set
- [ ] Test error handling and edge cases
- [ ] Monitor for the first 24 hours for any issues
- [ ] Set up automated backups for database
- [ ] Configure monitoring and alerting

## Troubleshooting

### Common Issues

**Webhook not receiving events**
- Check webhook URL is correct in Stripe Dashboard
- Verify webhook secret is set correctly in Supabase
- Check edge function logs for errors

**Credits not being added**
- Verify Price IDs match between Stripe and code
- Check webhook event processing in logs
- Ensure database functions are deployed

**Payment failures**
- Check Stripe API keys are correct (live vs test)
- Verify webhook endpoint is accessible publicly
- Check for CORS issues in browser console

**Image generation not working**
- Verify Gemini API key is valid for production
- Check rate limits on Gemini API
- Ensure credit consumption is working

### Support Contacts

- **Stripe Support**: https://support.stripe.com
- **Supabase Support**: https://supabase.com/support  
- **Gemini API Support**: https://ai.google.dev/support

---

**⚠️ Important**: Always test the complete payment flow in Stripe's test mode before going live with real payments.