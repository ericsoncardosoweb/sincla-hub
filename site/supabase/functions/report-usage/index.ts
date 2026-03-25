/**
 * Report Usage — Edge Function para reportar consumo externo
 * 
 * Usado pelas ferramentas satélites para reportar consumo que
 * aconteceu diretamente (ex: upload de vídeo no Bunny Stream)
 * sem passar pelas Edge Functions do Hub.
 * 
 * Isso alimenta o service_usage_log e storage_quotas do Hub.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    if (req.method !== 'POST') {
        return jsonResponse({ success: false, error: 'Method not allowed' }, 405)
    }

    try {
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return jsonResponse({ success: false, error: 'Não autorizado' }, 401)
        }

        const body = await req.json()
        const { company_id, tool_id, service_type, quantity, metadata = {} } = body

        if (!company_id || !service_type || !quantity) {
            return jsonResponse({
                success: false,
                error: 'Campos obrigatórios: company_id, service_type, quantity'
            }, 400)
        }

        const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
            auth: { autoRefreshToken: false, persistSession: false }
        })

        // Inserir log de uso
        const { error } = await supabaseAdmin.from('service_usage_log').insert({
            company_id,
            service_type,
            sub_type: metadata.sub_type || service_type,
            tool_id: tool_id || 'unknown',
            quantity,
            unit_cost_brl: metadata.unit_cost_brl || 0,
            resale_cost_brl: metadata.resale_cost_brl || 0,
            metadata,
        })

        if (error) {
            console.error('[ReportUsage] Insert error:', error)
            return jsonResponse({ success: false, error: error.message }, 500)
        }

        // Se é storage/stream, atualizar quotas
        if (service_type === 'storage' && quantity > 0) {
            const storageType = metadata.storage_type || 'storage' // 'storage' ou 'stream'
            const quotaField = storageType === 'stream' ? 'stream_bytes' : 'storage_bytes'
            const countField = storageType === 'stream' ? 'stream_files_count' : 'storage_files_count'
            const byToolField = storageType === 'stream' ? 'stream_by_tool' : 'storage_by_tool'
            const isDelete = metadata.action === 'delete'

            // Garantir que existe registro de quota
            await supabaseAdmin
                .from('storage_quotas')
                .upsert({ company_id }, { onConflict: 'company_id', ignoreDuplicates: true })

            const { data: currentQuota } = await supabaseAdmin
                .from('storage_quotas')
                .select(`${quotaField}, ${countField}, ${byToolField}`)
                .eq('company_id', company_id)
                .single()

            if (currentQuota) {
                const byTool = currentQuota[byToolField] || {}
                const toolKey = tool_id || 'unknown'
                
                if (isDelete) {
                    byTool[toolKey] = Math.max(0, (byTool[toolKey] || 0) - quantity)
                    await supabaseAdmin.from('storage_quotas').update({
                        [quotaField]: Math.max(0, (currentQuota[quotaField] || 0) - quantity),
                        [countField]: Math.max(0, (currentQuota[countField] || 0) - 1),
                        [byToolField]: byTool,
                    }).eq('company_id', company_id)
                } else {
                    byTool[toolKey] = (byTool[toolKey] || 0) + quantity
                    await supabaseAdmin.from('storage_quotas').update({
                        [quotaField]: (currentQuota[quotaField] || 0) + quantity,
                        [countField]: (currentQuota[countField] || 0) + 1,
                        [byToolField]: byTool,
                    }).eq('company_id', company_id)
                }
            }
        }

        console.log(`[ReportUsage] OK | company:${company_id} | tool:${tool_id} | type:${service_type} | qty:${quantity}`)

        return jsonResponse({ success: true })

    } catch (error: any) {
        console.error('[ReportUsage] Error:', error)
        return jsonResponse({ success: false, error: error.message || 'Erro interno' }, 500)
    }
})

function jsonResponse(data: unknown, status = 200): Response {
    return new Response(JSON.stringify(data), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
}
