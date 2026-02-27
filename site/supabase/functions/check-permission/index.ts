/**
 * Check Permission Edge Function
 * 
 * Verifica se um usuário tem acesso a um produto em uma empresa.
 * 
 * Modelo de permissão:
 * 1. Dono da empresa (subscriber_id) → always 'advanced'
 * 2. Parceiro/consultor da empresa → always 'advanced'
 * 3. Membro com access_level → 'advanced' | 'basic'
 * 4. Sem vínculo → null (sem acesso)
 * 
 * Cache: 60 segundos
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PermissionRequest {
    user_id: string
    company_id: string
    product_id: string
}

interface PermissionResponse {
    has_access: boolean
    access_level: 'advanced' | 'basic' | null
    granted_by: 'owner' | 'partner' | 'member' | null
    company_role: string | null
    subscription_active: boolean
}

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { user_id, company_id, product_id }: PermissionRequest = await req.json()

        if (!user_id || !company_id || !product_id) {
            return new Response(
                JSON.stringify({ error: 'Missing required fields: user_id, company_id, product_id' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // ─── 1. Verificar se empresa tem assinatura ativa do produto ────
        const { data: subscription } = await supabase
            .from('subscriptions')
            .select('id, status')
            .eq('company_id', company_id)
            .eq('product_id', product_id)
            .in('status', ['active', 'trial'])
            .single()

        if (!subscription) {
            const response: PermissionResponse = {
                has_access: false,
                access_level: null,
                granted_by: null,
                company_role: null,
                subscription_active: false,
            }
            return new Response(
                JSON.stringify(response),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // ─── 2. Verificar se é dono da empresa ─────────────────────────
        const { data: company } = await supabase
            .from('companies')
            .select('subscriber_id, partner_id')
            .eq('id', company_id)
            .single()

        if (company?.subscriber_id === user_id) {
            const response: PermissionResponse = {
                has_access: true,
                access_level: 'advanced',
                granted_by: 'owner',
                company_role: 'owner',
                subscription_active: true,
            }
            return new Response(
                JSON.stringify(response),
                {
                    status: 200,
                    headers: {
                        ...corsHeaders,
                        'Content-Type': 'application/json',
                        'Cache-Control': 'public, max-age=60',
                    }
                }
            )
        }

        // ─── 3. Verificar se é parceiro/consultor da empresa ───────────
        if (company?.partner_id) {
            const { data: partner } = await supabase
                .from('partners')
                .select('id, user_id, status')
                .eq('id', company.partner_id)
                .eq('user_id', user_id)
                .eq('status', 'active')
                .single()

            if (partner) {
                const response: PermissionResponse = {
                    has_access: true,
                    access_level: 'advanced',
                    granted_by: 'partner',
                    company_role: 'partner',
                    subscription_active: true,
                }
                return new Response(
                    JSON.stringify(response),
                    {
                        status: 200,
                        headers: {
                            ...corsHeaders,
                            'Content-Type': 'application/json',
                            'Cache-Control': 'public, max-age=60',
                        }
                    }
                )
            }
        }

        // ─── 4. Verificar acesso como membro ───────────────────────────
        const { data: membership } = await supabase
            .from('company_members')
            .select('id, role, status')
            .eq('user_id', user_id)
            .eq('company_id', company_id)
            .eq('status', 'active')
            .single()

        if (!membership) {
            const response: PermissionResponse = {
                has_access: false,
                access_level: null,
                granted_by: null,
                company_role: null,
                subscription_active: true,
            }
            return new Response(
                JSON.stringify(response),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Verificar acesso ao produto específico
        const { data: productAccess } = await supabase
            .from('member_product_access')
            .select('access_level')
            .eq('company_member_id', membership.id)
            .eq('product_id', product_id)
            .single()

        const accessLevel = productAccess?.access_level as 'advanced' | 'basic' | null

        const response: PermissionResponse = {
            has_access: accessLevel !== null,
            access_level: accessLevel,
            granted_by: accessLevel ? 'member' : null,
            company_role: membership.role,
            subscription_active: true,
        }

        return new Response(
            JSON.stringify(response),
            {
                status: 200,
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json',
                    'Cache-Control': 'public, max-age=60',
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
