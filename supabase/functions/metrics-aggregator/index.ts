import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client with service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const url = new URL(req.url)
    const action = url.searchParams.get('action') || 'aggregate'

    switch (action) {
      case 'aggregate':
        return await handleMetricsAggregation(supabase)
      
      case 'real-time':
        return await handleRealTimeMetrics(supabase)
      
      case 'record':
        return await handleRecordMetric(supabase, req)
      
      case 'alerts':
        return await handleCheckAlerts(supabase)
      
      case 'revenue':
        return await handleRevenueAggregation(supabase)
      
      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
  } catch (error) {
    console.error('Metrics Aggregator Error:', error)
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

// Handle daily metrics aggregation
async function handleMetricsAggregation(supabase: any) {
  try {
    console.log('Starting daily metrics aggregation...')
    
    // Get yesterday's date for aggregation
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const targetDate = yesterday.toISOString().split('T')[0]

    // Call the aggregation function
    const { error } = await supabase.rpc('aggregate_daily_metrics', {
      p_date: targetDate
    })

    if (error) {
      console.error('Daily aggregation error:', error)
      throw error
    }

    // Refresh the dashboard overview materialized view
    const { error: refreshError } = await supabase.rpc('refresh_dashboard_metrics')
    
    if (refreshError) {
      console.error('Dashboard refresh error:', refreshError)
    }

    // Aggregate revenue data for the date
    await aggregateRevenueData(supabase, targetDate)

    console.log(`Daily metrics aggregated successfully for ${targetDate}`)
    
    return new Response(JSON.stringify({
      success: true,
      date: targetDate,
      message: 'Daily metrics aggregated successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Aggregation error:', error)
    return new Response(JSON.stringify({ 
      error: 'Failed to aggregate metrics',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}

// Handle real-time metrics for live dashboard
async function handleRealTimeMetrics(supabase: any) {
  try {
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString()
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()

    // Get current real-time metrics
    const metrics = await Promise.allSettled([
      // Users today
      supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', today),

      // Active sessions (last hour)
      supabase
        .from('user_activity_logs')
        .select('user_id', { count: 'exact', head: true })
        .gte('timestamp', hourAgo),

      // Generations today
      supabase
        .from('usage_analytics')
        .select('id', { count: 'exact', head: true })
        .gte('timestamp', today),

      // Revenue today
      supabase
        .from('payment_logs')
        .select('amount')
        .eq('status', 'succeeded')
        .gte('created_at', today),

      // Credits used today
      supabase
        .from('credit_transactions')
        .select('amount')
        .eq('type', 'usage')
        .gte('created_at', today),

      // Pending alerts
      supabase
        .from('alert_history')
        .select('id', { count: 'exact', head: true })
        .is('resolved_at', null),

      // System performance metrics (last hour)
      supabase
        .from('system_metrics')
        .select('metric_type, metric_value')
        .gte('timestamp', hourAgo)
    ])

    const [
      newUsersResult,
      activeSessionsResult,
      generationsResult,
      revenueResult,
      creditsUsedResult,
      alertsResult,
      performanceResult
    ] = metrics

    // Calculate real-time metrics
    const realTimeMetrics = {
      timestamp: now.toISOString(),
      newUsersToday: newUsersResult.status === 'fulfilled' ? newUsersResult.value.count : 0,
      activeSessionsLastHour: activeSessionsResult.status === 'fulfilled' ? 
        new Set(activeSessionsResult.value.data?.map((log: any) => log.user_id)).size : 0,
      generationsToday: generationsResult.status === 'fulfilled' ? generationsResult.value.count : 0,
      revenueToday: revenueResult.status === 'fulfilled' ? 
        revenueResult.value.data?.reduce((sum: number, payment: any) => sum + payment.amount, 0) : 0,
      creditsUsedToday: creditsUsedResult.status === 'fulfilled' ? 
        Math.abs(creditsUsedResult.value.data?.reduce((sum: number, tx: any) => sum + tx.amount, 0)) : 0,
      pendingAlerts: alertsResult.status === 'fulfilled' ? alertsResult.value.count : 0,
      systemMetrics: performanceResult.status === 'fulfilled' ? 
        processSystemMetrics(performanceResult.value.data) : {}
    }

    // Record this real-time snapshot
    await supabase
      .from('system_metrics')
      .insert({
        metric_type: 'realtime_snapshot',
        metric_value: 0,
        metadata: realTimeMetrics
      })

    return new Response(JSON.stringify(realTimeMetrics), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Real-time metrics error:', error)
    return new Response(JSON.stringify({ 
      error: 'Failed to fetch real-time metrics',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}

// Handle recording individual metrics
async function handleRecordMetric(supabase: any, req: Request) {
  try {
    const body = await req.json()
    const { metric_type, metric_value, endpoint, user_id, metadata } = body

    if (!metric_type || metric_value === undefined) {
      return new Response(JSON.stringify({ error: 'metric_type and metric_value are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Insert the metric
    const { data, error } = await supabase
      .from('system_metrics')
      .insert({
        metric_type,
        metric_value,
        endpoint,
        user_id,
        metadata: metadata || {}
      })
      .select()
      .single()

    if (error) throw error

    // Check if this metric might trigger any alerts
    if (metric_type === 'error' || metric_type === 'response_time' || metric_type === 'generation_time') {
      // Trigger alert check asynchronously
      setTimeout(() => checkAlertsForMetric(supabase, metric_type, metric_value), 100)
    }

    return new Response(JSON.stringify({
      success: true,
      metric: data
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Record metric error:', error)
    return new Response(JSON.stringify({ 
      error: 'Failed to record metric',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}

// Handle alert checking
async function handleCheckAlerts(supabase: any) {
  try {
    console.log('Checking alerts...')
    
    const { error } = await supabase.rpc('check_alerts')
    
    if (error) {
      console.error('Alert check error:', error)
      throw error
    }

    // Get any new alerts created in the last minute
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString()
    const { data: newAlerts } = await supabase
      .from('alert_history')
      .select(`
        *,
        alert_configs (alert_type, alert_channels)
      `)
      .gte('triggered_at', oneMinuteAgo)
      .is('resolved_at', null)

    // Process new alerts (send notifications, etc.)
    if (newAlerts && newAlerts.length > 0) {
      await processNewAlerts(supabase, newAlerts)
    }

    return new Response(JSON.stringify({
      success: true,
      alertsChecked: true,
      newAlerts: newAlerts?.length || 0
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Check alerts error:', error)
    return new Response(JSON.stringify({ 
      error: 'Failed to check alerts',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}

// Handle revenue aggregation
async function handleRevenueAggregation(supabase: any) {
  try {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const targetDate = yesterday.toISOString().split('T')[0]

    await aggregateRevenueData(supabase, targetDate)

    return new Response(JSON.stringify({
      success: true,
      date: targetDate,
      message: 'Revenue data aggregated successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Revenue aggregation error:', error)
    return new Response(JSON.stringify({ 
      error: 'Failed to aggregate revenue data',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}

// Helper function to aggregate revenue data
async function aggregateRevenueData(supabase: any, date: string) {
  const startDate = `${date}T00:00:00.000Z`
  const endDate = `${date}T23:59:59.999Z`

  // Get payment data for the date
  const { data: payments, error } = await supabase
    .from('payment_logs')
    .select('*')
    .gte('created_at', startDate)
    .lte('created_at', endDate)
    .eq('status', 'succeeded')

  if (error) {
    console.error('Error fetching payments:', error)
    throw error
  }

  // Group by product type based on amount
  const revenueByProduct = payments.reduce((acc: any, payment: any) => {
    let productType = 'unknown'
    switch (payment.amount) {
      case 499:
        productType = 'starter_pack'
        break
      case 999:
        productType = 'wedding_pack'
        break
      case 2499:
        productType = 'party_pack'
        break
    }

    if (!acc[productType]) {
      acc[productType] = {
        quantity_sold: 0,
        gross_revenue: 0,
        net_revenue: 0,
        refunds: 0,
        stripe_fees: 0
      }
    }

    acc[productType].quantity_sold++
    acc[productType].gross_revenue += payment.amount
    // Estimate stripe fees (2.9% + 30 cents)
    const stripeFee = Math.round(payment.amount * 0.029 + 30)
    acc[productType].stripe_fees += stripeFee
    acc[productType].net_revenue += (payment.amount - stripeFee)

    return acc
  }, {})

  // Insert or update revenue analytics
  for (const [productType, data] of Object.entries(revenueByProduct)) {
    await supabase
      .from('revenue_analytics')
      .upsert({
        date,
        product_type: productType,
        ...data
      }, {
        onConflict: 'date,product_type'
      })
  }
}

// Helper function to process system metrics
function processSystemMetrics(metrics: any[]) {
  const grouped = metrics.reduce((acc: any, metric: any) => {
    if (!acc[metric.metric_type]) {
      acc[metric.metric_type] = []
    }
    acc[metric.metric_type].push(metric.metric_value)
    return acc
  }, {})

  const processed: any = {}
  for (const [type, values] of Object.entries(grouped)) {
    const numValues = values as number[]
    processed[type] = {
      count: numValues.length,
      avg: numValues.reduce((sum, val) => sum + val, 0) / numValues.length,
      min: Math.min(...numValues),
      max: Math.max(...numValues)
    }
  }

  return processed
}

// Helper function to check alerts for specific metrics
async function checkAlertsForMetric(supabase: any, metricType: string, metricValue: number) {
  try {
    // Get alert configs for this metric type
    const { data: configs } = await supabase
      .from('alert_configs')
      .select('*')
      .eq('alert_type', metricType)
      .eq('enabled', true)

    if (!configs || configs.length === 0) return

    for (const config of configs) {
      let shouldTrigger = false
      
      switch (config.comparison_operator) {
        case '>':
          shouldTrigger = metricValue > config.threshold_value
          break
        case '<':
          shouldTrigger = metricValue < config.threshold_value
          break
        case '>=':
          shouldTrigger = metricValue >= config.threshold_value
          break
        case '<=':
          shouldTrigger = metricValue <= config.threshold_value
          break
        case '=':
          shouldTrigger = metricValue === config.threshold_value
          break
      }

      if (shouldTrigger) {
        // Check if alert was recently triggered to avoid spam
        const recentThreshold = new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago
        const { data: recentAlerts } = await supabase
          .from('alert_history')
          .select('id')
          .eq('alert_config_id', config.id)
          .gte('triggered_at', recentThreshold.toISOString())
          .is('resolved_at', null)

        if (!recentAlerts || recentAlerts.length === 0) {
          // Create new alert
          await supabase
            .from('alert_history')
            .insert({
              alert_config_id: config.id,
              alert_value: metricValue,
              alert_message: `${metricType} alert: Value ${metricValue} ${config.comparison_operator} threshold ${config.threshold_value}`
            })
        }
      }
    }
  } catch (error) {
    console.error('Error checking alerts for metric:', error)
  }
}

// Helper function to process new alerts
async function processNewAlerts(supabase: any, alerts: any[]) {
  for (const alert of alerts) {
    console.log(`Processing alert: ${alert.alert_message}`)
    
    // Here you would implement notification logic based on alert_channels
    // For now, just log the alert
    const channels = alert.alert_configs?.alert_channels || []
    
    if (channels.includes('email')) {
      // Send email notification
      console.log(`Would send email for alert: ${alert.alert_message}`)
    }
    
    if (channels.includes('slack')) {
      // Send Slack notification
      console.log(`Would send Slack message for alert: ${alert.alert_message}`)
    }
    
    if (channels.includes('webhook')) {
      // Send webhook
      console.log(`Would send webhook for alert: ${alert.alert_message}`)
    }
  }
}