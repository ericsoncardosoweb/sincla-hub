/**
 * AI Gateway — Serviço Unificado de IA (Sincla Hub)
 * 
 * Edge Function centralizada que roteia chamadas de IA para o modelo correto.
 * Todos os satélites (RH, EAD, CRM) consomem esta função.
 * 
 * Modelos:
 * - nano  → gpt-4.1-nano  (geração simples, textos, formatação)
 * - mini  → gpt-4.1-mini  (análises complexas, relatórios, JSON)
 * 
 * Secrets necessárias:
 * - OPENAI_API_KEY → Chave da API OpenAI
 */

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ─── Tipos ───────────────────────────────────────────────────────────────────

type AILevel = 'nano' | 'mini'
type AIAction = 'chat' | 'json'

interface AIGatewayRequest {
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
    error?: string
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
        // Autenticação básica (requer header Authorization)
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return jsonResponse({ success: false, error: 'Não autorizado' }, 401)
        }

        // Rate limiting por IP
        const clientIp = req.headers.get('x-forwarded-for') || 'unknown'
        if (!checkRateLimit(clientIp)) {
            return jsonResponse(
                { success: false, error: 'Muitas requisições. Tente novamente em 1 minuto.' },
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
            action = 'chat',
            level = 'mini',
            system,
            messages = [],
            temperature = 0.7,
            maxTokens,
        } = body

        // Validação
        if (!messages || messages.length === 0) {
            return jsonResponse({ success: false, error: 'messages é obrigatório' }, 400)
        }

        if (!['nano', 'mini'].includes(level)) {
            return jsonResponse({ success: false, error: 'level deve ser "nano" ou "mini"' }, 400)
        }

        // Selecionar modelo
        const model = MODEL_MAP[level]
        const resolvedMaxTokens = maxTokens || DEFAULT_MAX_TOKENS[level]

        // Montar mensagens para OpenAI
        const apiMessages: Array<{ role: string; content: string }> = []

        // System prompt
        if (system) {
            apiMessages.push({ role: 'system', content: system })
        }

        // Mensagens do usuário
        for (const msg of messages) {
            apiMessages.push({ role: msg.role, content: msg.content })
        }

        // Configurar response_format
        const responseFormat = action === 'json'
            ? { type: 'json_object' }
            : undefined

        console.log(`[AI Gateway] ${level}/${model} | action:${action} | msgs:${apiMessages.length} | maxTokens:${resolvedMaxTokens}`)

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

        console.log(`[AI Gateway] OK | tokens: ${usage?.total_tokens || '?'}`)

        return jsonResponse({
            success: true,
            content,
            model,
            usage: usage ? {
                prompt_tokens: usage.prompt_tokens,
                completion_tokens: usage.completion_tokens,
                total_tokens: usage.total_tokens,
            } : undefined,
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
