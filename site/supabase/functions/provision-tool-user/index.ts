// =====================================================
// SINCLA HUB - Edge Function: provision-tool-user
// Provisiona (ou revoga) shadow users em ferramentas satellite
// Chamada pelo Team.tsx ou por trigger em member_product_access
// =====================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Tool Supabase credentials (configured as secrets)
// Format: TOOL_{PRODUCT_ID_UPPER}_SUPABASE_URL, TOOL_{PRODUCT_ID_UPPER}_SERVICE_ROLE_KEY
const TOOL_CONFIGS: Record<string, { url: string; key: string }> = {}

// Dynamically load tool configs from env
const TOOL_IDS = ['rh', 'ead', 'agenda', 'intranet', 'crm', 'leads']
for (const id of TOOL_IDS) {
    const upper = id.toUpperCase()
    const url = Deno.env.get(`TOOL_${upper}_SUPABASE_URL`)
    const key = Deno.env.get(`TOOL_${upper}_SERVICE_ROLE_KEY`)
    if (url && key) {
        TOOL_CONFIGS[id] = { url, key }
    }
}

interface ProvisionRequest {
    action: 'provision' | 'revoke' | 'sync'
    member_id: string           // company_members.id
    product_ids?: string[]      // specific products to provision (if empty, uses member_product_access)
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: 'No authorization header' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Hub admin client
        const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        // Verify caller is authenticated
        const userClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
            global: { headers: { Authorization: authHeader } },
        })
        const { data: { user: caller }, error: callerError } = await userClient.auth.getUser()
        if (callerError || !caller) {
            return new Response(
                JSON.stringify({ error: 'Invalid token' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const body: ProvisionRequest = await req.json()
        const { action = 'provision', member_id, product_ids } = body

        if (!member_id) {
            return new Response(
                JSON.stringify({ error: 'member_id is required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 1. Load full member context
        const { data: member, error: memberErr } = await adminClient
            .from('company_members')
            .select(`
                id, user_id, role, user_type, company_id,
                subscriber:subscribers!company_members_user_id_fkey (id, email, name),
                company:companies!company_members_company_id_fkey (id, name, slug, cnpj, logo_url, primary_color, secondary_color)
            `)
            .eq('id', member_id)
            .single()

        if (memberErr || !member) {
            return new Response(
                JSON.stringify({ error: 'Member not found' }),
                { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Verify caller has permission (must be owner/admin of the same company)
        const { data: callerMember } = await adminClient
            .from('company_members')
            .select('role')
            .eq('user_id', caller.id)
            .eq('company_id', member.company_id)
            .eq('status', 'active')
            .single()

        if (!callerMember || !['owner', 'admin'].includes(callerMember.role)) {
            return new Response(
                JSON.stringify({ error: 'Insufficient permissions' }),
                { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 2. Load products to provision
        let targetProducts: { product_id: string; access_level: string }[] = []

        if (product_ids && product_ids.length > 0) {
            // Provision specific products
            const { data: accessList } = await adminClient
                .from('member_product_access')
                .select('product_id, access_level')
                .eq('company_member_id', member_id)
                .in('product_id', product_ids)

            targetProducts = accessList || []
        } else {
            // Provision all products the member has access to
            const { data: accessList } = await adminClient
                .from('member_product_access')
                .select('product_id, access_level')
                .eq('company_member_id', member_id)

            targetProducts = accessList || []
        }

        // 3. Filter to B2B products only (B2C products don't auto-provision)
        const { data: b2bProducts } = await adminClient
            .from('products')
            .select('id')
            .eq('user_model', 'b2b')
            .in('id', targetProducts.map(t => t.product_id))

        const b2bIds = new Set((b2bProducts || []).map((p: any) => p.id))
        const provisionTargets = targetProducts.filter(t => b2bIds.has(t.product_id))

        // 4. Load subscription info for plan_code
        const { data: subs } = await adminClient
            .from('subscriptions')
            .select('product_id, plan, product_plans (slug, limits)')
            .eq('company_id', member.company_id)
            .in('status', ['active', 'trial'])

        const subMap: Record<string, any> = {}
        for (const s of (subs || [])) {
            subMap[s.product_id] = s
        }

        // 5. Provision each product
        const results: { product_id: string; status: string; message?: string }[] = []
        const subscriber = Array.isArray(member.subscriber) ? member.subscriber[0] : member.subscriber
        const company = Array.isArray(member.company) ? member.company[0] : member.company

        for (const target of provisionTargets) {
            const toolConfig = TOOL_CONFIGS[target.product_id]
            if (!toolConfig) {
                // Tool not configured — log and skip
                await logProvision(adminClient, {
                    company_member_id: member_id,
                    company_id: member.company_id,
                    product_id: target.product_id,
                    subscriber_id: member.user_id,
                    action,
                    status: 'error',
                    error_message: `Tool ${target.product_id} not configured (missing TOOL_${target.product_id.toUpperCase()}_SUPABASE_URL)`,
                })
                results.push({ product_id: target.product_id, status: 'error', message: 'Tool not configured' })
                continue
            }

            const sub = subMap[target.product_id]
            const payload = {
                action,
                subscriber_id: member.user_id,
                email: subscriber?.email,
                name: subscriber?.name,
                user_type: member.user_type || 'collaborator',
                company_id: member.company_id,
                company_name: company?.name,
                company_slug: company?.slug,
                cnpj: company?.cnpj,
                access_level: target.access_level,
                plan_code: sub?.product_plans?.slug || sub?.plan || 'starter',
                plan_limits: sub?.product_plans?.limits || {},
                branding: {
                    logo_url: company?.logo_url,
                    primary_color: company?.primary_color,
                    secondary_color: company?.secondary_color,
                },
            }

            try {
                const response = await fetch(`${toolConfig.url}/functions/v1/hub-provision-user`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${toolConfig.key}`,
                    },
                    body: JSON.stringify(payload),
                })

                const responseData = await response.json().catch(() => ({}))

                if (response.ok && responseData.status === 'ok') {
                    await logProvision(adminClient, {
                        company_member_id: member_id,
                        company_id: member.company_id,
                        product_id: target.product_id,
                        subscriber_id: member.user_id,
                        action,
                        status: 'success',
                        request_payload: payload,
                        response_data: responseData,
                    })
                    results.push({ product_id: target.product_id, status: 'success' })
                } else {
                    const errMsg = responseData.message || responseData.error || `HTTP ${response.status}`
                    await logProvision(adminClient, {
                        company_member_id: member_id,
                        company_id: member.company_id,
                        product_id: target.product_id,
                        subscriber_id: member.user_id,
                        action,
                        status: 'error',
                        error_message: errMsg,
                        request_payload: payload,
                        response_data: responseData,
                    })
                    results.push({ product_id: target.product_id, status: 'error', message: errMsg })
                }
            } catch (fetchErr: any) {
                const errMsg = fetchErr.message || 'Network error'
                await logProvision(adminClient, {
                    company_member_id: member_id,
                    company_id: member.company_id,
                    product_id: target.product_id,
                    subscriber_id: member.user_id,
                    action,
                    status: 'error',
                    error_message: errMsg,
                    request_payload: payload,
                })
                results.push({ product_id: target.product_id, status: 'error', message: errMsg })
            }
        }

        return new Response(
            JSON.stringify({
                provisioned: results.filter(r => r.status === 'success').length,
                errors: results.filter(r => r.status === 'error').length,
                results,
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: any) {
        console.error('Error in provision-tool-user:', error)
        return new Response(
            JSON.stringify({ error: 'Internal server error', details: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})

// Helper: log provision attempt
async function logProvision(client: any, data: {
    company_member_id: string
    company_id: string
    product_id: string
    subscriber_id: string
    action: string
    status: string
    error_message?: string
    request_payload?: any
    response_data?: any
}) {
    try {
        await client.from('provision_logs').insert(data)
    } catch (err) {
        console.error('Failed to write provision log:', err)
    }
}
