import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
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

    // Check if user is admin
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (profileError || !userProfile?.is_admin) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const url = new URL(req.url)
    const packageId = url.searchParams.get('package_id')
    const startDate = url.searchParams.get('start_date')
    const endDate = url.searchParams.get('end_date')
    const analyticsType = url.searchParams.get('type') || 'overview'

    switch (req.method) {
      case 'GET':
        switch (analyticsType) {
          case 'overview':
            // Get package overview statistics
            const { data: stats, error: statsError } = await supabase.rpc('get_package_statistics')

            if (statsError) {
              return new Response(JSON.stringify({ error: statsError.message }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              })
            }

            return new Response(JSON.stringify({ 
              statistics: stats,
              type: 'overview' 
            }), {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })

          case 'package-performance':
            // Get detailed package performance metrics
            let packageQuery = supabase
              .from('package_usage')
              .select(`
                id,
                user_id,
                package_id,
                credits_used,
                generations_count,
                themes_used,
                upload_type,
                status,
                created_at,
                package:photo_packages(name, slug, images_per_generation),
                tier:package_pricing_tiers(name, price_cents)
              `)
              .order('created_at', { ascending: false })

            if (packageId) {
              packageQuery = packageQuery.eq('package_id', packageId)
            }

            if (startDate) {
              packageQuery = packageQuery.gte('created_at', startDate)
            }

            if (endDate) {
              packageQuery = packageQuery.lte('created_at', endDate)
            }

            const { data: packageUsage, error: packageError } = await packageQuery.limit(1000)

            if (packageError) {
              return new Response(JSON.stringify({ error: packageError.message }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              })
            }

            // Calculate performance metrics
            const performanceMetrics = calculatePerformanceMetrics(packageUsage)

            return new Response(JSON.stringify({ 
              performance: performanceMetrics,
              usage: packageUsage,
              type: 'package-performance' 
            }), {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })

          case 'theme-popularity':
            // Get theme usage analytics
            let themeQuery = supabase
              .from('package_analytics')
              .select(`
                theme_id,
                generation_count,
                user_rating,
                processing_time_ms,
                created_at,
                theme:package_themes(name, package_id),
                package:photo_packages(name, slug)
              `)
              .order('created_at', { ascending: false })

            if (packageId) {
              themeQuery = themeQuery.eq('package_id', packageId)
            }

            if (startDate) {
              themeQuery = themeQuery.gte('created_at', startDate)
            }

            if (endDate) {
              themeQuery = themeQuery.lte('created_at', endDate)
            }

            const { data: themeAnalytics, error: themeError } = await themeQuery.limit(1000)

            if (themeError) {
              return new Response(JSON.stringify({ error: themeError.message }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              })
            }

            // Calculate theme popularity metrics
            const themeMetrics = calculateThemeMetrics(themeAnalytics)

            return new Response(JSON.stringify({ 
              themes: themeMetrics,
              analytics: themeAnalytics,
              type: 'theme-popularity' 
            }), {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })

          case 'revenue':
            // Get revenue analytics
            let revenueQuery = supabase
              .from('package_usage')
              .select(`
                credits_used,
                created_at,
                package:photo_packages(name, slug),
                tier:package_pricing_tiers(name, price_cents, shoots_count)
              `)
              .eq('status', 'completed')
              .order('created_at', { ascending: false })

            if (packageId) {
              revenueQuery = revenueQuery.eq('package_id', packageId)
            }

            if (startDate) {
              revenueQuery = revenueQuery.gte('created_at', startDate)
            }

            if (endDate) {
              revenueQuery = revenueQuery.lte('created_at', endDate)
            }

            const { data: revenueData, error: revenueError } = await revenueQuery.limit(1000)

            if (revenueError) {
              return new Response(JSON.stringify({ error: revenueError.message }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              })
            }

            // Calculate revenue metrics
            const revenueMetrics = calculateRevenueMetrics(revenueData)

            return new Response(JSON.stringify({ 
              revenue: revenueMetrics,
              transactions: revenueData,
              type: 'revenue' 
            }), {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })

          default:
            return new Response(JSON.stringify({ error: 'Invalid analytics type' }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

      case 'POST':
        // Record analytics event
        const analyticsData = await req.json()
        
        if (!analyticsData.package_id) {
          return new Response(JSON.stringify({ error: 'package_id is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        const { data: newAnalytics, error: createError } = await supabase
          .from('package_analytics')
          .insert({
            package_id: analyticsData.package_id,
            theme_id: analyticsData.theme_id,
            user_id: analyticsData.user_id,
            generation_count: analyticsData.generation_count || 1,
            images_generated: analyticsData.images_generated,
            success_rate: analyticsData.success_rate,
            processing_time_ms: analyticsData.processing_time_ms,
            user_rating: analyticsData.user_rating,
            metadata: analyticsData.metadata || {}
          })
          .select()
          .single()

        if (createError) {
          return new Response(JSON.stringify({ error: createError.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        return new Response(JSON.stringify({ 
          analytics: newAnalytics,
          message: 'Analytics recorded successfully' 
        }), {
          status: 201,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

      default:
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }

  } catch (error) {
    console.error('Admin Package Analytics Error:', error)
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

// Helper function to calculate performance metrics
function calculatePerformanceMetrics(usageData: any[]) {
  if (!usageData.length) {
    return {
      total_usage: 0,
      total_credits: 0,
      success_rate: 0,
      avg_generations: 0,
      popular_packages: [],
      daily_trends: []
    }
  }

  const total_usage = usageData.length
  const total_credits = usageData.reduce((sum, item) => sum + (item.credits_used || 0), 0)
  const successful = usageData.filter(item => item.status === 'completed').length
  const success_rate = (successful / total_usage) * 100
  const avg_generations = usageData.reduce((sum, item) => sum + (item.generations_count || 0), 0) / total_usage

  // Group by package
  const packageGroups = usageData.reduce((acc, item) => {
    const packageName = item.package?.name || 'Unknown'
    if (!acc[packageName]) {
      acc[packageName] = { count: 0, credits: 0 }
    }
    acc[packageName].count++
    acc[packageName].credits += item.credits_used || 0
    return acc
  }, {})

  const popular_packages = Object.entries(packageGroups)
    .map(([name, data]: [string, any]) => ({ name, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // Group by day for trends
  const dailyGroups = usageData.reduce((acc, item) => {
    const date = new Date(item.created_at).toISOString().split('T')[0]
    if (!acc[date]) {
      acc[date] = { count: 0, credits: 0 }
    }
    acc[date].count++
    acc[date].credits += item.credits_used || 0
    return acc
  }, {})

  const daily_trends = Object.entries(dailyGroups)
    .map(([date, data]: [string, any]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return {
    total_usage,
    total_credits,
    success_rate: Math.round(success_rate * 100) / 100,
    avg_generations: Math.round(avg_generations * 100) / 100,
    popular_packages,
    daily_trends
  }
}

// Helper function to calculate theme metrics
function calculateThemeMetrics(analyticsData: any[]) {
  if (!analyticsData.length) {
    return []
  }

  const themeGroups = analyticsData.reduce((acc, item) => {
    const themeName = item.theme?.name || 'Unknown'
    if (!acc[themeName]) {
      acc[themeName] = {
        name: themeName,
        usage_count: 0,
        total_ratings: 0,
        rating_count: 0,
        total_processing_time: 0,
        processing_count: 0
      }
    }
    acc[themeName].usage_count += item.generation_count || 1
    if (item.user_rating) {
      acc[themeName].total_ratings += item.user_rating
      acc[themeName].rating_count++
    }
    if (item.processing_time_ms) {
      acc[themeName].total_processing_time += item.processing_time_ms
      acc[themeName].processing_count++
    }
    return acc
  }, {})

  return Object.values(themeGroups).map((theme: any) => ({
    ...theme,
    avg_rating: theme.rating_count > 0 ? Math.round((theme.total_ratings / theme.rating_count) * 100) / 100 : null,
    avg_processing_time: theme.processing_count > 0 ? Math.round(theme.total_processing_time / theme.processing_count) : null
  })).sort((a: any, b: any) => b.usage_count - a.usage_count)
}

// Helper function to calculate revenue metrics
function calculateRevenueMetrics(revenueData: any[]) {
  if (!revenueData.length) {
    return {
      total_revenue_cents: 0,
      total_transactions: 0,
      avg_transaction_value: 0,
      revenue_by_package: [],
      daily_revenue: []
    }
  }

  const total_transactions = revenueData.length
  const total_revenue_cents = revenueData.reduce((sum, item) => {
    return sum + (item.tier?.price_cents || 0)
  }, 0)
  const avg_transaction_value = total_revenue_cents / total_transactions

  // Group by package
  const packageRevenue = revenueData.reduce((acc, item) => {
    const packageName = item.package?.name || 'Unknown'
    if (!acc[packageName]) {
      acc[packageName] = { revenue: 0, transactions: 0 }
    }
    acc[packageName].revenue += item.tier?.price_cents || 0
    acc[packageName].transactions++
    return acc
  }, {})

  const revenue_by_package = Object.entries(packageRevenue)
    .map(([name, data]: [string, any]) => ({ name, ...data }))
    .sort((a, b) => b.revenue - a.revenue)

  // Group by day
  const dailyRevenue = revenueData.reduce((acc, item) => {
    const date = new Date(item.created_at).toISOString().split('T')[0]
    if (!acc[date]) {
      acc[date] = { revenue: 0, transactions: 0 }
    }
    acc[date].revenue += item.tier?.price_cents || 0
    acc[date].transactions++
    return acc
  }, {})

  const daily_revenue = Object.entries(dailyRevenue)
    .map(([date, data]: [string, any]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return {
    total_revenue_cents,
    total_transactions,
    avg_transaction_value: Math.round(avg_transaction_value),
    revenue_by_package,
    daily_revenue
  }
}