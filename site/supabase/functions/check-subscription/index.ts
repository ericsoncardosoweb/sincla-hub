/**
 * Check Subscription Edge Function
 * 
 * Verifica se uma empresa tem assinatura ativa para um produto.
 * Inclui informações do plano, limites e features disponíveis.
 * 
 * Cache: 60 segundos
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SubscriptionResponse {
    has_subscription: boolean
    subscription?: {
        id: string
        status: string
        plan: {
            id: string
            name: string
            slug: string
        }
        billing_cycle: string
        current_period_end: string | null
        limits: Record<string, number>
        features: string[]
    }
    trial_available?: boolean
    trial_days?: number
}

Deno.serve(async (req: Request) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Parse request
        const { company_id, product_id } = await req.json()

        if (!company_id || !product_id) {
            return new Response(
                JSON.stringify({ error: 'Missing company_id or product_id' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Initialize Supabase
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // Get subscription with plan details
        const { data: subscription, error } = await supabase
            .from('subscriptions')
            .select(`
        id,
        status,
        billing_cycle,
        current_period_start,
        current_period_end,
        trial_ends_at,
        plan:product_plans (
          id,
          name,
          slug,
          features,
          limits
        )
      `)
            .eq('company_id', company_id)
            .eq('product_id', product_id)
            .maybeSingle()

        if (error) {
            console.error('Error fetching subscription:', error)
            return new Response(
                JSON.stringify({ error: 'Failed to check subscription' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        let response: SubscriptionResponse

        if (!subscription) {
            // No subscription found
            // Check if trial is available
            const { count } = await supabase
                .from('subscriptions')
                .select('*', { count: 'exact', head: true })
                .eq('company_id', company_id)
                .eq('product_id', product_id)

            response = {
                has_subscription: false,
                trial_available: count === 0,
                trial_days: 14,
            }
        } else {
            // Has subscription
            const plan = subscription.plan as any

            response = {
                has_subscription: true,
                subscription: {
                    id: subscription.id,
                    status: subscription.status,
                    plan: {
                        id: plan?.id || '',
                        name: plan?.name || 'Plano Básico',
                        slug: plan?.slug || 'basic',
                    },
                    billing_cycle: subscription.billing_cycle || 'monthly',
                    current_period_end: subscription.current_period_end,
                    limits: plan?.limits || {},
                    features: plan?.features || [],
                },
            }
        }

        return new Response(
            JSON.stringify(response),
            {
                status: 200,
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json',
                    'Cache-Control': 'public, max-age=60', // Cache for 1 minute
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
