// =====================================================
// SINCLA HUB - Edge Function: admin-delete-subscriber
// Exclui auth user (CASCADE remove subscriber, companies, subscriptions)
// Requer service_role (admin only)
// =====================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // ── Auth check: caller must be admin ──
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: 'No authorization header' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        const userClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
            global: { headers: { Authorization: authHeader } },
        })

        const { data: { user: callerUser }, error: userError } = await userClient.auth.getUser()
        if (userError || !callerUser) {
            return new Response(
                JSON.stringify({ error: 'Invalid token' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const { data: adminData } = await adminClient
            .from('admin_users')
            .select('is_active')
            .eq('id', callerUser.id)
            .eq('is_active', true)
            .single()

        if (!adminData) {
            return new Response(
                JSON.stringify({ error: 'Acesso negado: requer privilégios de administrador.' }),
                { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // ── Parse body ──
        const { subscriberId } = await req.json()
        if (!subscriberId) {
            return new Response(
                JSON.stringify({ error: 'subscriberId é obrigatório' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // ── Safety: prevent self-deletion ──
        if (subscriberId === callerUser.id) {
            return new Response(
                JSON.stringify({ error: 'Não é possível excluir sua própria conta.' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // ── Step 1: Check if subscriber has active subscriptions with external billing ──
        const { data: activeSubs } = await adminClient
            .from('subscriptions')
            .select('id, external_subscription_id, company_id, product_id')
            .in('company_id',
                adminClient
                    .from('companies')
                    .select('id')
                    .eq('subscriber_id', subscriberId)
            )
            .not('external_subscription_id', 'is', null)
            .eq('status', 'active')

        if (activeSubs && activeSubs.length > 0) {
            return new Response(
                JSON.stringify({
                    error: 'Este assinante tem assinaturas ativas com cobrança no Asaas. Cancele as assinaturas antes de excluir.',
                    active_subscriptions: activeSubs.length,
                }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // ── Step 2: Delete auth user (CASCADE will handle the rest) ──
        console.log(`[admin-delete-subscriber] Deleting user ${subscriberId} by admin ${callerUser.id}`)

        const { error: deleteError } = await adminClient.auth.admin.deleteUser(subscriberId)

        if (deleteError) {
            console.error('[admin-delete-subscriber] Error deleting user:', deleteError)
            return new Response(
                JSON.stringify({ error: 'Falha ao excluir usuário: ' + deleteError.message }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        console.log(`[admin-delete-subscriber] User ${subscriberId} deleted successfully`)

        return new Response(
            JSON.stringify({ success: true, message: 'Assinante excluído com sucesso.' }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Error in admin-delete-subscriber:', error)
        return new Response(
            JSON.stringify({ error: (error as Error).message || 'Internal server error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
