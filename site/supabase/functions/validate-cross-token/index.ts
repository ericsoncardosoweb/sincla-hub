// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { jwtVerify } from 'https://deno.land/x/jose@v5.2.0/index.ts'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Secret key for verifying tokens (must match generate-cross-token)
const JWT_SECRET = Deno.env.get('HUB_JWT_SECRET') || 'sincla-hub-secret-key-change-in-production'

interface RequestBody {
    token: string
}

interface TokenPayload {
    user_id: string
    email: string
    name: string | null
    company_id: string
    company_slug: string
    company_name: string
    role: string
    access_level: string
    product_id: string
    branding: {
        logo_url: string | null
        favicon_url: string | null
        primary_color: string
        secondary_color: string
        description: string | null
    }
    iat: number
    exp: number
}

Deno.serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Parse request body
        const { token }: RequestBody = await req.json()

        if (!token) {
            return new Response(
                JSON.stringify({ error: 'token is required', valid: false }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Verify the JWT
        const secret = new TextEncoder().encode(JWT_SECRET)

        try {
            const { payload } = await jwtVerify(token, secret)

            // Token is valid, return the payload
            return new Response(
                JSON.stringify({
                    valid: true,
                    payload: payload as unknown as TokenPayload
                }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        } catch (jwtError) {
            // Token is invalid or expired
            console.error('JWT verification failed:', jwtError)
            return new Response(
                JSON.stringify({
                    valid: false,
                    error: 'Token is invalid or expired'
                }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

    } catch (error) {
        console.error('Error validating cross token:', error)
        return new Response(
            JSON.stringify({ error: 'Internal server error', valid: false }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
