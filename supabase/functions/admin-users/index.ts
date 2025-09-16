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
    // Initialize Supabase client with service role for user management
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
    const pathSegments = url.pathname.split('/').filter(Boolean)
    const userId = pathSegments[pathSegments.length - 1]
    const method = req.method

    // Route to appropriate handler based on method and path
    switch (method) {
      case 'GET':
        if (userId && userId !== 'admin-users') {
          return await handleGetUser(supabase, userId, adminUser)
        } else {
          return await handleGetUsers(supabase, url.searchParams, adminUser)
        }

      case 'POST':
        return await handleCreateUser(supabase, req, adminUser)

      case 'PUT':
        if (!userId || userId === 'admin-users') {
          return new Response(JSON.stringify({ error: 'User ID required for update' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
        return await handleUpdateUser(supabase, req, userId, adminUser)

      case 'DELETE':
        if (!userId || userId === 'admin-users') {
          return new Response(JSON.stringify({ error: 'User ID required for deletion' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
        return await handleDeleteUser(supabase, userId, adminUser)

      default:
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
  } catch (error) {
    console.error('Admin Users Error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

// Get multiple users with filtering, pagination, and sorting
async function handleGetUsers(supabase: any, params: URLSearchParams, adminUser: AdminUser) {
  try {
    const page = parseInt(params.get('page') || '1')
    const limit = Math.min(parseInt(params.get('limit') || '50'), 100) // Max 100
    const search = params.get('search')
    const sortBy = params.get('sortBy') || 'created_at'
    const sortOrder = params.get('sortOrder') || 'desc'
    const status = params.get('status') // 'active', 'inactive', 'suspended'
    const hasCredits = params.get('hasCredits') // 'true', 'false'
    const dateFrom = params.get('dateFrom')
    const dateTo = params.get('dateTo')
    
    const offset = (page - 1) * limit

    // Build the query
    let query = supabase
      .from('users')
      .select(`
        *,
        user_credits (*),
        credit_transactions!credit_transactions_user_id_fkey (
          id,
          type,
          amount,
          created_at,
          description
        ),
        referrals!referrals_referrer_user_id_fkey (
          id,
          status,
          credits_earned
        ),
        user_activity_logs!user_activity_logs_user_id_fkey (
          activity_type,
          timestamp
        )
      `, { count: 'exact' })

    // Apply search filter
    if (search) {
      query = query.or(`email.ilike.%${search}%,display_name.ilike.%${search}%,id.eq.${search}`)
    }

    // Apply date range filter
    if (dateFrom) {
      query = query.gte('created_at', dateFrom)
    }
    if (dateTo) {
      query = query.lte('created_at', dateTo)
    }

    // Apply sorting and pagination
    const { data: users, error, count } = await query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching users:', error)
      throw error
    }

    // Post-process users to add computed fields and filter by credits if needed
    const processedUsers = users?.map(user => {
      const credits = user.user_credits
      const totalCredits = (credits?.paid_credits || 0) + (credits?.bonus_credits || 0)
      const activityLogs = user.user_activity_logs || []
      
      return {
        ...user,
        totalCredits,
        lastActivity: activityLogs.length > 0 ? 
          Math.max(...activityLogs.map((log: any) => new Date(log.timestamp).getTime())) : null,
        isActive: activityLogs.some((log: any) => 
          new Date(log.timestamp) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        ),
        purchaseCount: user.credit_transactions?.filter((t: any) => t.type === 'purchase').length || 0,
        referralCount: user.referrals?.filter((r: any) => r.status === 'completed').length || 0
      }
    }).filter(user => {
      // Apply post-processing filters
      if (hasCredits === 'true' && user.totalCredits === 0) return false
      if (hasCredits === 'false' && user.totalCredits > 0) return false
      if (status === 'active' && !user.isActive) return false
      if (status === 'inactive' && user.isActive) return false
      return true
    }) || []

    // Calculate summary statistics
    const stats = calculateUserStats(processedUsers)

    return new Response(JSON.stringify({
      users: processedUsers,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      },
      stats
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Get users error:', error)
    return new Response(JSON.stringify({ error: 'Failed to fetch users' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}

// Get single user with detailed information
async function handleGetUser(supabase: any, userId: string, adminUser: AdminUser) {
  try {
    // Get user details
    const { data: user, error: userError } = await supabase
      .from('users')
      .select(`
        *,
        user_credits (*),
        credit_transactions (
          id,
          type,
          amount,
          balance_after,
          description,
          stripe_payment_id,
          created_at
        ),
        referrals!referrals_referrer_user_id_fkey (
          id,
          referred_email,
          referred_user_id,
          status,
          credits_earned,
          created_at
        ),
        user_activity_logs (
          id,
          activity_type,
          activity_data,
          ip_address,
          timestamp
        )
      `)
      .eq('id', userId)
      .single()

    if (userError) {
      if (userError.code === 'PGRST116') {
        return new Response(JSON.stringify({ error: 'User not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      throw userError
    }

    // Get payment history from Stripe
    const { data: paymentHistory } = await supabase
      .from('payment_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    // Get usage analytics
    const { data: usageData } = await supabase
      .from('usage_analytics')
      .select('*')
      .eq('session_id', userId) // Assuming session_id can be used to track user
      .order('timestamp', { ascending: false })
      .limit(50)

    // Calculate user metrics
    const credits = user.user_credits
    const totalCredits = (credits?.paid_credits || 0) + (credits?.bonus_credits || 0)
    const totalSpent = paymentHistory?.reduce((sum: number, payment: any) => 
      sum + (payment.status === 'succeeded' ? payment.amount : 0), 0
    ) || 0

    const enhancedUser = {
      ...user,
      totalCredits,
      totalSpent,
      paymentHistory: paymentHistory || [],
      usageAnalytics: usageData || [],
      metrics: {
        totalPurchases: user.credit_transactions?.filter((t: any) => t.type === 'purchase').length || 0,
        totalUsage: Math.abs(user.credit_transactions?.filter((t: any) => t.type === 'usage')
          .reduce((sum: number, t: any) => sum + t.amount, 0)) || 0,
        successfulReferrals: user.referrals?.filter((r: any) => r.status === 'completed').length || 0,
        lastActivity: user.user_activity_logs?.length > 0 ? 
          user.user_activity_logs[0].timestamp : null,
        joinDate: user.created_at,
        generationsCount: usageData?.length || 0
      }
    }

    return new Response(JSON.stringify(enhancedUser), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Get user error:', error)
    return new Response(JSON.stringify({ error: 'Failed to fetch user details' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}

// Create new user (admin only)
async function handleCreateUser(supabase: any, req: Request, adminUser: AdminUser) {
  try {
    if (!['super_admin', 'admin'].includes(adminUser.role)) {
      return new Response(JSON.stringify({ error: 'Insufficient permissions' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const userData = await req.json()
    const { email, password, display_name, initial_credits = 0 } = userData

    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Email and password are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Create user in auth.users
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        display_name: display_name || ''
      }
    })

    if (authError) {
      console.error('Auth user creation error:', authError)
      throw authError
    }

    // The trigger should automatically create the user profile and credits
    // Wait a moment for the trigger to complete
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Add initial credits if specified
    if (initial_credits > 0) {
      await supabase.rpc('add_paid_credits', {
        p_user_id: authUser.user.id,
        p_credits: initial_credits,
        p_stripe_payment_id: null,
        p_description: 'Admin granted credits'
      })
    }

    // Log the user creation activity
    await supabase
      .from('user_activity_logs')
      .insert({
        user_id: authUser.user.id,
        activity_type: 'admin_created',
        activity_data: {
          created_by: adminUser.user_id,
          initial_credits
        }
      })

    // Fetch the complete user data to return
    const { data: newUser } = await supabase
      .from('users')
      .select(`
        *,
        user_credits (*)
      `)
      .eq('id', authUser.user.id)
      .single()

    return new Response(JSON.stringify({
      message: 'User created successfully',
      user: newUser
    }), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Create user error:', error)
    return new Response(JSON.stringify({ error: 'Failed to create user' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}

// Update user (admin only)
async function handleUpdateUser(supabase: any, req: Request, userId: string, adminUser: AdminUser) {
  try {
    if (!['super_admin', 'admin'].includes(adminUser.role)) {
      return new Response(JSON.stringify({ error: 'Insufficient permissions' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const updates = await req.json()
    const { display_name, email, credits_adjustment, note } = updates

    // Update user profile
    const userUpdates: any = {}
    if (display_name !== undefined) userUpdates.display_name = display_name

    let updatedUser = null
    if (Object.keys(userUpdates).length > 0) {
      const { data, error } = await supabase
        .from('users')
        .update(userUpdates)
        .eq('id', userId)
        .select()
        .single()

      if (error) throw error
      updatedUser = data
    }

    // Update auth.users if email changed
    if (email && email !== updatedUser?.email) {
      const { error: authError } = await supabase.auth.admin.updateUserById(userId, {
        email
      })
      
      if (authError) {
        console.error('Auth email update error:', authError)
        // Don't fail the entire operation for auth update errors
      } else {
        // Update email in users table too
        await supabase
          .from('users')
          .update({ email })
          .eq('id', userId)
      }
    }

    // Handle credits adjustment
    if (credits_adjustment && credits_adjustment !== 0) {
      const adjustmentType = credits_adjustment > 0 ? 'bonus' : 'admin_adjustment'
      
      if (credits_adjustment > 0) {
        // Add bonus credits
        await supabase.rpc('add_paid_credits', {
          p_user_id: userId,
          p_credits: credits_adjustment,
          p_stripe_payment_id: null,
          p_description: `Admin adjustment: ${note || 'No note provided'}`
        })
      } else {
        // Deduct credits
        const { data: currentCredits } = await supabase
          .from('user_credits')
          .select('paid_credits, bonus_credits')
          .eq('user_id', userId)
          .single()

        if (currentCredits) {
          const totalCredits = currentCredits.paid_credits + currentCredits.bonus_credits
          const newTotal = Math.max(0, totalCredits + credits_adjustment)
          
          // Adjust bonus credits first, then paid credits if needed
          let newBonusCredits = currentCredits.bonus_credits
          let newPaidCredits = currentCredits.paid_credits
          
          const reduction = Math.abs(credits_adjustment)
          if (newBonusCredits >= reduction) {
            newBonusCredits -= reduction
          } else {
            const remainingReduction = reduction - newBonusCredits
            newBonusCredits = 0
            newPaidCredits = Math.max(0, newPaidCredits - remainingReduction)
          }

          await supabase
            .from('user_credits')
            .update({
              paid_credits: newPaidCredits,
              bonus_credits: newBonusCredits
            })
            .eq('user_id', userId)

          // Log the adjustment
          await supabase
            .from('credit_transactions')
            .insert({
              user_id: userId,
              type: 'admin_adjustment',
              amount: credits_adjustment,
              balance_after: newPaidCredits + newBonusCredits,
              description: `Admin adjustment: ${note || 'No note provided'}`
            })
        }
      }
    }

    // Log the user update activity
    await supabase
      .from('user_activity_logs')
      .insert({
        user_id: userId,
        activity_type: 'admin_updated',
        activity_data: {
          updated_by: adminUser.user_id,
          changes: updates,
          note
        }
      })

    // Fetch updated user data
    const { data: finalUser } = await supabase
      .from('users')
      .select(`
        *,
        user_credits (*)
      `)
      .eq('id', userId)
      .single()

    return new Response(JSON.stringify({
      message: 'User updated successfully',
      user: finalUser
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Update user error:', error)
    return new Response(JSON.stringify({ error: 'Failed to update user' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}

// Delete user (super admin only)
async function handleDeleteUser(supabase: any, userId: string, adminUser: AdminUser) {
  try {
    if (adminUser.role !== 'super_admin') {
      return new Response(JSON.stringify({ error: 'Only super admins can delete users' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Prevent self-deletion
    if (userId === adminUser.user_id) {
      return new Response(JSON.stringify({ error: 'Cannot delete your own account' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Check if user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (userError) {
      if (userError.code === 'PGRST116') {
        return new Response(JSON.stringify({ error: 'User not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      throw userError
    }

    // Log the deletion before actually deleting
    await supabase
      .from('user_activity_logs')
      .insert({
        user_id: userId,
        activity_type: 'admin_deleted',
        activity_data: {
          deleted_by: adminUser.user_id,
          user_email: user.email,
          deletion_timestamp: new Date().toISOString()
        }
      })

    // Delete from auth.users (this will cascade to other tables)
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userId)
    
    if (authDeleteError) {
      console.error('Auth user deletion error:', authDeleteError)
      throw authDeleteError
    }

    return new Response(JSON.stringify({
      message: 'User deleted successfully',
      deletedUserId: userId
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Delete user error:', error)
    return new Response(JSON.stringify({ error: 'Failed to delete user' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}

// Helper function to calculate user statistics
function calculateUserStats(users: any[]) {
  return {
    totalUsers: users.length,
    activeUsers: users.filter(u => u.isActive).length,
    paidUsers: users.filter(u => u.purchaseCount > 0).length,
    totalCredits: users.reduce((sum, u) => sum + u.totalCredits, 0),
    totalPurchases: users.reduce((sum, u) => sum + u.purchaseCount, 0),
    totalReferrals: users.reduce((sum, u) => sum + u.referralCount, 0),
    averageCredits: users.length > 0 ? 
      users.reduce((sum, u) => sum + u.totalCredits, 0) / users.length : 0
  }
}