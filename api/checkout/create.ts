import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '../../services/stripeService'
import { supabase } from '../../services/supabaseClient'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { priceId, userId, couponCode } = body

    if (!priceId || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: priceId and userId' },
        { status: 400 }
      )
    }

    // Get user details
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('email, id')
      .eq('id', userId)
      .single()

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Get or create Stripe customer
    let customerId: string
    
    const { data: existingCustomer } = await supabase
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single()

    if (existingCustomer) {
      customerId = existingCustomer.stripe_customer_id
    } else {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: userData.email,
        metadata: {
          user_id: userId
        }
      })
      
      customerId = customer.id

      // Link customer in database
      await supabase
        .from('stripe_customers')
        .insert({
          user_id: userId,
          stripe_customer_id: customerId
        })
    }

    // Create checkout session
    const sessionParams: any = {
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: 1
      }],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/pricing`,
      metadata: {
        user_id: userId
      }
    }

    // Apply coupon if provided
    if (couponCode) {
      try {
        const coupon = await stripe.coupons.retrieve(couponCode)
        if (coupon.valid) {
          sessionParams.discounts = [{
            coupon: couponCode
          }]
        }
      } catch (couponError) {
        console.warn('Invalid coupon code:', couponCode)
        // Continue without coupon rather than failing
      }
    }

    const session = await stripe.checkout.sessions.create(sessionParams)

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      url: session.url
    })

  } catch (error) {
    console.error('Checkout creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}