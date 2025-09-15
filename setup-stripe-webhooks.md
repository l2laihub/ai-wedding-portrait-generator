# Stripe Webhook Setup for Development

## Current Status
✅ **Manual Credits Added**: User `dqh978@gmail.com` now has 25 paid credits
✅ **API Server Running**: `http://localhost:3001` with webhook endpoints
✅ **Stripe CLI Installed**: Ready for webhook forwarding

## Quick Fix (Already Applied)
```sql
-- Manual credit addition (already executed)
SELECT add_paid_credits(
  'c99486df-3d05-48ce-93ad-30c2592d2e8f'::uuid,
  25,
  'manual_dev_payment_' || extract(epoch from now())::text,
  'Manual credit addition for dev testing - Wedding Pack purchase'
);
```

## Proper Webhook Setup (For Future Payments)

### 1. Authenticate Stripe CLI
```bash
./stripe login
```

### 2. Forward Webhooks to Local Server
```bash
./stripe listen --forward-to localhost:3001/api/webhooks/stripe
```

### 3. Update Environment Variables
Copy the webhook secret from the CLI output to `.env.local`:
```
STRIPE_WEBHOOK_SECRET=whsec_xxx...
```

### 4. Test Webhook
```bash
./stripe trigger checkout.session.completed
```

## Webhook Events We Handle
- `checkout.session.completed` - Adds credits when payment succeeds
- `payment_intent.succeeded` - Logs successful payments
- `payment_intent.payment_failed` - Logs failed payments

## Database Functions Used
- `add_paid_credits(user_id, credits, payment_id, description)` - Adds credits and logs transaction
- Credit amounts: $4.99=10, $9.99=25, $24.99=75

## Verification
Check credits were added:
```sql
SELECT * FROM user_credits WHERE user_id = 'c99486df-3d05-48ce-93ad-30c2592d2e8f';
SELECT * FROM credit_transactions WHERE user_id = 'c99486df-3d05-48ce-93ad-30c2592d2e8f' ORDER BY created_at DESC;
```