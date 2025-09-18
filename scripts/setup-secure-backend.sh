#!/bin/bash

# Setup script for secure rate limiting backend infrastructure
# This script sets up the database migration and edge function

set -e

echo "🚀 Setting up secure rate limiting backend infrastructure..."

# Check if Supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Check if we're in a Supabase project
if [ ! -f "supabase/config.toml" ]; then
    echo "❌ No Supabase project found. Please run 'supabase init' first."
    exit 1
fi

echo "📊 Running database migration for rate limiting infrastructure..."
supabase db push

echo "🔧 Deploying portrait generation edge function..."
supabase functions deploy portrait-generation --no-verify-jwt

echo "🔑 Setting up edge function secrets..."

# Check if GEMINI_API_KEY is set in environment
if [ -z "$GEMINI_API_KEY" ]; then
    echo "⚠️  GEMINI_API_KEY environment variable not set."
    echo "   Please set it with: export GEMINI_API_KEY=your_api_key_here"
    echo "   Then run: supabase secrets set GEMINI_API_KEY=your_api_key_here"
else
    supabase secrets set GEMINI_API_KEY="$GEMINI_API_KEY"
    echo "✅ GEMINI_API_KEY secret set successfully"
fi

echo "📈 Checking database functions..."
supabase db functions list

echo ""
echo "✅ Setup complete! Your secure rate limiting backend is ready."
echo ""
echo "Next steps:"
echo "1. Update your environment variables:"
echo "   - Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set"
echo "   - The GEMINI_API_KEY should be set as a Supabase secret (not client-side)"
echo ""
echo "2. Test the edge function:"
echo "   curl -X POST '$SUPABASE_URL/functions/v1/portrait-generation' \\"
echo "        -H 'Authorization: Bearer $SUPABASE_ANON_KEY' \\"
echo "        -H 'Content-Type: application/json' \\"
echo "        -d '{\"imageData\":\"test\",\"imageType\":\"image/jpeg\",\"prompt\":\"test\",\"style\":\"test\"}'"
echo ""
echo "3. Monitor the logs:"
echo "   supabase functions logs portrait-generation"
echo ""
echo "🔒 Security features enabled:"
echo "   ✓ Rate limiting by IP, user, and session"
echo "   ✓ API key authentication for service calls"
echo "   ✓ Request tracking and analytics"
echo "   ✓ Duplicate request detection"
echo "   ✓ Secure credential handling"