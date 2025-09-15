# Stripe Products Setup Guide

This guide helps you create the products in your Stripe dashboard to complete the monetization implementation.

## Step 1: Login to Stripe Dashboard
1. Go to [https://dashboard.stripe.com/](https://dashboard.stripe.com/)
2. Make sure you're in **LIVE MODE** (not test mode) for production

## Step 2: Create Products

### Product 1: Starter Pack
1. Go to **Products** → **+ Add Product**
2. **Product Information:**
   - Product name: `WedAI Starter - 10 Credits`
   - Description: `Launch price - Perfect for trying out our AI portraits. Generate 10 beautiful wedding portraits with all 12 available themes.`
   - Image: Upload the WedAI logo if available

3. **Pricing:**
   - Pricing model: `One time`
   - Price: `$4.99 USD`
   - Price description: `10 AI Portrait Credits`

4. **Save** and copy the **Price ID** (starts with `price_`)

### Product 2: Wedding Pack (Most Popular)
1. **Product Information:**
   - Product name: `WedAI Wedding Pack - 25 Credits`
   - Description: `Most popular choice for couples. Generate 25 beautiful wedding portraits with priority processing and all premium themes.`

2. **Pricing:**
   - Pricing model: `One time`
   - Price: `$9.99 USD`
   - Price description: `25 AI Portrait Credits`

3. **Save** and copy the **Price ID**

### Product 3: Party Pack (Best Value)
1. **Product Information:**
   - Product name: `WedAI Party Pack - 75 Credits`
   - Description: `Best value for large celebrations. Generate 75 beautiful wedding portraits with priority processing and dedicated support.`

2. **Pricing:**
   - Pricing model: `One time`
   - Price: `$24.99 USD`
   - Price description: `75 AI Portrait Credits`

3. **Save** and copy the **Price ID**

## Step 3: Create Launch Weekend Coupon
1. Go to **Products** → **Coupons** → **+ Create Coupon**
2. **Coupon Configuration:**
   - Name: `LAUNCH50`
   - Type: `Percent off`
   - Percent off: `50%`
   - Duration: `Once`
   - Max redemptions: `500` (or desired limit)
   - Description: `Launch Weekend Special - 50% OFF`

## Step 4: Update Environment Variables
Once you have the Price IDs, update your environment variables:

```bash
# Add to .env.local (development)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Price IDs
STRIPE_STARTER_PRICE_ID=price_...
STRIPE_WEDDING_PRICE_ID=price_...
STRIPE_PARTY_PRICE_ID=price_...
```

## Step 5: Update Code with Real Price IDs
Replace the placeholder price IDs in `/services/stripeService.ts`:

```typescript
// Replace these lines:
priceId: 'price_1QSxxxxxxxxxxx', // STARTER
priceId: 'price_1QSyxxxxxxxxxx', // WEDDING  
priceId: 'price_1QSzxxxxxxxxxx', // PARTY

// With your actual Stripe Price IDs:
priceId: 'price_your_actual_starter_id',
priceId: 'price_your_actual_wedding_id', 
priceId: 'price_your_actual_party_id',
```

## Step 6: Setup Webhook Endpoint
1. Go to **Developers** → **Webhooks** → **+ Add endpoint**
2. **Endpoint URL:** `https://your-domain.com/api/stripe-webhook`
3. **Events to send:**
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
4. **Save** and copy the **Webhook Secret** (starts with `whsec_`)

## Step 7: Test in Development
1. Switch to **Test Mode** in Stripe dashboard
2. Create test products with same configuration
3. Use test credit card: `4242 4242 4242 4242`
4. Verify webhook receives events

## Step 8: Go Live
1. Switch back to **Live Mode**
2. Update environment variables with live keys
3. Deploy to production
4. Test with real payment (small amount)
5. Announce launch! 🚀

---

## Security Checklist
- [ ] Webhook signatures are verified
- [ ] Stripe secret keys are in environment variables (not code)
- [ ] HTTPS is enabled for all webhook endpoints
- [ ] Error handling is implemented for failed payments
- [ ] Customer data is handled according to privacy policy

## Next Steps After Setup
1. Monitor payment success rates
2. Track conversion metrics
3. Gather user feedback
4. Optimize pricing based on data
5. Plan expansion features

---

*This setup completes the monetization implementation from the WedAI Implementation Plan. The app will be ready to generate revenue once deployed with these Stripe products configured.*