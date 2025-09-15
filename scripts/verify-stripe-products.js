import Stripe from 'stripe';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
});

async function verifyProducts() {
  console.log('Verifying Stripe products and prices...\n');

  const priceIds = [
    { id: 'price_1S7S5jBMCTqpTWpd2zgC1IPm', name: 'Starter (10 credits)', expectedAmount: 499 },
    { id: 'price_1S7S6gBMCTqpTWpdAPUdabYB', name: 'Wedding (25 credits)', expectedAmount: 999 },
    { id: 'price_1S7S87BMCTqpTWpdtNWuNtjy', name: 'Party (75 credits)', expectedAmount: 2499 }
  ];

  let allValid = true;

  for (const priceInfo of priceIds) {
    try {
      const price = await stripe.prices.retrieve(priceInfo.id);
      
      console.log(`✅ ${priceInfo.name}:`);
      console.log(`   Price ID: ${price.id}`);
      console.log(`   Amount: $${(price.unit_amount / 100).toFixed(2)} (${price.unit_amount} cents)`);
      console.log(`   Currency: ${price.currency}`);
      console.log(`   Type: ${price.type}`);
      console.log(`   Active: ${price.active}`);
      
      if (price.unit_amount !== priceInfo.expectedAmount) {
        console.log(`   ⚠️  WARNING: Expected amount ${priceInfo.expectedAmount} cents, got ${price.unit_amount} cents`);
        allValid = false;
      }
      
      console.log('');
    } catch (error) {
      console.log(`❌ ${priceInfo.name}: NOT FOUND`);
      console.log(`   Error: ${error.message}`);
      console.log('');
      allValid = false;
    }
  }

  if (allValid) {
    console.log('✅ All products verified successfully!');
    console.log('\nYou can now test the checkout flow with these products.');
  } else {
    console.log('⚠️  Some issues found. Please check your Stripe dashboard.');
    console.log('\nTo create missing products:');
    console.log('1. Go to https://dashboard.stripe.com/test/products');
    console.log('2. Create products with the exact price IDs shown above');
  }

  // Test creating a checkout session
  console.log('\n\nTesting checkout session creation...');
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price: priceIds[0].id,
        quantity: 1
      }],
      mode: 'payment',
      success_url: 'http://localhost:5173/?success=true',
      cancel_url: 'http://localhost:5173/',
    });
    
    console.log('✅ Test checkout session created successfully!');
    console.log(`   Session ID: ${session.id}`);
    console.log(`   URL: ${session.url}`);
  } catch (error) {
    console.log('❌ Failed to create test checkout session');
    console.log(`   Error: ${error.message}`);
  }
}

verifyProducts().catch(console.error);