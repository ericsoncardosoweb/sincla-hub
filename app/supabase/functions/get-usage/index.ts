/**
 * get-usage — Fonte única de consumo de armazenamento por empresa.
 * Qualquer ferramenta (EAD, RH, etc.) pergunta ao Hub quanto a empresa usou de
 * arquivo (storage) e de vídeo (stream), com quota e percentual, e o breakdown
 * por ferramenta. Leitura apenas.
 *
 * Entrada: { company_id }
 * Saída:   { success, storage:{...}, stream:{...}, total:{...} }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

function json(data: unknown, status = 200): Response {
    return new Response(JSON.stringify(data), {
        status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
}

function pct(used: number, quota: number): number {
    if (!quota || quota <= 0) return 0
    return Math.min(100, Math.round((used / quota) * 1000) / 10) // 1 casa decimal
}

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
    if (req.method !== 'POST') return json({ success: false, error: 'Method not allowed' }, 405)

    try {
        const { company_id } = await req.json()
        if (!company_id) return json({ success: false, error: 'Campo obrigatório: company_id' }, 400)

        const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
            auth: { autoRefreshToken: false, persistSession: false },
        })

        const { data: q } = await admin.from('storage_quotas')
            .select('storage_bytes, storage_quota_bytes, storage_files_count, stream_bytes, stream_quota_bytes, stream_files_count, storage_by_tool, stream_by_tool, bandwidth_bytes, bandwidth_quota_bytes, bandwidth_by_tool')
            .eq('company_id', company_id).maybeSingle()

        const storageUsed = q?.storage_bytes || 0
        const storageQuota = q?.storage_quota_bytes || 0
        const streamUsed = q?.stream_bytes || 0
        const streamQuota = q?.stream_quota_bytes || 0
        const bandwidthUsed = q?.bandwidth_bytes || 0
        const bandwidthQuota = q?.bandwidth_quota_bytes || 0
        const totalUsed = storageUsed + streamUsed
        const totalQuota = storageQuota + streamQuota

        return json({
            success: true,
            storage: {
                used_bytes: storageUsed,
                quota_bytes: storageQuota,
                files_count: q?.storage_files_count || 0,
                percent: pct(storageUsed, storageQuota),
                by_tool: q?.storage_by_tool || {},
            },
            stream: {
                used_bytes: streamUsed,
                quota_bytes: streamQuota,
                files_count: q?.stream_files_count || 0,
                percent: pct(streamUsed, streamQuota),
                by_tool: q?.stream_by_tool || {},
            },
            bandwidth: {
                used_bytes: bandwidthUsed,
                quota_bytes: bandwidthQuota,
                percent: pct(bandwidthUsed, bandwidthQuota),
                by_tool: q?.bandwidth_by_tool || {},
                estimated: true,
            },
            total: {
                used_bytes: totalUsed,
                quota_bytes: totalQuota,
                percent: pct(totalUsed, totalQuota),
            },
        })
    } catch (err: any) {
        console.error('[get-usage]', err)
        return json({ success: false, error: err.message || 'Erro interno' }, 500)
    }
})
