// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { SignJWT } from 'https://deno.land/x/jose@v5.2.0/index.ts'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Secret fixo transiente (Deve ser migrado para o Painel Supabase antes de Produção!)
const JWT_SECRET = 'sincla-hub-secret-key-change-in-production'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface RequestBody {
    product_id: string
    company_id: string
}

Deno.serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Get the authorization header
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: 'No authorization header' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Create Supabase client with the user's token
        const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
            global: {
                headers: { Authorization: authHeader },
            },
        })

        // Get the user from the token
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
        if (userError || !user) {
            return new Response(
                JSON.stringify({ error: 'Invalid token' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Parse request body
        const { product_id, company_id }: RequestBody = await req.json()

        if (!product_id || !company_id) {
            return new Response(
                JSON.stringify({ error: 'product_id and company_id are required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Verify user has access to the company
        const { data: membership, error: memberError } = await supabaseClient
            .from('company_members')
            .select('id, role')
            .eq('user_id', user.id)
            .eq('company_id', company_id)
            .eq('status', 'active')
            .single()

        if (memberError || !membership) {
            return new Response(
                JSON.stringify({ error: 'User is not a member of this company' }),
                { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Check if company has an active subscription to this product
        const { data: subscription, error: subError } = await supabaseClient
            .from('subscriptions')
            .select(`
                id,
                status,
                plan,
                plan_id,
                product_plans ( slug )
            `)
            .eq('company_id', company_id)
            .eq('product_id', product_id)
            .in('status', ['active', 'trial'])
            .single()

        if (subError || !subscription) {
            return new Response(
                JSON.stringify({ error: 'Company does not have an active subscription to this product' }),
                { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Variable to hold final access level. Default to owner for 'owner' role.
        let accessLevel = 'admin'

        // By-pass explicit check for Owners
        if (membership.role !== 'owner') {
            // Check if user has explicit access to this product
            const { data: access, error: accessError } = await supabaseClient
                .from('member_product_access')
                .select('access_level')
                .eq('company_member_id', membership.id)
                .eq('product_id', product_id)
                .single()

            if (accessError || !access) {
                return new Response(
                    JSON.stringify({ error: 'User does not have access to this product' }),
                    { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            }
            accessLevel = access.access_level
        }

        // Get company details
        const { data: company, error: companyError } = await supabaseClient
            .from('companies')
            .select('*')
            .eq('id', company_id)
            .single()

        if (companyError || !company) {
            return new Response(
                JSON.stringify({ error: 'Company not found' }),
                { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Get subscriber profile
        const { data: subscriber, error: subProfileError } = await supabaseClient
            .from('subscribers')
            .select('name, email')
            .eq('id', user.id)
            .single()

        if (subProfileError || !subscriber) {
            return new Response(
                JSON.stringify({ error: 'Subscriber not found' }),
                { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Create JWT payload
        const now = Math.floor(Date.now() / 1000)
        const exp = now + (5 * 60) // 5 minutes expiry

        const payload = {
            user_id: user.id,
            email: subscriber.email,
            name: subscriber.name,
            company_id: company.id,
            company_slug: company.slug,
            company_name: company.name,
            cnpj: company.cnpj,
            role: membership.role,
            access_level: accessLevel,
            product_id: product_id,
            plan_code: subscription?.product_plans?.slug || subscription?.plan || 'pro',
            branding: {
                logo_url: company.logo_url,
                favicon_url: company.favicon_url,
                primary_color: company.primary_color,
                secondary_color: company.secondary_color,
                description: company.description,
            },
            iat: now,
            exp: exp,
        }

        // Sign the JWT
        const secret = new TextEncoder().encode(JWT_SECRET)
        const token = await new SignJWT(payload)
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('5m')
            .sign(secret)

        return new Response(
            JSON.stringify({ token }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Error generating cross token:', error)
        return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
