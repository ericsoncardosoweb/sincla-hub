/**
 * Resolve Server Edge Function
 * 
 * Dado um company_id, retorna o endpoint correto do servidor.
 * Os satélites chamam esta função para saber aonde apontar.
 * 
 * GET  ?company_id=uuid
 * POST { company_id: "uuid" }
 * 
 * Response:
 * {
 *   mode: "shared" | "external",
 *   server_url: string | null,
 *   server_status: string,
 *   has_dedicated_db: boolean,
 *   db_config: object | null
 * }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // Get company_id from query or body
        let companyId: string | null = null

        if (req.method === 'GET') {
            const url = new URL(req.url)
            companyId = url.searchParams.get('company_id')
        } else {
            const body = await req.json()
            companyId = body.company_id
        }

        if (!companyId) {
            return new Response(
                JSON.stringify({ error: 'company_id is required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Call the database function
        const { data, error } = await supabase.rpc('resolve_company_server', {
            p_company_id: companyId,
        })

        if (error) {
            console.error('Error resolving server:', error)
            return new Response(
                JSON.stringify({ error: 'Failed to resolve server' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        return new Response(
            JSON.stringify(data),
            {
                status: 200,
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json',
                    'Cache-Control': 'public, max-age=60', // Cache 1 min
                },
            }
        )

    } catch (error) {
        console.error('Resolve server error:', error)
        return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
