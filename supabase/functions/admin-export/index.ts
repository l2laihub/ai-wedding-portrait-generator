import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
}

interface AdminUser {
  id: string;
  user_id: string;
  role: 'super_admin' | 'admin' | 'viewer';
  permissions: Record<string, boolean>;
}

interface ExportRequest {
  type: 'users' | 'transactions' | 'analytics' | 'payments' | 'activity_logs';
  format: 'csv' | 'json' | 'excel';
  filters?: {
    date_from?: string;
    date_to?: string;
    user_status?: string;
    payment_status?: string;
    activity_type?: string;
    limit?: number;
  };
  columns?: string[];
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

    // Verify admin authentication
    const adminUser = await verifyAdminAccess(supabase, req)
    if (!adminUser) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const url = new URL(req.url)
    const action = url.pathname.split('/').pop()

    switch (action) {
      case 'export':
        return await handleExport(supabase, req, adminUser)
      
      case 'templates':
        return await handleGetExportTemplates(supabase)
      
      case 'history':
        return await handleExportHistory(supabase, adminUser)
      
      case 'download':
        return await handleDownloadExport(supabase, url.searchParams, adminUser)
      
      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
  } catch (error) {
    console.error('Export API Error:', error)
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

// Handle data export requests
async function handleExport(supabase: any, req: Request, adminUser: AdminUser) {
  try {
    const exportRequest: ExportRequest = await req.json()
    const { type, format, filters = {}, columns } = exportRequest

    // Validate export request
    if (!['users', 'transactions', 'analytics', 'payments', 'activity_logs'].includes(type)) {
      return new Response(JSON.stringify({ error: 'Invalid export type' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (!['csv', 'json', 'excel'].includes(format)) {
      return new Response(JSON.stringify({ error: 'Invalid export format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Get data based on type
    let data: any[] = []
    let filename = ''

    switch (type) {
      case 'users':
        const result = await exportUsers(supabase, filters, columns)
        data = result.data
        filename = `users_export_${new Date().toISOString().split('T')[0]}`
        break

      case 'transactions':
        const txResult = await exportTransactions(supabase, filters, columns)
        data = txResult.data
        filename = `transactions_export_${new Date().toISOString().split('T')[0]}`
        break

      case 'analytics':
        const analyticsResult = await exportAnalytics(supabase, filters, columns)
        data = analyticsResult.data
        filename = `analytics_export_${new Date().toISOString().split('T')[0]}`
        break

      case 'payments':
        const paymentsResult = await exportPayments(supabase, filters, columns)
        data = paymentsResult.data
        filename = `payments_export_${new Date().toISOString().split('T')[0]}`
        break

      case 'activity_logs':
        const activityResult = await exportActivityLogs(supabase, filters, columns)
        data = activityResult.data
        filename = `activity_export_${new Date().toISOString().split('T')[0]}`
        break
    }

    if (!data || data.length === 0) {
      return new Response(JSON.stringify({ 
        error: 'No data found for export criteria' 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Log the export
    const { data: exportLog, error: logError } = await supabase
      .from('export_logs')
      .insert({
        exported_by: adminUser.id,
        export_type: type,
        export_format: format,
        filters,
        row_count: data.length,
        file_size: JSON.stringify(data).length
      })
      .select()
      .single()

    if (logError) {
      console.error('Failed to log export:', logError)
    }

    // Format and return data
    const responseData = await formatExportData(data, format, filename)
    
    return new Response(responseData.content, {
      headers: {
        ...corsHeaders,
        'Content-Type': responseData.contentType,
        'Content-Disposition': `attachment; filename="${filename}.${format}"`,
        'X-Export-Id': exportLog?.id || 'unknown'
      }
    })
  } catch (error) {
    console.error('Export error:', error)
    return new Response(JSON.stringify({ 
      error: 'Export failed',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}

// Export users data
async function exportUsers(supabase: any, filters: any, columns?: string[]) {
  let query = supabase
    .from('user_summary')
    .select('*')

  // Apply filters
  if (filters.date_from) {
    query = query.gte('created_at', filters.date_from)
  }
  if (filters.date_to) {
    query = query.lte('created_at', filters.date_to)
  }
  if (filters.user_status) {
    query = query.eq('user_status', filters.user_status)
  }

  // Apply limit
  const limit = Math.min(filters.limit || 10000, 50000) // Max 50k records
  query = query.limit(limit)

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) throw error

  // Filter columns if specified
  if (columns && columns.length > 0) {
    return {
      data: data?.map(row => 
        Object.fromEntries(
          columns.filter(col => col in row).map(col => [col, row[col]])
        )
      ) || []
    }
  }

  return { data: data || [] }
}

// Export transactions data
async function exportTransactions(supabase: any, filters: any, columns?: string[]) {
  let query = supabase
    .from('credit_transactions')
    .select(`
      *,
      users!credit_transactions_user_id_fkey (
        email,
        display_name
      )
    `)

  // Apply filters
  if (filters.date_from) {
    query = query.gte('created_at', filters.date_from)
  }
  if (filters.date_to) {
    query = query.lte('created_at', filters.date_to)
  }

  const limit = Math.min(filters.limit || 10000, 50000)
  query = query.limit(limit)

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) throw error

  // Flatten user data
  const flattenedData = data?.map(row => ({
    ...row,
    user_email: row.users?.email,
    user_display_name: row.users?.display_name,
    users: undefined
  })) || []

  if (columns && columns.length > 0) {
    return {
      data: flattenedData.map(row => 
        Object.fromEntries(
          columns.filter(col => col in row).map(col => [col, row[col]])
        )
      )
    }
  }

  return { data: flattenedData }
}

// Export analytics data
async function exportAnalytics(supabase: any, filters: any, columns?: string[]) {
  let query = supabase
    .from('analytics_summary')
    .select('*')

  // Apply filters
  if (filters.date_from) {
    query = query.gte('date', filters.date_from)
  }
  if (filters.date_to) {
    query = query.lte('date', filters.date_to)
  }

  const limit = Math.min(filters.limit || 10000, 50000)
  query = query.limit(limit)

  const { data, error } = await query.order('date', { ascending: false })

  if (error) throw error

  if (columns && columns.length > 0) {
    return {
      data: data?.map(row => 
        Object.fromEntries(
          columns.filter(col => col in row).map(col => [col, row[col]])
        )
      ) || []
    }
  }

  return { data: data || [] }
}

// Export payments data
async function exportPayments(supabase: any, filters: any, columns?: string[]) {
  let query = supabase
    .from('payment_summary')
    .select('*')

  // Apply filters
  if (filters.date_from) {
    query = query.gte('created_at', filters.date_from)
  }
  if (filters.date_to) {
    query = query.lte('created_at', filters.date_to)
  }
  if (filters.payment_status) {
    query = query.eq('status', filters.payment_status)
  }

  const limit = Math.min(filters.limit || 10000, 50000)
  query = query.limit(limit)

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) throw error

  if (columns && columns.length > 0) {
    return {
      data: data?.map(row => 
        Object.fromEntries(
          columns.filter(col => col in row).map(col => [col, row[col]])
        )
      ) || []
    }
  }

  return { data: data || [] }
}

// Export activity logs data
async function exportActivityLogs(supabase: any, filters: any, columns?: string[]) {
  let query = supabase
    .from('user_activity_logs')
    .select(`
      *,
      users!user_activity_logs_user_id_fkey (
        email,
        display_name
      )
    `)

  // Apply filters
  if (filters.date_from) {
    query = query.gte('timestamp', filters.date_from)
  }
  if (filters.date_to) {
    query = query.lte('timestamp', filters.date_to)
  }
  if (filters.activity_type) {
    query = query.eq('activity_type', filters.activity_type)
  }

  const limit = Math.min(filters.limit || 10000, 50000)
  query = query.limit(limit)

  const { data, error } = await query.order('timestamp', { ascending: false })

  if (error) throw error

  // Flatten user data
  const flattenedData = data?.map(row => ({
    ...row,
    user_email: row.users?.email,
    user_display_name: row.users?.display_name,
    users: undefined
  })) || []

  if (columns && columns.length > 0) {
    return {
      data: flattenedData.map(row => 
        Object.fromEntries(
          columns.filter(col => col in row).map(col => [col, row[col]])
        )
      )
    }
  }

  return { data: flattenedData }
}

// Get export templates (available fields for each export type)
async function handleGetExportTemplates(supabase: any) {
  const templates = {
    users: {
      name: 'Users Export',
      description: 'Export user data with credits and activity summary',
      fields: [
        { key: 'id', label: 'User ID', type: 'string' },
        { key: 'email', label: 'Email', type: 'string' },
        { key: 'display_name', label: 'Display Name', type: 'string' },
        { key: 'created_at', label: 'Registration Date', type: 'datetime' },
        { key: 'last_login', label: 'Last Login', type: 'datetime' },
        { key: 'total_credits', label: 'Total Credits', type: 'number' },
        { key: 'paid_credits', label: 'Paid Credits', type: 'number' },
        { key: 'bonus_credits', label: 'Bonus Credits', type: 'number' },
        { key: 'total_purchases', label: 'Total Purchases', type: 'number' },
        { key: 'total_spent', label: 'Total Spent (cents)', type: 'number' },
        { key: 'total_generations', label: 'Total Generations', type: 'number' },
        { key: 'user_status', label: 'User Status', type: 'string' },
        { key: 'lifetime_value', label: 'Lifetime Value (cents)', type: 'number' }
      ],
      filters: [
        { key: 'date_from', label: 'Registration From', type: 'date' },
        { key: 'date_to', label: 'Registration To', type: 'date' },
        { key: 'user_status', label: 'User Status', type: 'select', options: ['active', 'inactive', 'never_logged_in', 'dormant'] },
        { key: 'limit', label: 'Limit', type: 'number', max: 50000 }
      ]
    },
    transactions: {
      name: 'Credit Transactions Export',
      description: 'Export all credit transactions with user details',
      fields: [
        { key: 'id', label: 'Transaction ID', type: 'string' },
        { key: 'user_email', label: 'User Email', type: 'string' },
        { key: 'type', label: 'Transaction Type', type: 'string' },
        { key: 'amount', label: 'Amount', type: 'number' },
        { key: 'balance_after', label: 'Balance After', type: 'number' },
        { key: 'description', label: 'Description', type: 'string' },
        { key: 'stripe_payment_id', label: 'Stripe Payment ID', type: 'string' },
        { key: 'created_at', label: 'Transaction Date', type: 'datetime' }
      ],
      filters: [
        { key: 'date_from', label: 'Date From', type: 'date' },
        { key: 'date_to', label: 'Date To', type: 'date' },
        { key: 'limit', label: 'Limit', type: 'number', max: 50000 }
      ]
    },
    payments: {
      name: 'Payments Export',
      description: 'Export payment data from Stripe',
      fields: [
        { key: 'stripe_payment_id', label: 'Stripe Payment ID', type: 'string' },
        { key: 'user_email', label: 'User Email', type: 'string' },
        { key: 'amount', label: 'Amount (cents)', type: 'number' },
        { key: 'product_type', label: 'Product Type', type: 'string' },
        { key: 'credits_amount', label: 'Credits Amount', type: 'number' },
        { key: 'status', label: 'Payment Status', type: 'string' },
        { key: 'event_type', label: 'Event Type', type: 'string' },
        { key: 'created_at', label: 'Payment Date', type: 'datetime' }
      ],
      filters: [
        { key: 'date_from', label: 'Date From', type: 'date' },
        { key: 'date_to', label: 'Date To', type: 'date' },
        { key: 'payment_status', label: 'Status', type: 'select', options: ['succeeded', 'failed', 'disputed', 'pending'] },
        { key: 'limit', label: 'Limit', type: 'number', max: 50000 }
      ]
    },
    analytics: {
      name: 'Analytics Export',
      description: 'Export usage analytics and generation data',
      fields: [
        { key: 'date', label: 'Date', type: 'date' },
        { key: 'theme', label: 'Theme', type: 'string' },
        { key: 'portrait_type', label: 'Portrait Type', type: 'string' },
        { key: 'generation_count', label: 'Generation Count', type: 'number' },
        { key: 'unique_sessions', label: 'Unique Sessions', type: 'number' },
        { key: 'authenticated_users', label: 'Authenticated Users', type: 'number' },
        { key: 'anonymous_generations', label: 'Anonymous Generations', type: 'number' }
      ],
      filters: [
        { key: 'date_from', label: 'Date From', type: 'date' },
        { key: 'date_to', label: 'Date To', type: 'date' },
        { key: 'limit', label: 'Limit', type: 'number', max: 50000 }
      ]
    },
    activity_logs: {
      name: 'Activity Logs Export',
      description: 'Export user activity logs',
      fields: [
        { key: 'id', label: 'Log ID', type: 'string' },
        { key: 'user_email', label: 'User Email', type: 'string' },
        { key: 'activity_type', label: 'Activity Type', type: 'string' },
        { key: 'activity_data', label: 'Activity Data', type: 'json' },
        { key: 'ip_address', label: 'IP Address', type: 'string' },
        { key: 'timestamp', label: 'Timestamp', type: 'datetime' }
      ],
      filters: [
        { key: 'date_from', label: 'Date From', type: 'date' },
        { key: 'date_to', label: 'Date To', type: 'date' },
        { key: 'activity_type', label: 'Activity Type', type: 'string' },
        { key: 'limit', label: 'Limit', type: 'number', max: 50000 }
      ]
    }
  }

  return new Response(JSON.stringify({ templates }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

// Get export history
async function handleExportHistory(supabase: any, adminUser: AdminUser) {
  try {
    const { data: exports, error } = await supabase
      .from('export_logs')
      .select(`
        *,
        admin_users!export_logs_exported_by_fkey (
          users!admin_users_user_id_fkey (
            email,
            display_name
          )
        )
      `)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) throw error

    const processedExports = exports?.map(exp => ({
      ...exp,
      exported_by_email: exp.admin_users?.users?.email,
      exported_by_name: exp.admin_users?.users?.display_name,
      admin_users: undefined
    })) || []

    return new Response(JSON.stringify({ exports: processedExports }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Export history error:', error)
    return new Response(JSON.stringify({ error: 'Failed to fetch export history' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}

// Download previous export (if we were storing files)
async function handleDownloadExport(supabase: any, params: URLSearchParams, adminUser: AdminUser) {
  const exportId = params.get('id')
  
  if (!exportId) {
    return new Response(JSON.stringify({ error: 'Export ID required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  // For now, return a message indicating this feature isn't implemented
  // In a production system, you'd store the exported files and retrieve them here
  return new Response(JSON.stringify({ 
    error: 'Download feature not implemented - exports are returned immediately' 
  }), {
    status: 501,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

// Format export data based on requested format
async function formatExportData(data: any[], format: string, filename: string) {
  switch (format) {
    case 'csv':
      return {
        content: convertToCSV(data),
        contentType: 'text/csv'
      }
    case 'excel':
      // For now, return CSV for Excel compatibility
      return {
        content: convertToCSV(data),
        contentType: 'application/vnd.ms-excel'
      }
    case 'json':
    default:
      return {
        content: JSON.stringify(data, null, 2),
        contentType: 'application/json'
      }
  }
}

// Convert data to CSV format
function convertToCSV(data: any[]): string {
  if (data.length === 0) return ''
  
  const headers = Object.keys(data[0])
  const csvRows = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header]
        if (value === null || value === undefined) return ''
        if (typeof value === 'object') return JSON.stringify(value).replace(/"/g, '""')
        return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value
      }).join(',')
    )
  ]
  
  return csvRows.join('\n')
}

// Helper function to verify admin access
async function verifyAdminAccess(supabase: any, req: Request): Promise<AdminUser | null> {
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

    return adminUser
  } catch (error) {
    console.error('Verify admin access error:', error)
    return null
  }
}