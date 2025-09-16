import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Use service role for database access
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verify admin access by checking auth header
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user from auth token
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user is admin (email-based for now)
    if (user.email !== 'admin@huybuilds.app') {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Admin credits request from:', user.email)

    // Parse request body
    const body = await req.json()
    const { action, user_id, amount, reason } = body

    if (!action || !user_id || !amount || !reason) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: action, user_id, amount, reason' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!['grant', 'deduct'].includes(action)) {
      return new Response(
        JSON.stringify({ error: 'Invalid action. Must be "grant" or "deduct"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Ensure user_credits record exists
    const { data: existingCredits, error: checkError } = await supabase
      .from('user_credits')
      .select('*')
      .eq('user_id', user_id)
      .single()

    let userCredits = existingCredits

    if (checkError && checkError.code === 'PGRST116') {
      // Create user_credits record if it doesn't exist
      const { data: newCredits, error: insertError } = await supabase
        .from('user_credits')
        .insert({
          user_id: user_id,
          paid_credits: 0,
          bonus_credits: 0,
          free_credits_used_today: 0,
          last_free_reset: new Date().toISOString().split('T')[0]
        })
        .select()
        .single()

      if (insertError) {
        console.error('Error creating user_credits:', insertError)
        return new Response(
          JSON.stringify({ error: 'Failed to create user credits record' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      userCredits = newCredits
    } else if (checkError) {
      console.error('Error checking user_credits:', checkError)
      return new Response(
        JSON.stringify({ error: 'Failed to check user credits' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let newPaidCredits = userCredits.paid_credits
    let newBonusCredits = userCredits.bonus_credits
    let transactionType = ''
    let transactionAmount = 0

    if (action === 'grant') {
      // Grant credits as bonus credits
      newBonusCredits += amount
      transactionType = 'bonus'
      transactionAmount = amount
    } else if (action === 'deduct') {
      // Deduct credits (bonus first, then paid)
      const totalCredits = userCredits.paid_credits + userCredits.bonus_credits
      
      if (totalCredits < amount) {
        return new Response(
          JSON.stringify({ error: `Insufficient credits. User has ${totalCredits} credits, trying to deduct ${amount}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      let deductFromBonus = Math.min(amount, userCredits.bonus_credits)
      let deductFromPaid = amount - deductFromBonus

      newBonusCredits = userCredits.bonus_credits - deductFromBonus
      newPaidCredits = userCredits.paid_credits - deductFromPaid
      transactionType = 'usage'
      transactionAmount = -amount
    }

    // Update user_credits
    const { error: updateError } = await supabase
      .from('user_credits')
      .update({
        paid_credits: newPaidCredits,
        bonus_credits: newBonusCredits
      })
      .eq('user_id', user_id)

    if (updateError) {
      console.error('Error updating user_credits:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to update user credits' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const newBalance = newPaidCredits + newBonusCredits

    // Log the transaction
    const { error: transactionError } = await supabase
      .from('credit_transactions')
      .insert({
        user_id: user_id,
        type: transactionType,
        amount: transactionAmount,
        balance_after: newBalance,
        description: reason
      })

    if (transactionError) {
      console.error('Error logging transaction:', transactionError)
      // Don't fail the whole operation for transaction logging
    }

    console.log(`Admin ${action} credits: ${amount} for user ${user_id}. New balance: ${newBalance}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        newBalance: newBalance,
        action: action,
        amount: action === 'grant' ? amount : -amount
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in admin-credits function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})