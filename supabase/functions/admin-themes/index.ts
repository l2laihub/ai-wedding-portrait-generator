import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
}

interface ThemeRequest {
  package_id?: string;
  name?: string;
  description?: string;
  setting_prompt?: string;
  clothing_prompt?: string;
  atmosphere_prompt?: string;
  technical_prompt?: string;
  style_modifiers?: string[];
  color_palette?: string[];
  inspiration_references?: string[];
  is_active?: boolean;
  is_premium?: boolean;
  is_seasonal?: boolean;
  season_start?: string;
  season_end?: string;
  sort_order?: number;
  popularity_score?: number;
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
    const themeId = url.pathname.split('/').pop()
    const packageId = url.searchParams.get('package_id')

    switch (req.method) {
      case 'GET':
        if (themeId && themeId !== 'admin-themes') {
          // Get single theme
          const { data: theme, error } = await supabase
            .from('package_themes')
            .select(`
              *,
              package:photo_packages(name, slug)
            `)
            .eq('id', themeId)
            .single()

          if (error) {
            return new Response(JSON.stringify({ error: error.message }), {
              status: 404,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
          }

          return new Response(JSON.stringify({ theme }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        } else {
          // Get themes (optionally filtered by package)
          let query = supabase
            .from('package_themes')
            .select(`
              *,
              package:photo_packages(name, slug)
            `)
            .order('package_id', { ascending: true })
            .order('sort_order', { ascending: true })

          if (packageId) {
            query = query.eq('package_id', packageId)
          }

          const { data: themes, error } = await query

          if (error) {
            return new Response(JSON.stringify({ error: error.message }), {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
          }

          return new Response(JSON.stringify({ themes }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

      case 'POST':
        // Create new theme
        const createData: ThemeRequest = await req.json()
        
        // Validate required fields
        if (!createData.package_id || !createData.name || !createData.setting_prompt) {
          return new Response(JSON.stringify({ 
            error: 'Missing required fields: package_id, name, setting_prompt' 
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

        const { data: newTheme, error: createError } = await supabase
          .from('package_themes')
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
          theme: newTheme,
          message: 'Theme created successfully' 
        }), {
          status: 201,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

      case 'PUT':
        // Update existing theme
        if (!themeId || themeId === 'admin-themes') {
          return new Response(JSON.stringify({ error: 'Theme ID required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        const updateData: ThemeRequest = await req.json()
        
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

        const { data: updatedTheme, error: updateError } = await supabase
          .from('package_themes')
          .update(updateData)
          .eq('id', themeId)
          .select()
          .single()

        if (updateError) {
          return new Response(JSON.stringify({ error: updateError.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        return new Response(JSON.stringify({ 
          theme: updatedTheme,
          message: 'Theme updated successfully' 
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

      case 'DELETE':
        // Delete theme
        if (!themeId || themeId === 'admin-themes') {
          return new Response(JSON.stringify({ error: 'Theme ID required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        // Soft delete by setting is_active to false
        const { data: deletedTheme, error: deleteError } = await supabase
          .from('package_themes')
          .update({ is_active: false })
          .eq('id', themeId)
          .select()
          .single()

        if (deleteError) {
          return new Response(JSON.stringify({ error: deleteError.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        return new Response(JSON.stringify({ 
          message: 'Theme deactivated successfully' 
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
    console.error('Admin Themes Error:', error)
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})