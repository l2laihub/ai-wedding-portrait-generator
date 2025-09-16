#!/bin/bash

# Test Stripe webhook locally

echo "🔧 Stripe Webhook Test Script"
echo "============================"
echo ""

# Check if stripe CLI is installed
if ! command -v stripe &> /dev/null; then
    echo "❌ Stripe CLI not found. Please install it first:"
    echo "   https://stripe.com/docs/stripe-cli"
    exit 1
fi

echo "✅ Stripe CLI found"
echo ""

# Get the webhook URL
WEBHOOK_URL="https://ptgmobxrvptiahundusu.supabase.co/functions/v1/stripe-webhook"
echo "📍 Webhook URL: $WEBHOOK_URL"
echo ""

echo "🔄 Setting up webhook forwarding..."
echo "This will forward Stripe events to your edge function."
echo ""
echo "Run this command in a separate terminal:"
echo ""
echo "stripe listen --forward-to $WEBHOOK_URL"
echo ""
echo "Then copy the webhook signing secret (starts with 'whsec_') and add it to your .env file as:"
echo "STRIPE_WEBHOOK_SECRET=whsec_..."
echo ""
echo "After that, make a test purchase and check if credits are added."
echo ""
echo "You can also trigger a test event with:"
echo "stripe trigger checkout.session.completed"