import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
}

interface AdminUser {
  id: string;
  user_id: string;
  role: 'super_admin' | 'admin' | 'viewer';
  permissions: Record<string, boolean>;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Extract and verify admin authentication
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Verify the user's session and admin status
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Check if user is an admin
    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (adminError || !adminUser) {
      return new Response(JSON.stringify({ error: 'Access denied: Admin privileges required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const url = new URL(req.url)
    const path = url.pathname.split('/').pop()
    const method = req.method

    // Route to appropriate handler
    switch (`${method}:${path}`) {
      case 'GET:overview':
        return await handleDashboardOverview(supabase)
      
      case 'GET:metrics':
        return await handleMetrics(supabase, url.searchParams)
      
      case 'GET:users':
        return await handleUsers(supabase, url.searchParams, adminUser)
      
      case 'GET:analytics':
        return await handleAnalytics(supabase, url.searchParams)
      
      case 'GET:revenue':
        return await handleRevenue(supabase, url.searchParams)
      
      case 'GET:alerts':
        return await handleGetAlerts(supabase)
      
      case 'POST:alerts':
        return await handleCreateAlert(supabase, req, adminUser)
      
      case 'PUT:alerts':
        return await handleUpdateAlert(supabase, req, adminUser)
      
      case 'DELETE:alerts':
        return await handleDeleteAlert(supabase, url.searchParams, adminUser)
      
      case 'GET:export':
        return await handleExport(supabase, url.searchParams, adminUser)
      
      default:
        return new Response(JSON.stringify({ error: 'Endpoint not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
  } catch (error) {
    console.error('Admin Dashboard Error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

// Dashboard overview handler
async function handleDashboardOverview(supabase: any) {
  try {
    // Get pre-computed overview metrics
    const { data: overview, error } = await supabase
      .from('dashboard_overview')
      .select('*')
      .single()

    if (error) {
      console.error('Error fetching overview:', error)
      throw error
    }

    // Get recent alerts
    const { data: alerts } = await supabase
      .from('alert_history')
      .select(`
        *,
        alert_configs (alert_type)
      `)
      .is('resolved_at', null)
      .order('triggered_at', { ascending: false })
      .limit(10)

    // Get recent activity
    const { data: recentActivity } = await supabase
      .from('user_activity_logs')
      .select(`
        *,
        users (email, display_name)
      `)
      .order('timestamp', { ascending: false })
      .limit(20)

    const response = {
      overview,
      alerts: alerts || [],
      recentActivity: recentActivity || []
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Overview error:', error)
    return new Response(JSON.stringify({ error: 'Failed to fetch overview data' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}

// Metrics handler
async function handleMetrics(supabase: any, params: URLSearchParams) {
  try {
    const timeRange = params.get('range') || '7d'
    const metricType = params.get('type')
    
    let dateFilter: string
    switch (timeRange) {
      case '1d':
        dateFilter = "timestamp >= NOW() - INTERVAL '1 day'"
        break
      case '7d':
        dateFilter = "timestamp >= NOW() - INTERVAL '7 days'"
        break
      case '30d':
        dateFilter = "timestamp >= NOW() - INTERVAL '30 days'"
        break
      case '90d':
        dateFilter = "timestamp >= NOW() - INTERVAL '90 days'"
        break
      default:
        dateFilter = "timestamp >= NOW() - INTERVAL '7 days'"
    }

    // Get daily metrics for the time range
    const { data: dailyMetrics, error: dailyError } = await supabase
      .from('daily_metrics')
      .select('*')
      .gte('date', new Date(Date.now() - getDaysInMilliseconds(timeRange)).toISOString().split('T')[0])
      .order('date', { ascending: true })

    if (dailyError) throw dailyError

    // Get system metrics if specific type requested
    let systemMetrics = null
    if (metricType) {
      const { data: sysMetrics, error: sysError } = await supabase
        .from('system_metrics')
        .select('*')
        .eq('metric_type', metricType)
        .filter('timestamp', 'gte', `NOW() - INTERVAL '${timeRange.replace('d', ' days')}'`)
        .order('timestamp', { ascending: true })

      if (!sysError) {
        systemMetrics = sysMetrics
      }
    }

    return new Response(JSON.stringify({
      dailyMetrics: dailyMetrics || [],
      systemMetrics
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Metrics error:', error)
    return new Response(JSON.stringify({ error: 'Failed to fetch metrics' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}

// Users handler
async function handleUsers(supabase: any, params: URLSearchParams, adminUser: AdminUser) {
  try {
    const page = parseInt(params.get('page') || '1')
    const limit = parseInt(params.get('limit') || '50')
    const search = params.get('search')
    const sortBy = params.get('sortBy') || 'created_at'
    const sortOrder = params.get('sortOrder') || 'desc'
    
    const offset = (page - 1) * limit

    let query = supabase
      .from('users')
      .select(`
        *,
        user_credits (*),
        credit_transactions (
          id,
          type,
          amount,
          created_at
        )
      `, { count: 'exact' })

    // Apply search filter
    if (search) {
      query = query.or(`email.ilike.%${search}%,display_name.ilike.%${search}%`)
    }

    // Apply sorting and pagination
    const { data: users, error, count } = await query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1)

    if (error) throw error

    // Calculate summary statistics
    const { data: stats } = await supabase
      .from('users')
      .select(`
        id,
        created_at,
        user_credits (paid_credits, bonus_credits)
      `)

    const userStats = {
      totalUsers: count || 0,
      newUsersToday: stats?.filter(u => 
        new Date(u.created_at).toDateString() === new Date().toDateString()
      ).length || 0,
      totalPaidCredits: stats?.reduce((sum, u) => 
        sum + (u.user_credits?.paid_credits || 0), 0
      ) || 0,
      totalBonusCredits: stats?.reduce((sum, u) => 
        sum + (u.user_credits?.bonus_credits || 0), 0
      ) || 0
    }

    return new Response(JSON.stringify({
      users: users || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      },
      stats: userStats
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Users error:', error)
    return new Response(JSON.stringify({ error: 'Failed to fetch users' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}

// Analytics handler
async function handleAnalytics(supabase: any, params: URLSearchParams) {
  try {
    const timeRange = params.get('range') || '30d'
    
    // Get usage analytics
    const { data: usageData, error: usageError } = await supabase
      .from('usage_analytics')
      .select('*')
      .gte('timestamp', getDateRange(timeRange))
      .order('timestamp', { ascending: true })

    if (usageError) throw usageError

    // Group by date and theme
    const analytics = processUsageAnalytics(usageData || [])

    // Get conversion funnel data
    const { data: funnelData } = await supabase
      .from('user_activity_logs')
      .select('activity_type, user_id, timestamp')
      .gte('timestamp', getDateRange(timeRange))
      .in('activity_type', ['signup', 'first_generation', 'purchase'])

    const conversionFunnel = processConversionFunnel(funnelData || [])

    return new Response(JSON.stringify({
      analytics,
      conversionFunnel
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Analytics error:', error)
    return new Response(JSON.stringify({ error: 'Failed to fetch analytics' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}

// Revenue handler
async function handleRevenue(supabase: any, params: URLSearchParams) {
  try {
    const timeRange = params.get('range') || '30d'
    
    // Get revenue analytics
    const { data: revenueData, error } = await supabase
      .from('revenue_analytics')
      .select('*')
      .gte('date', getDateRange(timeRange))
      .order('date', { ascending: true })

    if (error) throw error

    // Get payment logs for detailed breakdown
    const { data: paymentLogs } = await supabase
      .from('payment_logs')
      .select('*')
      .eq('status', 'succeeded')
      .gte('created_at', getDateRange(timeRange))
      .order('created_at', { ascending: true })

    const revenue = {
      analytics: revenueData || [],
      recentPayments: paymentLogs?.slice(-20) || [],
      summary: calculateRevenueSummary(revenueData || [])
    }

    return new Response(JSON.stringify(revenue), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Revenue error:', error)
    return new Response(JSON.stringify({ error: 'Failed to fetch revenue data' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}

// Alert handlers
async function handleGetAlerts(supabase: any) {
  try {
    const { data: configs } = await supabase
      .from('alert_configs')
      .select('*')
      .order('created_at', { ascending: false })

    const { data: history } = await supabase
      .from('alert_history')
      .select(`
        *,
        alert_configs (alert_type),
        admin_users!acknowledged_by (user_id, users(email))
      `)
      .order('triggered_at', { ascending: false })
      .limit(50)

    return new Response(JSON.stringify({
      configs: configs || [],
      history: history || []
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Get alerts error:', error)
    return new Response(JSON.stringify({ error: 'Failed to fetch alerts' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}

async function handleCreateAlert(supabase: any, req: Request, adminUser: AdminUser) {
  try {
    if (!['super_admin', 'admin'].includes(adminUser.role)) {
      return new Response(JSON.stringify({ error: 'Insufficient permissions' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const alertConfig = await req.json()
    
    const { data, error } = await supabase
      .from('alert_configs')
      .insert(alertConfig)
      .select()
      .single()

    if (error) throw error

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Create alert error:', error)
    return new Response(JSON.stringify({ error: 'Failed to create alert' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}

async function handleUpdateAlert(supabase: any, req: Request, adminUser: AdminUser) {
  try {
    if (!['super_admin', 'admin'].includes(adminUser.role)) {
      return new Response(JSON.stringify({ error: 'Insufficient permissions' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { id, ...updates } = await req.json()
    
    const { data, error } = await supabase
      .from('alert_configs')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Update alert error:', error)
    return new Response(JSON.stringify({ error: 'Failed to update alert' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}

async function handleDeleteAlert(supabase: any, params: URLSearchParams, adminUser: AdminUser) {
  try {
    if (adminUser.role !== 'super_admin') {
      return new Response(JSON.stringify({ error: 'Insufficient permissions' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const id = params.get('id')
    if (!id) {
      return new Response(JSON.stringify({ error: 'Alert ID required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { error } = await supabase
      .from('alert_configs')
      .delete()
      .eq('id', id)

    if (error) throw error

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Delete alert error:', error)
    return new Response(JSON.stringify({ error: 'Failed to delete alert' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}

// Export handler
async function handleExport(supabase: any, params: URLSearchParams, adminUser: AdminUser) {
  try {
    const exportType = params.get('type') || 'users'
    const format = params.get('format') || 'csv'
    const filters = JSON.parse(params.get('filters') || '{}')

    let data: any[] = []
    let filename = ''

    switch (exportType) {
      case 'users':
        const { data: userData } = await supabase
          .from('users')
          .select(`
            *,
            user_credits (*)
          `)
        data = userData || []
        filename = `users_export_${new Date().toISOString().split('T')[0]}`
        break

      case 'transactions':
        const { data: transactionData } = await supabase
          .from('credit_transactions')
          .select(`
            *,
            users (email)
          `)
        data = transactionData || []
        filename = `transactions_export_${new Date().toISOString().split('T')[0]}`
        break

      case 'analytics':
        const { data: analyticsData } = await supabase
          .from('usage_analytics')
          .select('*')
        data = analyticsData || []
        filename = `analytics_export_${new Date().toISOString().split('T')[0]}`
        break

      default:
        return new Response(JSON.stringify({ error: 'Invalid export type' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }

    // Log the export
    await supabase
      .from('export_logs')
      .insert({
        exported_by: adminUser.id,
        export_type: exportType,
        export_format: format,
        filters,
        row_count: data.length
      })

    // Format data based on requested format
    let responseData: string
    let contentType: string

    if (format === 'csv') {
      responseData = convertToCSV(data)
      contentType = 'text/csv'
    } else {
      responseData = JSON.stringify(data, null, 2)
      contentType = 'application/json'
    }

    return new Response(responseData, {
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}.${format}"`
      }
    })
  } catch (error) {
    console.error('Export error:', error)
    return new Response(JSON.stringify({ error: 'Failed to export data' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}

// Helper functions
function getDaysInMilliseconds(range: string): number {
  const days = parseInt(range.replace('d', ''))
  return days * 24 * 60 * 60 * 1000
}

function getDateRange(range: string): string {
  const days = parseInt(range.replace('d', ''))
  const date = new Date(Date.now() - (days * 24 * 60 * 60 * 1000))
  return date.toISOString()
}

function processUsageAnalytics(data: any[]): any {
  const grouped = data.reduce((acc, item) => {
    const date = item.timestamp.split('T')[0]
    const theme = item.theme || 'unknown'
    
    if (!acc[date]) acc[date] = {}
    if (!acc[date][theme]) acc[date][theme] = 0
    acc[date][theme]++
    
    return acc
  }, {})

  return Object.entries(grouped).map(([date, themes]) => ({
    date,
    ...themes
  }))
}

function processConversionFunnel(data: any[]): any {
  const stages = {
    signup: new Set(),
    first_generation: new Set(),
    purchase: new Set()
  }

  data.forEach(item => {
    if (stages[item.activity_type as keyof typeof stages]) {
      stages[item.activity_type as keyof typeof stages].add(item.user_id)
    }
  })

  return {
    signups: stages.signup.size,
    first_generation: stages.first_generation.size,
    purchases: stages.purchase.size,
    conversion_to_generation: stages.signup.size > 0 ? 
      (stages.first_generation.size / stages.signup.size) * 100 : 0,
    conversion_to_purchase: stages.signup.size > 0 ? 
      (stages.purchase.size / stages.signup.size) * 100 : 0
  }
}

function calculateRevenueSummary(data: any[]): any {
  return data.reduce((acc, item) => {
    acc.totalRevenue += item.gross_revenue || 0
    acc.netRevenue += item.net_revenue || 0
    acc.totalRefunds += item.refunds || 0
    acc.stripeFees += item.stripe_fees || 0
    return acc
  }, {
    totalRevenue: 0,
    netRevenue: 0,
    totalRefunds: 0,
    stripeFees: 0
  })
}

function convertToCSV(data: any[]): string {
  if (data.length === 0) return ''
  
  const headers = Object.keys(data[0])
  const csvRows = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header]
        return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value
      }).join(',')
    )
  ]
  
  return csvRows.join('\n')
}