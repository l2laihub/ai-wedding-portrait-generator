#!/bin/bash

# Script to set up Stripe webhook for local development
# Requires Stripe CLI to be installed

echo "Setting up Stripe webhook for local development..."

# Check if Stripe CLI is installed
if ! command -v stripe &> /dev/null; then
    echo "Stripe CLI is not installed. Please install it first:"
    echo "https://stripe.com/docs/stripe-cli"
    exit 1
fi

# Login to Stripe CLI if not already logged in
echo "Logging in to Stripe CLI..."
stripe login

# Forward webhooks to local server
echo ""
echo "Starting webhook forwarding to local server..."
echo "This will forward Stripe webhooks to http://localhost:3001/api/webhooks/stripe"
echo ""
echo "IMPORTANT: Keep this terminal running while testing!"
echo "The webhook signing secret will be displayed below."
echo ""

stripe listen --forward-to localhost:3001/api/webhooks/stripe \
  --events checkout.session.completed,payment_intent.succeeded,payment_intent.payment_failed \
  --print-json