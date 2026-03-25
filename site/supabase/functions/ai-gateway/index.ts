/**
 * AI Gateway v2 — Serviço Unificado de IA (Sincla Hub)
 * 
 * Edge Function centralizada que roteia chamadas de IA para o modelo correto.
 * Todos os satélites (RH, EAD, CRM, Agenda) consomem esta função.
 * 
 * v2: Adicionado billing de tokens via company_credits + service_usage_log
 * 
 * Modelos:
 * - nano  → gpt-5.4-nano  (geração simples, textos, formatação)
 * - mini  → gpt-5.4-mini  (análises complexas, relatórios, JSON)
 * 
 * Parâmetros OBRIGATÓRIOS para billing:
 * - company_id → UUID da empresa
 * - tool_id    → 'rh', 'ead', 'agenda', 'hub'
 * 
 * Secrets necessárias:
 * - OPENAI_API_KEY → Chave da API OpenAI
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ─── Tipos ───────────────────────────────────────────────────────────────────

type AILevel = 'nano' | 'mini'
type AIAction = 'chat' | 'json'

interface AIGatewayRequest {
    /** UUID da empresa (OBRIGATÓRIO para billing) */
    company_id: string
    /** Ferramenta origem: 'rh', 'ead', 'agenda', 'hub' */
    tool_id: string
    /** 'chat' = texto livre, 'json' = resposta em json_object */
    action: AIAction
    /** 'nano' = simples/barato, 'mini' = complexo/análises */
    level: AILevel
    /** System prompt */
    system?: string
    /** Mensagens do chat */
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
    /** Temperatura (0-1), default 0.7 */
    temperature?: number
    /** Max tokens de resposta, default depende do nível */
    maxTokens?: number
    /** Se true, pula verificação de créditos (APENAS para service_role) */
    skipBilling?: boolean
}

interface AIGatewayResponse {
    success: boolean
    content?: string
    model?: string
    usage?: {
        prompt_tokens: number
        completion_tokens: number
        total_tokens: number
    }
    remaining_credits?: number
    error?: string
    error_code?: string
}

// ─── Mapeamento de modelos ────────────────────────────────────────────────────

const MODEL_MAP: Record<AILevel, string> = {
    nano: 'gpt-5.4-nano',
    mini: 'gpt-5.4-mini',
}

const DEFAULT_MAX_TOKENS: Record<AILevel, number> = {
    nano: 1000,
    mini: 2000,
}

// Custo real por 1M tokens (input+output médio)
const COST_PER_MILLION: Record<AILevel, number> = {
    nano: 3.50,  // R$ 3.50 / 1M tokens
    mini: 7.50,  // R$ 7.50 / 1M tokens
}

const RESALE_PER_MILLION = 15.00 // R$ 15.00 / 1M tokens (preço ao cliente)

// ─── Rate Limiting simples (por isolate) ──────────────────────────────────────

const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

function checkRateLimit(key: string, maxPerMinute = 30): boolean {
    const now = Date.now()
    const entry = rateLimitMap.get(key)

    if (!entry || entry.resetTime < now) {
        rateLimitMap.set(key, { count: 1, resetTime: now + 60000 })
        return true
    }

    if (entry.count >= maxPerMinute) return false
    entry.count++
    return true
}

// ─── Supabase Admin ──────────────────────────────────────────────────────────

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

function getAdminClient() {
    return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false }
    })
}

// ─── Main handler ────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
    // CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    if (req.method !== 'POST') {
        return jsonResponse({ success: false, error: 'Method not allowed' }, 405)
    }

    try {
        // Autenticação (requer header Authorization)
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return jsonResponse({ success: false, error: 'Não autorizado' }, 401)
        }

        // Rate limiting por IP
        const clientIp = req.headers.get('x-forwarded-for') || 'unknown'
        if (!checkRateLimit(clientIp)) {
            return jsonResponse(
                { success: false, error: 'Muitas requisições. Tente novamente em 1 minuto.', error_code: 'RATE_LIMITED' },
                429
            )
        }

        // Validar API Key
        const openaiKey = Deno.env.get('OPENAI_API_KEY')
        if (!openaiKey) {
            console.error('[AI Gateway] OPENAI_API_KEY não configurada')
            return jsonResponse(
                { success: false, error: 'Serviço de IA não configurado' },
                500
            )
        }

        // Parse request
        const body: AIGatewayRequest = await req.json()
        const {
            company_id,
            tool_id = 'hub',
            action = 'chat',
            level = 'mini',
            system,
            messages = [],
            temperature = 0.7,
            maxTokens,
            skipBilling = false,
        } = body

        // Validação
        if (!company_id) {
            return jsonResponse({ success: false, error: 'company_id é obrigatório', error_code: 'MISSING_COMPANY' }, 400)
        }

        if (!messages || messages.length === 0) {
            return jsonResponse({ success: false, error: 'messages é obrigatório' }, 400)
        }

        if (!['nano', 'mini'].includes(level)) {
            return jsonResponse({ success: false, error: 'level deve ser "nano" ou "mini"' }, 400)
        }

        const supabaseAdmin = getAdminClient()

        // ═══════════════════════════════════════════════
        // BILLING: Verificar saldo ANTES da chamada
        // ═══════════════════════════════════════════════
        
        // Verificar se service_role está chamando (pode pular billing)
        const isServiceRole = authHeader.replace('Bearer ', '') === SUPABASE_SERVICE_ROLE_KEY
        const shouldBill = !skipBilling || !isServiceRole

        if (shouldBill) {
            const { data: credits } = await supabaseAdmin
                .from('company_credits')
                .select('balance')
                .eq('company_id', company_id)
                .eq('service_type', 'ai')
                .single()

            if (!credits || credits.balance <= 0) {
                return jsonResponse({
                    success: false,
                    error: 'Créditos de IA esgotados. Adquira mais créditos no painel.',
                    error_code: 'NO_CREDITS',
                    remaining_credits: credits?.balance || 0,
                }, 402)
            }

            // Estimar tokens necessários (conservador: ~4 chars/token)
            const estimatedTokens = messages.reduce((acc, m) => acc + Math.ceil(m.content.length / 4), 0)
            const maxNeeded = estimatedTokens + (maxTokens || DEFAULT_MAX_TOKENS[level])

            if (credits.balance < maxNeeded) {
                console.warn(`[AI Gateway] Low credits: ${credits.balance} < estimated ${maxNeeded}`)
                // Não bloqueia, só avisa — o débito real acontece depois
            }
        }

        // Selecionar modelo
        const model = MODEL_MAP[level]
        const resolvedMaxTokens = maxTokens || DEFAULT_MAX_TOKENS[level]

        // Montar mensagens para OpenAI
        const apiMessages: Array<{ role: string; content: string }> = []
        if (system) {
            apiMessages.push({ role: 'system', content: system })
        }
        for (const msg of messages) {
            apiMessages.push({ role: msg.role, content: msg.content })
        }

        // Configurar response_format
        const responseFormat = action === 'json'
            ? { type: 'json_object' }
            : undefined

        console.log(`[AI Gateway] ${level}/${model} | company:${company_id} | tool:${tool_id} | action:${action} | msgs:${apiMessages.length}`)

        // Chamar OpenAI
        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openaiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model,
                messages: apiMessages,
                temperature,
                max_tokens: resolvedMaxTokens,
                ...(responseFormat && { response_format: responseFormat }),
            }),
        })

        if (!openaiResponse.ok) {
            const errorData = await openaiResponse.text()
            console.error(`[AI Gateway] OpenAI Error (${openaiResponse.status}):`, errorData)
            return jsonResponse(
                { success: false, error: `Erro na API de IA (${openaiResponse.status})` },
                502
            )
        }

        const data = await openaiResponse.json()
        const content = data.choices?.[0]?.message?.content || ''
        const usage = data.usage
        const totalTokens = usage?.total_tokens || 0

        // ═══════════════════════════════════════════════
        // BILLING: Debitar tokens consumidos
        // ═══════════════════════════════════════════════

        let remainingCredits: number | undefined

        if (shouldBill && totalTokens > 0) {
            // Debitar via function com lock
            const { data: debitResult } = await supabaseAdmin.rpc('debit_credits', {
                p_company_id: company_id,
                p_service_type: 'ai',
                p_amount: totalTokens,
            })

            if (debitResult?.success) {
                remainingCredits = debitResult.balance
            } else {
                console.warn('[AI Gateway] Debit failed (post-call):', debitResult)
                remainingCredits = 0
            }

            // Logar consumo
            const costPerToken = COST_PER_MILLION[level] / 1_000_000
            const resalePerToken = RESALE_PER_MILLION / 1_000_000

            await supabaseAdmin.from('service_usage_log').insert({
                company_id,
                service_type: 'ai',
                sub_type: `gpt-${level}`,
                tool_id,
                quantity: totalTokens,
                unit_cost_brl: costPerToken,
                resale_cost_brl: resalePerToken,
                metadata: {
                    model,
                    prompt_tokens: usage?.prompt_tokens,
                    completion_tokens: usage?.completion_tokens,
                    action,
                },
            })
        }

        console.log(`[AI Gateway] OK | tokens: ${totalTokens} | remaining: ${remainingCredits ?? 'N/A'}`)

        return jsonResponse({
            success: true,
            content,
            model,
            usage: usage ? {
                prompt_tokens: usage.prompt_tokens,
                completion_tokens: usage.completion_tokens,
                total_tokens: usage.total_tokens,
            } : undefined,
            remaining_credits: remainingCredits,
        })

    } catch (error) {
        console.error('[AI Gateway] Erro:', error)
        return jsonResponse(
            { success: false, error: (error as Error).message || 'Erro interno' },
            500
        )
    }
})

// ─── Helpers ─────────────────────────────────────────────────────────────────

function jsonResponse(data: AIGatewayResponse, status = 200): Response {
    return new Response(JSON.stringify(data), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
}
