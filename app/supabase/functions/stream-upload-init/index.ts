/**
 * stream-upload-init — Inicia um upload de vídeo no Bunny Stream pelo Hub.
 *
 * A chave do Bunny NUNCA sai do servidor. A ferramenta (EAD etc.) chama esta
 * função com { company_id, tool_id, title, filename, file_size } e recebe de
 * volta as credenciais TUS assinadas para subir os bytes direto ao Bunny,
 * dentro da Collection exclusiva da empresa.
 *
 * Faz: garante a Collection da empresa, checa a quota de stream, cria o vídeo
 * na Collection, assina o TUS e registra o vídeo em stream_videos (fonte única).
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const BUNNY_API = 'https://video.bunnycdn.com'

function json(data: unknown, status = 200): Response {
    return new Response(JSON.stringify(data), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
}

// Credenciais do Bunny: env secret se existir, senão Vault via get_secret (service_role).
async function getBunnyCreds(admin: any): Promise<{ key: string; lib: string }> {
    let key = Deno.env.get('BUNNY_STREAM_API_KEY') || ''
    let lib = Deno.env.get('BUNNY_STREAM_LIBRARY_ID') || ''
    if (!key) key = (await admin.rpc('get_secret', { p_name: 'bunny_stream_api_key' })).data || ''
    if (!lib) lib = (await admin.rpc('get_secret', { p_name: 'bunny_stream_library_id' })).data || ''
    return { key, lib }
}

async function sha256Hex(input: string): Promise<string> {
    const data = new TextEncoder().encode(input)
    const buf = await crypto.subtle.digest('SHA-256', data)
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
    if (req.method !== 'POST') return json({ success: false, error: 'Method not allowed' }, 405)

    try {
        const { company_id, tool_id = 'ead', title, filename, file_size = 0 } = await req.json()
        if (!company_id || !title) {
            return json({ success: false, error: 'Campos obrigatórios: company_id, title' }, 400)
        }

        const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
            auth: { autoRefreshToken: false, persistSession: false },
        })

        const { key: BUNNY_KEY, lib: BUNNY_LIB } = await getBunnyCreds(admin)
        if (!BUNNY_KEY || !BUNNY_LIB) {
            return json({ success: false, error: 'Credenciais do Bunny ausentes no servidor' }, 500)
        }

        // Empresa precisa existir
        const { data: company } = await admin
            .from('companies').select('id, name').eq('id', company_id).maybeSingle()
        if (!company) return json({ success: false, error: 'Empresa não encontrada' }, 404)

        // Checagem de quota de stream (bloqueia upload acima do contratado)
        const { data: quota } = await admin
            .from('storage_quotas')
            .select('stream_bytes, stream_quota_bytes, auto_expand')
            .eq('company_id', company_id).maybeSingle()
        if (quota?.stream_quota_bytes && file_size > 0) {
            const projected = (quota.stream_bytes || 0) + Number(file_size)
            if (projected > quota.stream_quota_bytes) {
                // Auto-expansão (opt-in): tenta ampliar a cota cobrando o cartão salvo.
                let expanded = false
                if (quota.auto_expand) {
                    const need = projected - quota.stream_quota_bytes
                    try {
                        const r = await fetch(`${SUPABASE_URL}/functions/v1/storage-auto-expand`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SERVICE_KEY}` },
                            body: JSON.stringify({ company_id, needed_bytes: need }),
                        })
                        const ar = await r.json().catch(() => ({}))
                        expanded = !!ar?.success
                        if (!expanded) {
                            return json({
                                success: false,
                                error: 'quota_exceeded',
                                reason: ar?.reason || 'auto_expand_failed',
                                message: ar?.message || 'Não foi possível ampliar o armazenamento automaticamente.',
                                used_bytes: quota.stream_bytes || 0,
                                quota_bytes: quota.stream_quota_bytes,
                            }, 402)
                        }
                    } catch (e) {
                        console.error('[stream-upload-init] auto-expand erro', e)
                        return json({ success: false, error: 'quota_exceeded', reason: 'auto_expand_error', message: 'Falha ao ampliar armazenamento.' }, 402)
                    }
                }
                if (!expanded) {
                    return json({
                        success: false,
                        error: 'quota_exceeded',
                        message: 'Armazenamento de vídeo esgotado. Adquira mais espaço no Hub.',
                        used_bytes: quota.stream_bytes || 0,
                        quota_bytes: quota.stream_quota_bytes,
                    }, 402)
                }
            }
        }

        // Garantir Collection da empresa
        let { data: coll } = await admin
            .from('stream_collections').select('collection_id').eq('company_id', company_id).maybeSingle()
        let collectionId = coll?.collection_id
        if (!collectionId) {
            const cr = await fetch(`${BUNNY_API}/library/${BUNNY_LIB}/collections`, {
                method: 'POST',
                headers: { AccessKey: BUNNY_KEY, 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: `${company.name} [${company_id}]` }),
            })
            if (!cr.ok) return json({ success: false, error: 'Falha ao criar collection no Bunny' }, 502)
            const c = await cr.json()
            collectionId = c.guid
            await admin.from('stream_collections').insert({
                company_id, provider: 'bunny', library_id: BUNNY_LIB, collection_id: collectionId,
            })
        }

        // Criar vídeo dentro da Collection
        const vr = await fetch(`${BUNNY_API}/library/${BUNNY_LIB}/videos`, {
            method: 'POST',
            headers: { AccessKey: BUNNY_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, collectionId }),
        })
        if (!vr.ok) return json({ success: false, error: 'Falha ao criar vídeo no Bunny' }, 502)
        const video = await vr.json()
        const guid = video.guid

        // Assinar TUS no servidor: SHA256(libraryId + apiKey + expire + videoGuid)
        const expire = Math.floor(Date.now() / 1000) + 3600
        const signature = await sha256Hex(`${BUNNY_LIB}${BUNNY_KEY}${expire}${guid}`)

        // Registrar como fonte única
        await admin.from('stream_videos').insert({
            guid, company_id, tool_id, provider: 'bunny',
            library_id: BUNNY_LIB, collection_id: collectionId,
            title, filename: filename || null, status: 'created',
        })

        console.log(`[stream-upload-init] company:${company_id} collection:${collectionId} guid:${guid}`)

        return json({
            success: true,
            libraryId: BUNNY_LIB,
            videoGuid: guid,
            collectionId,
            authorizationSignature: signature,
            authorizationExpire: expire,
            endpoint: `${BUNNY_API}/tusupload`,
        })
    } catch (err: any) {
        console.error('[stream-upload-init]', err)
        return json({ success: false, error: err.message || 'Erro interno' }, 500)
    }
})
