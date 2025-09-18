import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
}

interface PricingTierRequest {
  package_id?: string;
  name?: string;
  shoots_count?: number;
  price_cents?: number;
  original_price_cents?: number;
  badge?: string;
  features?: string[];
  restrictions?: Record<string, any>;
  sort_order?: number;
  is_active?: boolean;
  is_default?: boolean;
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
    const tierId = url.pathname.split('/').pop()
    const packageId = url.searchParams.get('package_id')

    switch (req.method) {
      case 'GET':
        if (tierId && tierId !== 'admin-pricing') {
          // Get single pricing tier
          const { data: tier, error } = await supabase
            .from('package_pricing_tiers')
            .select(`
              *,
              package:photo_packages(name, slug)
            `)
            .eq('id', tierId)
            .single()

          if (error) {
            return new Response(JSON.stringify({ error: error.message }), {
              status: 404,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
          }

          return new Response(JSON.stringify({ tier }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        } else {
          // Get pricing tiers (optionally filtered by package)
          let query = supabase
            .from('package_pricing_tiers')
            .select(`
              *,
              package:photo_packages(name, slug)
            `)
            .order('package_id', { ascending: true })
            .order('sort_order', { ascending: true })

          if (packageId) {
            query = query.eq('package_id', packageId)
          }

          const { data: tiers, error } = await query

          if (error) {
            return new Response(JSON.stringify({ error: error.message }), {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
          }

          return new Response(JSON.stringify({ tiers }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

      case 'POST':
        // Create new pricing tier
        const createData: PricingTierRequest = await req.json()
        
        // Validate required fields
        if (!createData.package_id || !createData.name || !createData.shoots_count || createData.price_cents === undefined) {
          return new Response(JSON.stringify({ 
            error: 'Missing required fields: package_id, name, shoots_count, price_cents' 
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        // Verify package exists
        const { data: packageExists, error: packageError } = await supabase
          .from('photo_packages')
          .select('id')
          .eq('id', createData.package_id)
          .single()

        if (packageError || !packageExists) {
          return new Response(JSON.stringify({ error: 'Invalid package ID' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        const { data: newTier, error: createError } = await supabase
          .from('package_pricing_tiers')
          .insert(createData)
          .select()
          .single()

        if (createError) {
          return new Response(JSON.stringify({ error: createError.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        return new Response(JSON.stringify({ 
          tier: newTier,
          message: 'Pricing tier created successfully' 
        }), {
          status: 201,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

      case 'PUT':
        // Update existing pricing tier
        if (!tierId || tierId === 'admin-pricing') {
          return new Response(JSON.stringify({ error: 'Pricing tier ID required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        const updateData: PricingTierRequest = await req.json()
        
        // If package_id is being updated, verify it exists
        if (updateData.package_id) {
          const { data: packageExists, error: packageError } = await supabase
            .from('photo_packages')
            .select('id')
            .eq('id', updateData.package_id)
            .single()

          if (packageError || !packageExists) {
            return new Response(JSON.stringify({ error: 'Invalid package ID' }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
          }
        }

        const { data: updatedTier, error: updateError } = await supabase
          .from('package_pricing_tiers')
          .update(updateData)
          .eq('id', tierId)
          .select()
          .single()

        if (updateError) {
          return new Response(JSON.stringify({ error: updateError.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        return new Response(JSON.stringify({ 
          tier: updatedTier,
          message: 'Pricing tier updated successfully' 
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

      case 'DELETE':
        // Delete pricing tier
        if (!tierId || tierId === 'admin-pricing') {
          return new Response(JSON.stringify({ error: 'Pricing tier ID required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        // Soft delete by setting is_active to false
        const { data: deletedTier, error: deleteError } = await supabase
          .from('package_pricing_tiers')
          .update({ is_active: false })
          .eq('id', tierId)
          .select()
          .single()

        if (deleteError) {
          return new Response(JSON.stringify({ error: deleteError.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        return new Response(JSON.stringify({ 
          message: 'Pricing tier deactivated successfully' 
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

      default:
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }

  } catch (error) {
    console.error('Admin Pricing Error:', error)
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})