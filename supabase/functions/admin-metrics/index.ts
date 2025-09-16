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

    console.log('Admin metrics request from:', user.email)

    // Get dashboard metrics using service role (bypassing RLS)
    const [
      { count: totalUsers },
      { count: activeUsers }, 
      { count: totalGenerations },
      { data: purchaseTransactions }
    ] = await Promise.all([
      // Total users count
      supabase.from('users').select('*', { count: 'exact', head: true }),
      
      // Active users (last 7 days)
      supabase.from('users')
        .select('*', { count: 'exact', head: true })
        .gte('last_login', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      
      // Total generations
      supabase.from('usage_analytics').select('*', { count: 'exact', head: true }),
      
      // Credit purchases for revenue
      supabase.from('credit_transactions')
        .select('amount, user_id')
        .eq('type', 'purchase')
    ])

    // Calculate revenue (assuming 10 credits = $1)
    const totalRevenue = purchaseTransactions?.reduce((sum, t) => sum + (t.amount / 10), 0) || 0
    const uniquePayingUsers = new Set(purchaseTransactions?.map(t => t.user_id) || []).size
    const conversionRate = totalUsers > 0 ? (uniquePayingUsers / totalUsers * 100) : 0

    const metrics = {
      totalUsers: totalUsers || 0,
      activeUsers: activeUsers || 0,
      totalGenerations: totalGenerations || 0,
      totalRevenue: Number(totalRevenue.toFixed(2)),
      conversionRate: Number(conversionRate.toFixed(2))
    }

    console.log('Returning metrics:', metrics)

    return new Response(
      JSON.stringify(metrics),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in admin-metrics function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})