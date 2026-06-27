/**
 * storage-auto-expand — Amplia a cota de stream da empresa cobrando o cartão tokenizado.
 *
 * Opt-in (storage_quotas.auto_expand) + teto por ciclo (auto_expand_cap_bytes).
 * Escolhe o MENOR pacote (+10/+50/+200 GB) que cobre a necessidade, cria uma assinatura
 * recorrente mensal no Asaas usando o creditCardToken salvo (sem re-coletar cartão),
 * e — se a cobrança passar — incrementa a quota, registra o uso e notifica os admins.
 *
 * Falha de cobrança / sem cartão / teto / desabilitado → success:false (o chamador bloqueia).
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const GB = 1073741824

function json(data: unknown, status = 200): Response {
    return new Response(JSON.stringify(data), {
        status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
}

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
    if (req.method !== 'POST') return json({ success: false, reason: 'method' }, 405)

    try {
        const { company_id, needed_bytes = 0 } = await req.json()
        if (!company_id) return json({ success: false, reason: 'bad_request' }, 400)

        const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
            auth: { autoRefreshToken: false, persistSession: false },
        })

        const { data: q } = await admin.from('storage_quotas')
            .select('stream_bytes, stream_quota_bytes, auto_expand, auto_expand_cap_bytes, auto_expand_used_bytes')
            .eq('company_id', company_id).maybeSingle()

        if (!q || !q.auto_expand) return json({ success: false, reason: 'disabled' })

        // Menor pacote (>= 10 GB) que cobre a necessidade
        const need = Math.max(Number(needed_bytes) || 0, 1)
        const { data: packs } = await admin.from('service_pricing')
            .select('unit_amount, price_brl, name')
            .eq('service_type', 'storage').eq('is_active', true)
            .gte('unit_amount', 10 * GB).order('unit_amount', { ascending: true })

        const pack = (packs || []).find((p: any) => Number(p.unit_amount) >= need)
        if (!pack) return json({ success: false, reason: 'needs_confirmation', message: 'Necessidade acima do maior pacote automático.' })

        const packBytes = Number(pack.unit_amount)
        const usedCycle = Number(q.auto_expand_used_bytes) || 0
        const cap = Number(q.auto_expand_cap_bytes) || 0
        if (cap > 0 && usedCycle + packBytes > cap) {
            return json({ success: false, reason: 'cap_exceeded', message: 'Teto de auto-expansão do ciclo atingido.' })
        }

        // Método de pagamento tokenizado
        const { data: pm } = await admin.from('company_payment_methods')
            .select('asaas_customer_id, asaas_card_token').eq('company_id', company_id).maybeSingle()
        if (!pm?.asaas_customer_id || !pm?.asaas_card_token) {
            return json({ success: false, reason: 'no_payment_method', message: 'Sem cartão salvo para cobrança automática.' })
        }

        // Cobra assinatura recorrente no Asaas (via proxy asaas-checkout)
        const gbLabel = Math.round(packBytes / GB)
        const charge = await fetch(`${SUPABASE_URL}/functions/v1/asaas-checkout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SERVICE_KEY}` },
            body: JSON.stringify({
                endpoint: '/subscriptions',
                method: 'POST',
                userId: company_id,
                productId: 'ead',
                sandbox: false,
                data: {
                    customer: pm.asaas_customer_id,
                    billingType: 'CREDIT_CARD',
                    creditCardToken: pm.asaas_card_token,
                    value: Number(pack.price_brl),
                    cycle: 'MONTHLY',
                    description: `Sincla — Armazenamento +${gbLabel} GB [plan:storage]`,
                    nextDueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
                },
            }),
        })
        const result = await charge.json().catch(() => ({}))
        if (result?.error || !result?.id) {
            console.error('[storage-auto-expand] cobrança falhou', result?.error)
            return json({ success: false, reason: 'payment_failed', message: result?.error || 'Falha na cobrança' })
        }

        // Sucesso: amplia quota + contabiliza + notifica
        const newQuota = (Number(q.stream_quota_bytes) || 0) + packBytes
        await admin.from('storage_quotas').update({
            stream_quota_bytes: newQuota,
            auto_expand_used_bytes: usedCycle + packBytes,
            updated_at: new Date().toISOString(),
        }).eq('company_id', company_id)

        await admin.from('service_usage_log').insert({
            company_id, service_type: 'storage', sub_type: 'auto_expand', tool_id: 'ead',
            quantity: packBytes,
            metadata: { action: 'auto_expand', pack_gb: gbLabel, amount_brl: Number(pack.price_brl), asaas_subscription_id: result.id, recurring: true },
        })

        await admin.from('notifications').insert(
            (await admin.from('company_members').select('user_id')
                .eq('company_id', company_id).eq('status', 'active').in('role', ['owner', 'admin'])).data
                ?.map((m: any) => ({
                    user_id: m.user_id, company_id, source_tool: 'hub',
                    title: 'Armazenamento ampliado automaticamente',
                    message: `Adicionamos +${gbLabel} GB ao seu plano (R$ ${Number(pack.price_brl).toFixed(2)}/mês) para o upload continuar.`,
                    category: 'system', icon: 'database', color: '#228be6', action_url: '/painel/consumo',
                    metadata: { type: 'auto_expand', pack_gb: gbLabel },
                })) || [],
        )

        console.log(`[storage-auto-expand] company:${company_id} +${gbLabel}GB sub:${result.id}`)
        return json({ success: true, added_bytes: packBytes, new_quota_bytes: newQuota, amount_brl: Number(pack.price_brl), pack_gb: gbLabel })
    } catch (err: any) {
        console.error('[storage-auto-expand]', err)
        return json({ success: false, reason: 'error', message: err.message || 'Erro interno' }, 500)
    }
})
