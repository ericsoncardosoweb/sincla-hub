/**
 * Upload Asset v2 — Sincla Hub Storage Service
 * 
 * Edge Function centralizada para upload de arquivos ao Bunny CDN.
 * Todas as ferramentas usam esta função para upload.
 * 
 * v2: Storage quota por empresa, tracking por ferramenta, logging
 * 
 * Parâmetros (FormData):
 * - file: File (obrigatório)
 * - path: string (caminho no CDN, obrigatório)
 * - company_id: string UUID (obrigatório para billing)
 * - tool_id: string (obrigatório: 'rh', 'ead', 'agenda', 'hub')
 * - type: string (opcional: 'storage' | 'stream', default 'storage')
 * 
 * Secrets:
 * - BUNNY_STORAGE_API_KEY
 * - BUNNY_STREAM_API_KEY (para vídeos)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const BUNNY_STORAGE_ZONE = 'sincla-storage'
const BUNNY_HOSTNAME = 'br.storage.bunnycdn.com'
const BUNNY_CDN_URL = 'https://sincla-storage.b-cdn.net'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Custo real por GB/mês
const COST_PER_GB = 0.50
const RESALE_PER_GB = 1.00

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        if (req.method === 'DELETE') {
            return await handleDelete(req)
        }

        if (req.method !== 'POST') {
            return jsonError('Method not allowed', 405)
        }

        const BUNNY_API_KEY = Deno.env.get('BUNNY_STORAGE_API_KEY') || ''

        const formData = await req.formData()
        const file = formData.get('file') as File
        const path = formData.get('path') as string
        const companyId = formData.get('company_id') as string
        const toolId = formData.get('tool_id') as string || 'hub'
        const uploadType = (formData.get('type') as string) || 'storage'

        if (!file || !path) {
            return jsonError('Missing file or path', 400)
        }

        const fileSize = file.size

        // Se company_id informado, verificar quota
        if (companyId) {
            const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
                auth: { autoRefreshToken: false, persistSession: false }
            })

            const quotaField = uploadType === 'stream' ? 'stream_bytes' : 'storage_bytes'
            const quotaLimitField = uploadType === 'stream' ? 'stream_quota_bytes' : 'storage_quota_bytes'

            // Buscar ou criar quota
            let { data: quota } = await supabaseAdmin
                .from('storage_quotas')
                .select('*')
                .eq('company_id', companyId)
                .single()

            if (!quota) {
                // Criar registro de quota
                const { data: newQuota } = await supabaseAdmin
                    .from('storage_quotas')
                    .insert({ company_id: companyId })
                    .select()
                    .single()
                quota = newQuota
            }

            if (quota) {
                const currentUsage = quota[quotaField] || 0
                const limit = quota[quotaLimitField] || 0

                // Verificar se excede quota (0 = ilimitado)
                if (limit > 0 && (currentUsage + fileSize) > limit) {
                    const usedGB = (currentUsage / (1024 * 1024 * 1024)).toFixed(2)
                    const limitGB = (limit / (1024 * 1024 * 1024)).toFixed(2)
                    return jsonError(
                        `Limite de armazenamento atingido (${usedGB}GB / ${limitGB}GB). Adquira mais espaço no painel.`,
                        402,
                        'STORAGE_LIMIT'
                    )
                }
            }
        }

        // Upload para Bunny CDN
        const arrayBuffer = await file.arrayBuffer()
        const content = new Uint8Array(arrayBuffer)

        const bunnyUrl = `https://${BUNNY_HOSTNAME}/${BUNNY_STORAGE_ZONE}/${path}`
        const uploadResponse = await fetch(bunnyUrl, {
            method: 'PUT',
            headers: {
                AccessKey: BUNNY_API_KEY,
                'Content-Type': file.type || 'application/octet-stream',
            },
            body: content,
        })

        if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text()
            return jsonError(`Bunny upload failed: ${uploadResponse.status} - ${errorText}`, 500)
        }

        // URL pública
        const publicUrl = `${BUNNY_CDN_URL}/${path}`

        // Tracking: atualizar quota e logar
        if (companyId) {
            const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
                auth: { autoRefreshToken: false, persistSession: false }
            })

            const quotaField = uploadType === 'stream' ? 'stream_bytes' : 'storage_bytes'
            const countField = uploadType === 'stream' ? 'stream_files_count' : 'storage_files_count'
            const byToolField = uploadType === 'stream' ? 'stream_by_tool' : 'storage_by_tool'

            // Incrementar uso
            const { data: currentQuota } = await supabaseAdmin
                .from('storage_quotas')
                .select(`${quotaField}, ${countField}, ${byToolField}`)
                .eq('company_id', companyId)
                .single()

            if (currentQuota) {
                const byTool = currentQuota[byToolField] || {}
                byTool[toolId] = (byTool[toolId] || 0) + fileSize

                await supabaseAdmin
                    .from('storage_quotas')
                    .update({
                        [quotaField]: (currentQuota[quotaField] || 0) + fileSize,
                        [countField]: (currentQuota[countField] || 0) + 1,
                        [byToolField]: byTool,
                    })
                    .eq('company_id', companyId)
            }

            // Logar uso
            const costPerByte = COST_PER_GB / (1024 * 1024 * 1024)
            const resalePerByte = RESALE_PER_GB / (1024 * 1024 * 1024)

            await supabaseAdmin.from('service_usage_log').insert({
                company_id: companyId,
                service_type: 'storage',
                sub_type: uploadType,
                tool_id: toolId,
                quantity: fileSize,
                unit_cost_brl: costPerByte,
                resale_cost_brl: resalePerByte,
                metadata: {
                    file_name: file.name,
                    file_type: file.type,
                    path,
                    url: publicUrl,
                },
            })
        }

        console.log(`[Upload Asset] OK | company:${companyId || 'N/A'} | tool:${toolId} | size:${fileSize} | path:${path}`)

        return new Response(
            JSON.stringify({
                success: true,
                url: publicUrl,
                path,
                size: fileSize,
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: any) {
        console.error('[Upload Asset] Error:', error)
        return jsonError(error.message || 'Internal server error', 500)
    }
})

// ─── DELETE handler ─────────────────────────────────────────────────────────

async function handleDelete(req: Request): Promise<Response> {
    try {
        const body = await req.json()
        const { path, company_id, tool_id = 'hub', type = 'storage', file_size } = body

        if (!path) {
            return jsonError('Missing path', 400)
        }

        const BUNNY_API_KEY = Deno.env.get('BUNNY_STORAGE_API_KEY') || ''

        // Deletar do Bunny
        const bunnyUrl = `https://${BUNNY_HOSTNAME}/${BUNNY_STORAGE_ZONE}/${path}`
        await fetch(bunnyUrl, {
            method: 'DELETE',
            headers: { AccessKey: BUNNY_API_KEY },
        })

        // Decrementar quota
        if (company_id && file_size) {
            const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
                auth: { autoRefreshToken: false, persistSession: false }
            })

            const quotaField = type === 'stream' ? 'stream_bytes' : 'storage_bytes'
            const countField = type === 'stream' ? 'stream_files_count' : 'storage_files_count'
            const byToolField = type === 'stream' ? 'stream_by_tool' : 'storage_by_tool'

            const { data: currentQuota } = await supabaseAdmin
                .from('storage_quotas')
                .select(`${quotaField}, ${countField}, ${byToolField}`)
                .eq('company_id', company_id)
                .single()

            if (currentQuota) {
                const byTool = currentQuota[byToolField] || {}
                if (byTool[tool_id]) {
                    byTool[tool_id] = Math.max(0, byTool[tool_id] - file_size)
                }

                await supabaseAdmin
                    .from('storage_quotas')
                    .update({
                        [quotaField]: Math.max(0, (currentQuota[quotaField] || 0) - file_size),
                        [countField]: Math.max(0, (currentQuota[countField] || 0) - 1),
                        [byToolField]: byTool,
                    })
                    .eq('company_id', company_id)
            }
        }

        console.log(`[Upload Asset] DELETED | path:${path}`)

        return new Response(
            JSON.stringify({ success: true, deleted: path }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    } catch (error: any) {
        return jsonError(error.message || 'Delete failed', 500)
    }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function jsonError(message: string, status: number, errorCode?: string): Response {
    return new Response(
        JSON.stringify({ success: false, error: message, ...(errorCode && { error_code: errorCode }) }),
        { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
}
