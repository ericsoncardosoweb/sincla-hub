// =====================================================
// SINCLA HUB - Edge Function: people-sync
// Cadastro único de pessoas: recebe mudanças das ferramentas e entrega nas demais.
//
// Autenticação por segredo de serviço no header x-people-sync-secret:
//   PEOPLE_SYNC_SECRET_HUB → cron do Hub (action: drain)
//   PEOPLE_SYNC_SECRET_RH  → gatilho do banco do RH (action: ingest)
//   PEOPLE_SYNC_SECRET_EAD → banco/funções do EAD (actions: ingest, school_ready, rule)
// Acesso às ferramentas: TOOL_{PRODUTO}_SUPABASE_URL / TOOL_{PRODUTO}_SERVICE_ROLE_KEY
// =====================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const CALLER_SECRETS: Record<string, string | undefined> = {
    hub: Deno.env.get('PEOPLE_SYNC_SECRET_HUB'),
    rh: Deno.env.get('PEOPLE_SYNC_SECRET_RH'),
    ead: Deno.env.get('PEOPLE_SYNC_SECRET_EAD'),
}

declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void }

const DRAIN_BUDGET_MS = 45_000
const BATCH_SIZE = 25

type Caller = 'hub' | 'rh' | 'ead'

interface Person {
    id: string
    company_id: string
    name: string | null
    email: string | null
    cpf: string | null
    whatsapp: string | null
    job_title: string | null
    team_name: string | null
    status: 'active' | 'inactive'
}

interface OutboxRow {
    id: number
    company_id: string
    person_id: string
    target_product: string
    operation: 'upsert' | 'deactivate'
}

type DeliveryResult =
    | { status: 'done'; externalId?: string }
    | { status: 'skipped'; reason: string }

function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    })
}

function safeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false
    let diff = 0
    for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
    return diff === 0
}

function resolveCaller(req: Request): Caller | null {
    const provided = req.headers.get('x-people-sync-secret') ?? ''
    if (!provided) return null
    for (const [caller, secret] of Object.entries(CALLER_SECRETS)) {
        if (secret && safeEqual(provided, secret)) return caller as Caller
    }
    return null
}

const toolClients = new Map<string, SupabaseClient | null>()
function toolClient(productId: string): SupabaseClient | null {
    if (!toolClients.has(productId)) {
        const upper = productId.toUpperCase()
        const url = Deno.env.get(`TOOL_${upper}_SUPABASE_URL`)
        const key = Deno.env.get(`TOOL_${upper}_SERVICE_ROLE_KEY`)
        toolClients.set(
            productId,
            url && key ? createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } }) : null,
        )
    }
    return toolClients.get(productId) ?? null
}

const digits = (v: unknown) => String(v ?? '').replace(/\D/g, '')
const sameText = (a: unknown, b: unknown) => String(a ?? '').trim() === String(b ?? '').trim()
const sameEmail = (a: unknown, b: unknown) =>
    String(a ?? '').trim().toLowerCase() === String(b ?? '').trim().toLowerCase()
const escapeLike = (v: string) => v.replace(/[\\%_]/g, (m) => `\\${m}`)

// -----------------------------------------------------
// Entrega no EAD
// -----------------------------------------------------
async function findEadUserByEmail(ead: SupabaseClient, email: string): Promise<string | null> {
    const { data: profile } = await ead
        .from('profiles')
        .select('id')
        .ilike('email', escapeLike(email))
        .limit(1)
        .maybeSingle()
    if (profile?.id) return profile.id

    // Usuário existe no auth do EAD sem profile: generateLink devolve o usuário sem enviar e-mail
    const { data: link } = await ead.auth.admin.generateLink({ type: 'magiclink', email })
    return link?.user?.id ?? null
}

async function deliverEad(person: Person, externalId: string | null, op: OutboxRow['operation']): Promise<DeliveryResult> {
    const ead = toolClient('ead')
    if (!ead) throw new Error('EAD não configurado no Hub (TOOL_EAD_SUPABASE_URL / TOOL_EAD_SERVICE_ROLE_KEY)')

    const { data: tenant, error: tenantErr } = await ead
        .from('tenants')
        .select('id')
        .eq('hub_company_id', person.company_id)
        .limit(1)
        .maybeSingle()
    if (tenantErr) throw new Error(`EAD tenants: ${tenantErr.message}`)
    if (!tenant) return { status: 'skipped', reason: 'Escola do EAD não encontrada para a empresa' }

    if (op === 'deactivate') {
        if (!externalId) return { status: 'done' }
        const { error } = await ead
            .from('tenant_members')
            .delete()
            .eq('tenant_id', tenant.id)
            .eq('user_id', externalId)
            .eq('role', 'aluno')
        if (error) throw new Error(`EAD tenant_members: ${error.message}`)
        return { status: 'done', externalId }
    }

    if (!person.email) return { status: 'skipped', reason: 'missing_email' }

    let userId = externalId
    if (!userId) {
        userId = await findEadUserByEmail(ead, person.email)
    }

    if (!userId) {
        const { data: created, error: createErr } = await ead.auth.admin.createUser({
            email: person.email,
            email_confirm: true,
            password: crypto.randomUUID() + crypto.randomUUID(),
            user_metadata: { name: person.name, hub_person_id: person.id },
        })
        if (createErr || !created?.user) throw new Error(`EAD createUser: ${createErr?.message ?? 'sem usuário'}`)
        userId = created.user.id
    } else {
        const { data: authUser } = await ead.auth.admin.getUserById(userId)
        if (authUser?.user && !sameEmail(authUser.user.email, person.email)) {
            const { error: emailErr } = await ead.auth.admin.updateUserById(userId, {
                email: person.email,
                email_confirm: true,
            })
            if (emailErr) throw new Error(`EAD e-mail de login: ${emailErr.message}`)
        }
    }

    const { data: profile } = await ead
        .from('profiles')
        .select('id, name, email, cpf, whatsapp, current_tenant_id')
        .eq('id', userId)
        .maybeSingle()

    if (!profile) {
        const { error } = await ead.from('profiles').insert({
            id: userId,
            email: person.email,
            name: person.name,
            cpf: person.cpf,
            whatsapp: person.whatsapp,
            role: 'aluno',
            current_tenant_id: tenant.id,
        })
        if (error) throw new Error(`EAD profiles insert: ${error.message}`)
    } else {
        const patch: Record<string, unknown> = {}
        if (person.name && !sameText(profile.name, person.name)) patch.name = person.name
        if (!sameEmail(profile.email, person.email)) patch.email = person.email
        if (person.cpf && digits(profile.cpf) !== person.cpf) patch.cpf = person.cpf
        if (person.whatsapp && digits(profile.whatsapp) !== person.whatsapp) patch.whatsapp = person.whatsapp
        if (!profile.current_tenant_id) patch.current_tenant_id = tenant.id
        if (Object.keys(patch).length > 0) {
            const { error } = await ead.from('profiles').update(patch).eq('id', userId)
            if (error) throw new Error(`EAD profiles update: ${error.message}`)
        }
    }

    const { data: member } = await ead
        .from('tenant_members')
        .select('id, job_title, team_name, hub_person_id')
        .eq('tenant_id', tenant.id)
        .eq('user_id', userId)
        .maybeSingle()

    const memberFields = {
        job_title: person.job_title,
        team_name: person.team_name,
        hub_person_id: person.id,
    }

    if (!member) {
        const { error } = await ead
            .from('tenant_members')
            .insert({ tenant_id: tenant.id, user_id: userId, role: 'aluno', ...memberFields })
        if (error) throw new Error(`EAD tenant_members insert: ${error.message}`)
    } else if (
        !sameText(member.job_title, person.job_title) ||
        !sameText(member.team_name, person.team_name) ||
        member.hub_person_id !== person.id
    ) {
        const { error } = await ead.from('tenant_members').update(memberFields).eq('id', member.id)
        if (error) throw new Error(`EAD tenant_members update: ${error.message}`)
    }

    return { status: 'done', externalId: userId }
}

// -----------------------------------------------------
// Entrega no RH (só campos compartilhados — RH é a fonte oficial do resto)
// -----------------------------------------------------
async function deliverRh(person: Person, externalId: string | null, op: OutboxRow['operation']): Promise<DeliveryResult> {
    if (op === 'deactivate') return { status: 'skipped', reason: 'RH é a origem da situação' }
    if (!externalId) return { status: 'skipped', reason: 'Pessoa sem colaborador no RH' }

    const rh = toolClient('rh')
    if (!rh) throw new Error('RH não configurado no Hub (TOOL_RH_SUPABASE_URL / TOOL_RH_SERVICE_ROLE_KEY)')

    const { data: colab, error: readErr } = await rh
        .from('colaboradores')
        .select('id, nome, email, celular')
        .eq('id', externalId)
        .eq('empresa_id', person.company_id)
        .maybeSingle()
    if (readErr) throw new Error(`RH colaboradores: ${readErr.message}`)
    if (!colab) return { status: 'skipped', reason: 'Colaborador não encontrado no RH' }

    const patch: Record<string, unknown> = {}
    if (person.name && !sameText(colab.nome, person.name)) patch.nome = person.name
    if (person.email && !sameEmail(colab.email, person.email)) patch.email = person.email
    if (person.whatsapp && digits(colab.celular) !== person.whatsapp) patch.celular = person.whatsapp

    if (Object.keys(patch).length > 0) {
        const { error } = await rh.from('colaboradores').update(patch).eq('id', externalId)
        if (error) throw new Error(`RH colaboradores update: ${error.message}`)
    }
    return { status: 'done', externalId }
}

const DELIVERERS: Record<string, typeof deliverEad> = {
    ead: deliverEad,
    rh: deliverRh,
}

// -----------------------------------------------------
// Drenagem da fila
// -----------------------------------------------------
async function drain(hub: SupabaseClient, budgetMs = DRAIN_BUDGET_MS) {
    const started = Date.now()
    const stats = { done: 0, skipped: 0, errors: 0 }

    while (Date.now() - started < budgetMs) {
        const { data: batch, error } = await hub.rpc('claim_people_sync_batch', { p_limit: BATCH_SIZE })
        if (error) throw new Error(`claim_people_sync_batch: ${error.message}`)
        const rows = (batch ?? []) as OutboxRow[]
        if (rows.length === 0) break

        for (const row of rows) {
            try {
                const deliver = DELIVERERS[row.target_product]
                if (!deliver) {
                    await hub.rpc('complete_people_sync', {
                        p_outbox_id: row.id, p_status: 'skipped', p_error: `Destino sem integração: ${row.target_product}`,
                    })
                    stats.skipped++
                    continue
                }

                const { data: person } = await hub
                    .from('company_people')
                    .select('id, company_id, name, email, cpf, whatsapp, job_title, team_name, status')
                    .eq('id', row.person_id)
                    .maybeSingle()
                if (!person) {
                    await hub.rpc('complete_people_sync', { p_outbox_id: row.id, p_status: 'skipped', p_error: 'Pessoa removida' })
                    stats.skipped++
                    continue
                }

                const { data: link } = await hub
                    .from('company_person_links')
                    .select('external_id')
                    .eq('person_id', row.person_id)
                    .eq('product_id', row.target_product)
                    .maybeSingle()

                const result = await deliver(person as Person, link?.external_id ?? null, row.operation)

                if (result.status === 'done') {
                    await hub.rpc('complete_people_sync', {
                        p_outbox_id: row.id, p_status: 'done', p_external_id: result.externalId ?? null,
                    })
                    stats.done++
                } else {
                    await hub.rpc('complete_people_sync', { p_outbox_id: row.id, p_status: 'skipped', p_error: result.reason })
                    stats.skipped++
                }
            } catch (err) {
                const message = err instanceof Error ? err.message : String(err)
                console.error(`[people-sync] entrega ${row.id} → ${row.target_product}:`, message)
                await hub.rpc('complete_people_sync', { p_outbox_id: row.id, p_status: 'error', p_error: message })
                stats.errors++
            }
        }
    }

    return stats
}

// -----------------------------------------------------
// Ingestão
// -----------------------------------------------------
interface IncomingChange {
    company_id: string
    external_id: string
    fields: Record<string, unknown>
    changed_at?: string
}

async function ingest(hub: SupabaseClient, source: Caller, changes: IncomingChange[]) {
    const results = []
    for (const change of changes) {
        if (!change?.company_id || !change?.external_id || typeof change.fields !== 'object') {
            results.push({ status: 'invalid' })
            continue
        }
        const { data, error } = await hub.rpc('ingest_person_change', {
            p_company_id: change.company_id,
            p_source: source,
            p_external_id: String(change.external_id),
            p_fields: change.fields,
            p_changed_at: change.changed_at ?? new Date().toISOString(),
        })
        results.push(error ? { status: 'error', message: error.message } : data)
    }
    return results
}

Deno.serve(async (req) => {
    if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405)

    const caller = resolveCaller(req)
    if (!caller) return json({ error: 'Não autorizado' }, 401)

    const hub = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
    })

    try {
        const body = await req.json().catch(() => ({}))
        const action = body?.action

        if (action === 'drain') {
            if (caller !== 'hub') return json({ error: 'Não autorizado' }, 403)
            return json({ ok: true, ...(await drain(hub)) })
        }

        if (action === 'ingest') {
            if (caller === 'hub') return json({ error: 'Origem inválida' }, 403)
            const changes: IncomingChange[] = Array.isArray(body.changes) ? body.changes : [body]
            const results = await ingest(hub, caller, changes)

            // Entrega imediata em segundo plano; o cron cobre o que ficar para trás
            EdgeRuntime.waitUntil(drain(hub, 10_000).catch((err) => console.error('[people-sync] drain:', err)))

            return json({ ok: true, results })
        }

        // Escola do EAD ligada a uma empresa do Hub: traz quem já está no RH (se a regra estiver ligada)
        if (action === 'school_ready') {
            if (caller !== 'ead') return json({ error: 'Não autorizado' }, 403)
            if (!body.company_id) return json({ error: 'company_id é obrigatório' }, 400)
            const { data: queued, error } = await hub.rpc('queue_company_people_sync', {
                p_company_id: body.company_id, p_source: 'rh', p_target: 'ead',
            })
            if (error) throw new Error(`queue_company_people_sync: ${error.message}`)
            if (queued) EdgeRuntime.waitUntil(drain(hub, 30_000).catch((err) => console.error('[people-sync] drain:', err)))
            return json({ ok: true, queued: queued ?? 0 })
        }

        // Consulta/liga/desliga a sincronização RH → EAD a partir do EAD
        if (action === 'rule') {
            if (caller !== 'ead') return json({ error: 'Não autorizado' }, 403)
            if (!body.company_id) return json({ error: 'company_id é obrigatório' }, 400)

            const { data: rule, error } = await hub
                .from('company_people_sync_rules')
                .select('id, enabled, revoke_on_inactive')
                .eq('company_id', body.company_id)
                .eq('source_product', 'rh')
                .eq('target_product', 'ead')
                .maybeSingle()
            if (error) throw new Error(`company_people_sync_rules: ${error.message}`)
            if (!rule) return json({ available: false })

            let enabled = rule.enabled
            if (typeof body.enabled === 'boolean' && body.enabled !== rule.enabled) {
                const { error: updErr } = await hub
                    .from('company_people_sync_rules')
                    .update({ enabled: body.enabled })
                    .eq('id', rule.id)
                if (updErr) throw new Error(`company_people_sync_rules update: ${updErr.message}`)
                enabled = body.enabled
                if (enabled) {
                    EdgeRuntime.waitUntil(drain(hub, 30_000).catch((err) => console.error('[people-sync] drain:', err)))
                }
            }

            return json({ available: true, enabled, revoke_on_inactive: rule.revoke_on_inactive })
        }

        return json({ error: `Ação desconhecida: ${action}` }, 400)
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        console.error('[people-sync] erro:', message)
        return json({ error: message }, 500)
    }
})
