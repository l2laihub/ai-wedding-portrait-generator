# Stripe Checkout Integration Guide

This guide explains how to set up and test the Stripe checkout integration for the AI Wedding Portrait Generator.

## Prerequisites

1. **Stripe Account**: Create a free Stripe account at https://stripe.com
2. **Stripe CLI**: Install the Stripe CLI for webhook testing: https://stripe.com/docs/stripe-cli
3. **Environment Variables**: Ensure your `.env.local` file has the following Stripe keys:

```env
# Stripe Configuration
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_... # Your publishable key
STRIPE_SECRET_KEY=sk_test_...           # Your secret key
STRIPE_WEBHOOK_SECRET=whsec_...         # Your webhook secret

# Stripe Price IDs (already configured in .env.local)
STRIPE_STARTER_PRICE_ID=price_1S7S5jBMCTqpTWpd2zgC1IPm
STRIPE_WEDDING_PRICE_ID=price_1S7S6gBMCTqpTWpdAPUdabYB
STRIPE_PARTY_PRICE_ID=price_1S7S87BMCTqpTWpdtNWuNtjy
```

## Setup Instructions

### 1. Start the Development Servers

Open two terminal windows:

**Terminal 1 - Frontend (Vite)**:
```bash
npm run dev
```

**Terminal 2 - Backend (Express)**:
```bash
npm run dev:server
```

### 2. Set Up Webhook Forwarding (for local testing)

Open a third terminal and run:
```bash
./scripts/setup-stripe-webhook.sh
```

This will:
- Log you into Stripe CLI
- Start forwarding webhooks to your local server
- Display a webhook signing secret (update your `.env.local` if different)

Keep this terminal running while testing!

### 3. Verify Stripe Products

The app is configured with three credit packages:

| Package | Credits | Price | Price ID |
|---------|---------|-------|----------|
| Starter | 10 | $4.99 | `price_1S7S5jBMCTqpTWpd2zgC1IPm` |
| Wedding | 25 | $9.99 | `price_1S7S6gBMCTqpTWpdAPUdabYB` |
| Party | 75 | $24.99 | `price_1S7S87BMCTqpTWpdtNWuNtjy` |

These price IDs are already created in your Stripe test account.

## Testing the Integration

### 1. Sign In to the App
- Click the user icon in the header
- Create an account or sign in

### 2. Trigger the Upgrade Prompt
- Generate portraits until you reach the free limit
- The upgrade prompt will appear automatically
- Or click "Buy Credits" in the user profile

### 3. Test the Checkout Flow
- Select a credit package
- Click "Purchase"
- You'll be redirected to Stripe Checkout

### 4. Use Test Card Numbers
Stripe provides test card numbers for different scenarios:

**Successful Payment**:
- Card: `4242 4242 4242 4242`
- Exp: Any future date
- CVC: Any 3 digits
- ZIP: Any 5 digits

**Declined Payment**:
- Card: `4000 0000 0000 0002`

**More test cards**: https://stripe.com/docs/testing#cards

### 5. Complete the Purchase
- Fill in the test card details
- Complete the checkout
- You'll be redirected back to the app with a success message
- Credits will be automatically added to your account

## How It Works

1. **Checkout Creation**: When a user clicks purchase, the frontend calls `/api/checkout/create`
2. **Session Creation**: The backend creates a Stripe checkout session with the user's details
3. **Redirect**: User is redirected to Stripe's hosted checkout page
4. **Payment**: User completes payment on Stripe's secure page
5. **Webhook**: Stripe sends a `checkout.session.completed` event to your webhook endpoint
6. **Credit Addition**: The webhook handler adds credits to the user's account
7. **Success Page**: User is redirected back to the app's success page

## Monitoring

### View Webhook Events
In the terminal running the Stripe CLI, you'll see:
- Incoming webhook events
- Event processing status
- Any errors

### Check Server Logs
In the backend server terminal, you'll see:
- Checkout session creation logs
- Webhook processing logs
- Credit addition confirmations

### Stripe Dashboard
Visit your Stripe dashboard to see:
- Test payments
- Webhook event history
- Customer records

## Troubleshooting

### "Invalid webhook signature" Error
- Ensure the `STRIPE_WEBHOOK_SECRET` in `.env.local` matches the one shown by Stripe CLI
- Restart the dev server after updating environment variables

### Credits Not Added After Payment
- Check that the webhook forwarding is running
- Verify the `add_paid_credits` function exists in your Supabase database
- Check server logs for database errors

### Checkout Session Creation Fails
- Verify your Stripe keys are correct
- Ensure the user is authenticated
- Check that the price IDs match your Stripe account

### CORS Issues
- The Vite proxy should handle CORS, but ensure both servers are running
- Check that the proxy configuration in `vite.config.ts` is correct

## Production Deployment

For production deployment:

1. **Update Environment Variables**:
   - Use production Stripe keys (not test keys)
   - Set proper webhook endpoint URL

2. **Configure Webhook in Stripe Dashboard**:
   - Go to Stripe Dashboard > Webhooks
   - Add endpoint: `https://yourdomain.com/api/webhooks/stripe`
   - Select events: `checkout.session.completed`, `payment_intent.succeeded`, `payment_intent.payment_failed`
   - Copy the signing secret to your production environment

3. **Update Success/Cancel URLs**:
   - In the checkout session creation, update URLs to your production domain

4. **Enable HTTPS**:
   - Stripe webhooks require HTTPS in production

## Security Best Practices

1. **Never expose secret keys**: Keep `STRIPE_SECRET_KEY` server-side only
2. **Verify webhook signatures**: Always validate webhook events are from Stripe
3. **Use HTTPS in production**: Required for PCI compliance
4. **Validate user permissions**: Ensure users can only purchase for their own accounts
5. **Log all transactions**: Maintain audit trail for disputes

## Support

- Stripe Documentation: https://stripe.com/docs
- Stripe Support: https://support.stripe.com
- Test Mode FAQ: https://stripe.com/docs/testing