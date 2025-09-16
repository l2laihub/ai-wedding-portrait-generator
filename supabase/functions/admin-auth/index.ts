import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

    const url = new URL(req.url)
    const action = url.pathname.split('/').pop()

    switch (action) {
      case 'login':
        return await handleAdminLogin(supabase, req)
      
      case 'verify':
        return await handleVerifyAdmin(supabase, req)
      
      case 'promote':
        return await handlePromoteUser(supabase, req)
      
      case 'demote':
        return await handleDemoteUser(supabase, req)
      
      case 'permissions':
        return await handleUpdatePermissions(supabase, req)
      
      case 'sessions':
        return await handleGetAdminSessions(supabase, req)
      
      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
  } catch (error) {
    console.error('Admin Auth Error:', error)
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

// Handle admin login and verification
async function handleAdminLogin(supabase: any, req: Request) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Email and password are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Authenticate with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (authError) {
      console.error('Auth error:', authError)
      return new Response(JSON.stringify({ 
        error: 'Invalid credentials' 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Check if user is an admin
    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select(`
        *,
        users!admin_users_user_id_fkey (
          email,
          display_name,
          created_at
        )
      `)
      .eq('user_id', authData.user.id)
      .single()

    if (adminError || !adminUser) {
      console.error('Admin check error:', adminError)
      
      // Sign out the user since they're not an admin
      await supabase.auth.signOut()
      
      return new Response(JSON.stringify({ 
        error: 'Access denied: Admin privileges required' 
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Log admin login activity
    await logAdminActivity(supabase, adminUser.user_id, 'admin_login', {
      login_timestamp: new Date().toISOString(),
      ip_address: req.headers.get('x-forwarded-for') || 'unknown'
    })

    // Return admin data and session info
    return new Response(JSON.stringify({
      success: true,
      admin: {
        id: adminUser.id,
        user_id: adminUser.user_id,
        email: adminUser.users.email,
        display_name: adminUser.users.display_name,
        role: adminUser.role,
        permissions: adminUser.permissions,
        created_at: adminUser.created_at
      },
      session: {
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
        expires_at: authData.session.expires_at
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Admin login error:', error)
    return new Response(JSON.stringify({ 
      error: 'Login failed',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}

// Verify admin session and return current admin data
async function handleVerifyAdmin(supabase: any, req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Verify the session
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid or expired session' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Get admin data
    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select(`
        *,
        users!admin_users_user_id_fkey (
          email,
          display_name,
          last_login
        )
      `)
      .eq('user_id', user.id)
      .single()

    if (adminError || !adminUser) {
      return new Response(JSON.stringify({ error: 'Admin privileges not found' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Update last login timestamp
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id)

    return new Response(JSON.stringify({
      valid: true,
      admin: {
        id: adminUser.id,
        user_id: adminUser.user_id,
        email: adminUser.users.email,
        display_name: adminUser.users.display_name,
        role: adminUser.role,
        permissions: adminUser.permissions,
        last_login: adminUser.users.last_login
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Verify admin error:', error)
    return new Response(JSON.stringify({ 
      error: 'Session verification failed',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}

// Promote user to admin (super admin only)
async function handlePromoteUser(supabase: any, req: Request) {
  try {
    const adminUser = await verifyAdminAccess(supabase, req, 'super_admin')
    if (!adminUser) {
      return new Response(JSON.stringify({ error: 'Super admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { user_id, role = 'admin', permissions = {} } = await req.json()

    if (!user_id) {
      return new Response(JSON.stringify({ error: 'user_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (!['admin', 'viewer'].includes(role)) {
      return new Response(JSON.stringify({ error: 'Invalid role' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Check if user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user_id)
      .single()

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Check if user is already an admin
    const { data: existingAdmin } = await supabase
      .from('admin_users')
      .select('*')
      .eq('user_id', user_id)
      .single()

    if (existingAdmin) {
      // Update existing admin
      const { data: updatedAdmin, error: updateError } = await supabase
        .from('admin_users')
        .update({
          role,
          permissions,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user_id)
        .select()
        .single()

      if (updateError) throw updateError

      await logAdminActivity(supabase, adminUser.user_id, 'admin_role_updated', {
        target_user_id: user_id,
        new_role: role,
        permissions
      })

      return new Response(JSON.stringify({
        success: true,
        message: 'Admin role updated',
        admin: updatedAdmin
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    } else {
      // Create new admin
      const { data: newAdmin, error: createError } = await supabase
        .from('admin_users')
        .insert({
          user_id,
          role,
          permissions,
          created_by: adminUser.id
        })
        .select()
        .single()

      if (createError) throw createError

      await logAdminActivity(supabase, adminUser.user_id, 'admin_promoted', {
        target_user_id: user_id,
        role,
        permissions
      })

      return new Response(JSON.stringify({
        success: true,
        message: 'User promoted to admin',
        admin: newAdmin
      }), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
  } catch (error) {
    console.error('Promote user error:', error)
    return new Response(JSON.stringify({ 
      error: 'Failed to promote user',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}

// Demote admin user (super admin only)
async function handleDemoteUser(supabase: any, req: Request) {
  try {
    const adminUser = await verifyAdminAccess(supabase, req, 'super_admin')
    if (!adminUser) {
      return new Response(JSON.stringify({ error: 'Super admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { user_id } = await req.json()

    if (!user_id) {
      return new Response(JSON.stringify({ error: 'user_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Prevent self-demotion
    if (user_id === adminUser.user_id) {
      return new Response(JSON.stringify({ error: 'Cannot demote yourself' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Remove admin privileges
    const { error: deleteError } = await supabase
      .from('admin_users')
      .delete()
      .eq('user_id', user_id)

    if (deleteError) throw deleteError

    await logAdminActivity(supabase, adminUser.user_id, 'admin_demoted', {
      target_user_id: user_id
    })

    return new Response(JSON.stringify({
      success: true,
      message: 'Admin privileges removed'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Demote user error:', error)
    return new Response(JSON.stringify({ 
      error: 'Failed to demote user',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}

// Update admin permissions
async function handleUpdatePermissions(supabase: any, req: Request) {
  try {
    const adminUser = await verifyAdminAccess(supabase, req, 'super_admin')
    if (!adminUser) {
      return new Response(JSON.stringify({ error: 'Super admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { user_id, permissions } = await req.json()

    if (!user_id || !permissions) {
      return new Response(JSON.stringify({ error: 'user_id and permissions are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { data: updatedAdmin, error } = await supabase
      .from('admin_users')
      .update({
        permissions,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user_id)
      .select()
      .single()

    if (error) throw error

    await logAdminActivity(supabase, adminUser.user_id, 'admin_permissions_updated', {
      target_user_id: user_id,
      new_permissions: permissions
    })

    return new Response(JSON.stringify({
      success: true,
      message: 'Permissions updated',
      admin: updatedAdmin
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Update permissions error:', error)
    return new Response(JSON.stringify({ 
      error: 'Failed to update permissions',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}

// Get admin sessions and activity
async function handleGetAdminSessions(supabase: any, req: Request) {
  try {
    const adminUser = await verifyAdminAccess(supabase, req)
    if (!adminUser) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Get admin users with recent activity
    const { data: admins, error: adminsError } = await supabase
      .from('admin_users')
      .select(`
        *,
        users!admin_users_user_id_fkey (
          email,
          display_name,
          last_login
        )
      `)
      .order('created_at', { ascending: false })

    if (adminsError) throw adminsError

    // Get recent admin activities
    const { data: activities, error: activitiesError } = await supabase
      .from('user_activity_logs')
      .select(`
        *,
        users!user_activity_logs_user_id_fkey (
          email,
          display_name
        )
      `)
      .in('activity_type', ['admin_login', 'admin_promoted', 'admin_demoted', 'admin_permissions_updated'])
      .order('timestamp', { ascending: false })
      .limit(50)

    if (activitiesError) throw activitiesError

    return new Response(JSON.stringify({
      admins: admins || [],
      recentActivities: activities || []
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Get admin sessions error:', error)
    return new Response(JSON.stringify({ 
      error: 'Failed to fetch admin sessions',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}

// Helper function to verify admin access
async function verifyAdminAccess(supabase: any, req: Request, requiredRole?: string): Promise<AdminUser | null> {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) return null

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) return null

    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (adminError || !adminUser) return null

    // Check role requirements
    if (requiredRole) {
      if (requiredRole === 'super_admin' && adminUser.role !== 'super_admin') {
        return null
      }
      if (requiredRole === 'admin' && !['super_admin', 'admin'].includes(adminUser.role)) {
        return null
      }
    }

    return adminUser
  } catch (error) {
    console.error('Verify admin access error:', error)
    return null
  }
}

// Helper function to log admin activities
async function logAdminActivity(supabase: any, userId: string, activityType: string, activityData: any) {
  try {
    await supabase
      .from('user_activity_logs')
      .insert({
        user_id: userId,
        activity_type: activityType,
        activity_data: activityData,
        timestamp: new Date().toISOString()
      })
  } catch (error) {
    console.error('Error logging admin activity:', error)
  }
}