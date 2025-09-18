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

    console.log('Admin dashboard request from:', user.email)

    // Get date ranges
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    // Parallel data fetching for efficiency
    const [
      { count: totalUsers },
      { count: activeUsers }, 
      { count: totalGenerations },
      { data: purchaseTransactions },
      { data: recentUsers },
      { data: recentGenerations },
      { data: recentRevenue },
      { data: styleData },
      { data: recentTransactions },
      { data: waitlistEntries }
    ] = await Promise.all([
      // Basic metrics
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('users')
        .select('*', { count: 'exact', head: true })
        .gte('last_login', sevenDaysAgo.toISOString()),
      supabase.from('usage_analytics').select('*', { count: 'exact', head: true }),
      supabase.from('credit_transactions')
        .select('amount, user_id')
        .eq('type', 'purchase'),

      // Daily trends data (last 30 days)
      supabase.from('users')
        .select('created_at')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: true }),
      
      supabase.from('usage_analytics')
        .select('timestamp')
        .gte('timestamp', thirtyDaysAgo.toISOString())
        .order('timestamp', { ascending: true }),

      supabase.from('credit_transactions')
        .select('amount, created_at')
        .eq('type', 'purchase')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: true }),

      // Style distribution
      supabase.from('usage_analytics')
        .select('theme')
        .not('theme', 'is', null),

      // Recent activity (last 24 hours with user info)
      supabase.from('credit_transactions')
        .select('*')
        .gte('created_at', oneDayAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(15),

      // Recent waitlist entries
      supabase.from('waitlist')
        .select('email, created_at')
        .gte('created_at', oneDayAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(5)
    ])

    // Calculate basic metrics
    const totalRevenue = purchaseTransactions?.reduce((sum, t) => sum + (t.amount / 10), 0) || 0
    const uniquePayingUsers = new Set(purchaseTransactions?.map(t => t.user_id) || []).size
    const conversionRate = totalUsers > 0 ? (uniquePayingUsers / totalUsers * 100) : 0

    // Helper function to format time ago
    function formatTimeAgo(date: Date): string {
      const diff = now.getTime() - date.getTime()
      const minutes = Math.floor(diff / 60000)
      const hours = Math.floor(diff / 3600000)
      const days = Math.floor(diff / 86400000)

      if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`
      if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`
      if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
      return 'Just now'
    }

    // 1. DAILY TRENDS (30 days)
    const daily = Array.from({ length: 30 }, (_, i) => {
      const date = new Date(thirtyDaysAgo.getTime() + i * 24 * 60 * 60 * 1000)
      const dateStr = date.toISOString().split('T')[0]
      
      const usersCount = recentUsers?.filter(u => 
        u.created_at.split('T')[0] === dateStr
      ).length || 0
      
      const generationsCount = recentGenerations?.filter(g => 
        g.timestamp.split('T')[0] === dateStr
      ).length || 0
      
      const revenueAmount = recentRevenue?.filter(r => 
        r.created_at.split('T')[0] === dateStr
      ).reduce((sum, r) => sum + (r.amount / 10), 0) || 0

      return {
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        users: usersCount,
        generations: generationsCount,
        revenue: revenueAmount
      }
    })

    // 2. STYLE DISTRIBUTION
    const themeCounts: Record<string, number> = {}
    styleData?.forEach(s => {
      if (s.theme) {
        themeCounts[s.theme] = (themeCounts[s.theme] || 0) + 1
      }
    })

    const sortedThemes = Object.entries(themeCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 6)

    const colors = ['#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#3B82F6', '#EF4444']
    
    const styleDistribution = sortedThemes.map(([theme, count], index) => ({
      name: theme,
      value: count,
      color: colors[index] || '#9CA3AF'
    }))

    const otherCount = Object.entries(themeCounts)
      .slice(6)
      .reduce((sum, [, count]) => sum + count, 0)
    
    if (otherCount > 0) {
      styleDistribution.push({
        name: 'Other',
        value: otherCount,
        color: '#6B7280'
      })
    }

    // 3. RECENT ACTIVITY (Real data from transactions + waitlist)
    const recentActivities = []

    // Get user emails for recent transactions
    if (recentTransactions && recentTransactions.length > 0) {
      const userIds = [...new Set(recentTransactions.map(t => t.user_id).filter(Boolean))]
      const { data: users } = await supabase
        .from('users')
        .select('id, email, display_name')
        .in('id', userIds)

      const userMap = new Map(users?.map(u => [u.id, u]) || [])

      // Add recent credit transactions
      recentTransactions.forEach(transaction => {
        const user = userMap.get(transaction.user_id)
        let action = ''
        let style = ''
        
        switch (transaction.type) {
          case 'purchase':
            action = 'Purchased credits'
            style = `${transaction.amount} credits`
            break
          case 'usage':
            action = 'Generated wedding portrait'
            style = 'AI Generation'
            break
          case 'bonus':
            action = 'Received bonus credits'
            style = `${transaction.amount} credits`
            break
          default:
            action = transaction.description || 'Unknown activity'
            style = transaction.type
        }

        recentActivities.push({
          user: user?.email || 'Unknown user',
          action,
          style,
          time: formatTimeAgo(new Date(transaction.created_at)),
          credits: transaction.type === 'usage' ? -Math.abs(transaction.amount) : transaction.amount,
          timestamp: transaction.created_at
        })
      })
    }

    // Add recent waitlist entries
    waitlistEntries?.forEach(entry => {
      recentActivities.push({
        user: entry.email,
        action: 'Joined waitlist',
        style: 'Early adopter',
        time: formatTimeAgo(new Date(entry.created_at)),
        credits: 0,
        timestamp: entry.created_at
      })
    })

    // Sort by timestamp and limit to 8 most recent
    recentActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    // 4. SYSTEM STATUS
    const systemStatus = {
      apiStatus: 'operational',
      databaseStatus: 'healthy',
      aiProcessingQueue: Math.floor(Math.random() * 5), // Mock queue size
      totalApiCalls: totalGenerations || 0,
      lastUpdate: now.toISOString()
    }

    const dashboardData = {
      // Basic metrics
      metrics: {
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
        totalGenerations: totalGenerations || 0,
        totalRevenue: Number(totalRevenue.toFixed(2)),
        conversionRate: Number(conversionRate.toFixed(2))
      },
      
      // Chart data
      chartData: {
        daily,
        styleDistribution,
        userActivity: [] // Can be implemented later if needed
      },
      
      // Recent activity
      recentActivity: recentActivities.slice(0, 8),
      
      // System status
      systemStatus,

      // Debug info
      debug: {
        queriedAt: now.toISOString(),
        datasetSizes: {
          totalUsers,
          totalGenerations,
          purchaseTransactions: purchaseTransactions?.length || 0,
          styleData: styleData?.length || 0,
          recentTransactions: recentTransactions?.length || 0,
          waitlistEntries: waitlistEntries?.length || 0
        }
      }
    }

    console.log('Returning dashboard data with', Object.keys(dashboardData).length, 'sections')

    return new Response(
      JSON.stringify(dashboardData),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in admin-dashboard-simple function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})