// Asaas Checkout Edge Function — Sincla Hub
// Proxy seguro para API Asaas + sync com Supabase
// Baseado na implementação do Vibra Eu

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ASAAS_PROD_URL = 'https://api.asaas.com/v3'
const ASAAS_SANDBOX_URL = 'https://sandbox.asaas.com/api/v3'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept',
    'Access-Control-Max-Age': '86400',
}

interface AsaasRequest {
    endpoint: string
    method: 'GET' | 'POST' | 'PUT' | 'DELETE'
    data?: Record<string, unknown>
    userId?: string
    productId?: string
    sandbox?: boolean
}

interface AsaasError {
    errors?: Array<{ code: string; description: string }>
}

// =============================================
// RATE LIMITING MIGRATION (In-Memory per Isolate)
// =============================================
const ipRateLimit = new Map<string, { count: number; resetTime: number }>()

function checkRateLimit(ip: string): boolean {
    const now = Date.now()
    const limitData = ipRateLimit.get(ip)

    if (!limitData || limitData.resetTime < now) {
        // Reset or create new limit: max 5 requests per minute
        ipRateLimit.set(ip, { count: 1, resetTime: now + 60000 })
        return true
    }

    if (limitData.count >= 5) {
        return false // Blocked
    }

    limitData.count += 1
    return true
}

Deno.serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, {
            status: 200,
            headers: corsHeaders
        })
    }

    try {
        // Verificar autenticação
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: 'Não autorizado' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // =============================================
        // SEGURANÇA: Rate Limiting por IP
        // =============================================
        const clientIp = req.headers.get('x-forwarded-for') || 'unknown'
        if (!checkRateLimit(clientIp)) {
            console.warn(`[Asaas Checkout] RATE LIMIT BLOQUEADO: IP ${clientIp}`)
            return new Response(
                JSON.stringify({ error: 'Muitas tentativas. Tente novamente em alguns minutos.' }),
                { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Parse request body
        const body: AsaasRequest = await req.json()
        const { endpoint, method = 'GET', data, userId, productId, sandbox = false } = body

        if (!endpoint) {
            return new Response(
                JSON.stringify({ error: 'Endpoint é obrigatório' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Identificar se a chamada vem de ambiente local
        const origin = req.headers.get('origin') || ''
        const isLocalhost = origin.includes('localhost') || origin.includes('127.0.0.1')

        // Forçar ambiente Sandbox no localhost, ou usar o valor do payload para outros ambientes
        const isSandbox = isLocalhost || sandbox

        // Selecionar ambiente
        const baseUrl = isSandbox ? ASAAS_SANDBOX_URL : ASAAS_PROD_URL
        const apiKey = isSandbox
            ? Deno.env.get('ASAAS_SANDBOX_API_KEY')
            : Deno.env.get('ASAAS_PROD_API_KEY')

        if (!apiKey) {
            console.error(`[Asaas Checkout] API Key não configurada para ambiente: ${isSandbox ? 'sandbox' : 'prod'}`)
            return new Response(
                JSON.stringify({ error: 'Configuração de API inválida' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        console.log(`[Asaas Checkout] ${method} ${endpoint} | sandbox: ${isSandbox} (origin: ${origin}) | userId: ${userId}`)

        // Preparar requisição para Asaas
        const asaasUrl = `${baseUrl}${endpoint}`
        const fetchOptions: RequestInit = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'access_token': apiKey,
                'User-Agent': 'SinclaHub/1.0'
            }
        }

        // Adicionar body para métodos que suportam
        if (data && typeof data === 'object' && ['POST', 'PUT', 'PATCH'].includes(method)) {
            // =============================================
            // SEGURANÇA: Repasse de IP e User-Agent (Antifraude Asaas)
            // =============================================
            const fraudData = {
                remoteIp: clientIp !== 'unknown' ? clientIp.split(',')[0].trim() : undefined,
                userAgent: req.headers.get('user-agent') || undefined
            }
            // Anexando dados antifraude no payload raiz 
            //(Asaas aceita remoteIp e userAgent no POST /payments e Customers)
            const payload = { ...data, ...fraudData }

            fetchOptions.body = JSON.stringify(payload)
        }

        // Fazer requisição para Asaas
        const asaasResponse = await fetch(asaasUrl, fetchOptions)
        const responseText = await asaasResponse.text()

        let responseData: unknown
        try {
            responseData = JSON.parse(responseText)
        } catch {
            responseData = { raw: responseText }
        }

        console.log(`[Asaas Checkout] Response status: ${asaasResponse.status}`)

        // Se erro do Asaas, retornar formatado
        if (!asaasResponse.ok) {
            const asaasError = responseData as AsaasError
            const errorMessage = asaasError?.errors?.[0]?.description || 'Erro na API Asaas'

            return new Response(
                JSON.stringify({
                    error: errorMessage,
                    details: asaasError,
                    status: asaasResponse.status
                }),
                {
                    status: asaasResponse.status,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            )
        }

        // Atualizar tabelas do Supabase se necessário
        if (userId && responseData) {
            await syncWithSupabase(userId, productId, endpoint, method, responseData, isSandbox)
        }

        // Retornar resposta de sucesso
        return new Response(
            JSON.stringify(responseData),
            {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        )

    } catch (error) {
        console.error('[Asaas Checkout] Erro:', error)
        return new Response(
            JSON.stringify({ error: (error as Error).message || 'Erro interno' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})

/**
 * Sincroniza dados relevantes com Supabase após operações no Asaas
 * Adaptado para o modelo multi-tenant do Sincla (company_id ao invés de user_id)
 */
async function syncWithSupabase(
    companyId: string,
    productId: string | undefined,
    endpoint: string,
    method: string,
    data: unknown,
    _sandbox: boolean
) {
    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseKey)

        const response = data as Record<string, unknown>

        // Sync após criar assinatura
        if (endpoint.includes('/subscriptions') && method === 'POST' && response?.id) {
            console.log(`[Asaas Checkout] Sincronizando assinatura ${response.id} para company ${companyId}`)

            const description = (response.description as string) || ''
            const planSlug = extractPlanSlug(description)

            // Buscar plan_id pelo slug se possível
            let planSlugForDb = planSlug || 'starter'

            const upsertData: any = {
                company_id: companyId,
                product_id: productId || 'rh', // Fallback garantido
                plan: planSlugForDb,
                status: response.status === 'ACTIVE' ? 'active' : 'pending',
                billing_cycle: (response.cycle as string || 'MONTHLY').toLowerCase(),
                monthly_amount: response.value,
                external_subscription_id: response.id,
                external_customer_id: response.customer,
                current_period_start: new Date().toISOString(),
                current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
                updated_at: new Date().toISOString()
            };

            const { error: upsertError } = await supabase
                .from('subscriptions')
                .upsert(upsertData, { onConflict: 'company_id,product_id' })

            if (upsertError) {
                console.error('[Asaas Checkout] Supabase UPSERT Error:', upsertError);
                throw upsertError;
            }
        }

    } catch (syncError) {
        console.error('[Asaas Checkout] Erro fatal ao sincronizar com Supabase:', syncError)
        throw syncError // Removendo engolidor de erro (re-throw)
    }
}

/**
 * Extrai slug do plano da descrição da assinatura
 */
function extractPlanSlug(description: string): string | null {
    if (!description) return null
    const match = description.match(/Plano\s+(\w+)/i)
    return match ? match[1].toLowerCase() : null
}
