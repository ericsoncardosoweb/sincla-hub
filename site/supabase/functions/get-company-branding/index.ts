/**
 * Get Company Branding Edge Function
 * 
 * Retorna as configurações de branding de uma empresa para ser usada
 * pelos produtos satélites ao renderizar a interface.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BrandingResponse {
    company_id: string
    company_name: string
    branding: {
        logo: string | null
        logo_dark: string | null
        favicon: string | null
        primary_color: string
        secondary_color: string
        accent_color: string
    }
    contact: {
        email: string | null
        phone: string | null
        website: string | null
    }
}

Deno.serve(async (req: Request) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Get company_id from query params or body
        const url = new URL(req.url)
        let companyId = url.searchParams.get('company_id')

        if (!companyId && req.method === 'POST') {
            const body = await req.json()
            companyId = body.company_id
        }

        if (!companyId) {
            return new Response(
                JSON.stringify({ error: 'Missing company_id parameter' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Initialize Supabase client (using anon key is fine here, RLS will handle access)
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // Fetch company with branding
        const { data: company, error } = await supabase
            .from('companies')
            .select(`
        id,
        name,
        email,
        phone,
        website,
        branding
      `)
            .eq('id', companyId)
            .single()

        if (error || !company) {
            return new Response(
                JSON.stringify({ error: 'Company not found' }),
                { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Build response with default values
        const branding = company.branding || {}
        const response: BrandingResponse = {
            company_id: company.id,
            company_name: company.name,
            branding: {
                logo: branding.logo || null,
                logo_dark: branding.logo_dark || null,
                favicon: branding.favicon || null,
                primary_color: branding.primary_color || '#228be6',
                secondary_color: branding.secondary_color || '#1971c2',
                accent_color: branding.accent_color || '#12b886',
            },
            contact: {
                email: company.email || null,
                phone: company.phone || null,
                website: company.website || null,
            },
        }

        // Add cache headers for better performance
        return new Response(
            JSON.stringify(response),
            {
                status: 200,
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json',
                    'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
                }
            }
        )

    } catch (error) {
        console.error('Error:', error)
        return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
