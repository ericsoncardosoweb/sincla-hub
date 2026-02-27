/**
 * Billing Webhook Edge Function
 * 
 * Recebe eventos de billing de gateways de pagamento (Stripe, Asaas)
 * e atualiza as assinaturas no Hub.
 * 
 * Suporta:
 * - Stripe: verificação via HMAC (header stripe-signature)
 * - Asaas: verificação via token (header asaas-access-token)
 * - Manual: sem verificação (uso interno)
 * 
 * Secrets necessárias:
 * - BILLING_WEBHOOK_SECRET  → Stripe webhook signing secret
 * - ASAAS_WEBHOOK_TOKEN     → Token de autenticação configurado no painel Asaas
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { createHmac } from 'https://deno.land/std@0.177.0/node/crypto.ts'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature, asaas-access-token',
}

// ─── Internal normalized types ───────────────────────────────────────────────

type BillingEvent =
    | 'subscription.created'
    | 'subscription.updated'
    | 'subscription.canceled'
    | 'subscription.renewed'
    | 'payment.succeeded'
    | 'payment.failed'

interface NormalizedPayload {
    event: BillingEvent
    gateway: 'stripe' | 'asaas' | 'manual'
    data: {
        subscription_id?: string
        company_id?: string
        product_id?: string
        plan_id?: string
        status?: string
        amount?: number
        billing_cycle?: 'monthly' | 'yearly'
        current_period_start?: string
        current_period_end?: string
        canceled_at?: string
        metadata?: Record<string, unknown>
    }
}

// ─── Asaas event mapping ─────────────────────────────────────────────────────

const ASAAS_EVENT_MAP: Record<string, BillingEvent | null> = {
    // Payment events
    'PAYMENT_CONFIRMED': 'payment.succeeded',
    'PAYMENT_RECEIVED': 'payment.succeeded',
    'PAYMENT_OVERDUE': 'payment.failed',
    'PAYMENT_REFUNDED': 'subscription.canceled',  // Refund → treat as cancel
    'PAYMENT_DELETED': null,                       // Ignorar
    'PAYMENT_CREATED': null,                       // Ignorar (aguardamos confirmação)
    'PAYMENT_UPDATED': null,                       // Ignorar
    'PAYMENT_BANK_SLIP_VIEWED': null,              // Ignorar

    // Subscription events
    'SUBSCRIPTION_CREATED': 'subscription.created',
    'SUBSCRIPTION_UPDATED': 'subscription.updated',
    'SUBSCRIPTION_INACTIVATED': 'subscription.canceled',
    'SUBSCRIPTION_DELETED': 'subscription.canceled',
}

// ─── Asaas payload interfaces ────────────────────────────────────────────────

interface AsaasPaymentPayload {
    event: string
    payment: {
        id: string
        customer: string
        subscription?: string
        value: number
        netValue?: number
        billingType: string  // 'PIX' | 'BOLETO' | 'CREDIT_CARD' | etc.
        status: string
        dueDate: string
        paymentDate?: string
        confirmedDate?: string
        externalReference?: string  // Usamos para company_id ou metadata
        description?: string
    }
}

interface AsaasSubscriptionPayload {
    event: string
    subscription: {
        id: string
        customer: string
        value: number
        cycle: string  // 'MONTHLY' | 'YEARLY' | 'WEEKLY' etc.
        status: string // 'ACTIVE' | 'INACTIVE' | 'EXPIRED'
        nextDueDate: string
        externalReference?: string
        description?: string
    }
}

type AsaasWebhookPayload = AsaasPaymentPayload | AsaasSubscriptionPayload

// ─── Main handler ────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Initialize Supabase
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // Get raw body
        const rawBody = await req.text()

        // ─── Auto-detect gateway from headers ────────────────────────────
        const stripeSignature = req.headers.get('stripe-signature')
        const asaasToken = req.headers.get('asaas-access-token')

        let normalized: NormalizedPayload

        if (stripeSignature) {
            // ── STRIPE ───────────────────────────────────────────────────
            const stripeSecret = Deno.env.get('BILLING_WEBHOOK_SECRET')
            if (stripeSecret && !verifyStripeSignature(rawBody, stripeSignature, stripeSecret)) {
                console.error('Invalid Stripe signature')
                return new Response(
                    JSON.stringify({ error: 'Invalid signature' }),
                    { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            }

            // Stripe envia no formato normalizado (já configurado no dashboard Stripe)
            const payload = JSON.parse(rawBody) as NormalizedPayload
            payload.gateway = 'stripe'
            normalized = payload

        } else if (asaasToken) {
            // ── ASAAS ────────────────────────────────────────────────────
            const expectedToken = Deno.env.get('ASAAS_WEBHOOK_TOKEN')
            if (expectedToken && asaasToken !== expectedToken) {
                console.error('Invalid Asaas access token')
                return new Response(
                    JSON.stringify({ error: 'Invalid access token' }),
                    { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            }

            const asaasPayload = JSON.parse(rawBody) as AsaasWebhookPayload
            const mappedEvent = ASAAS_EVENT_MAP[asaasPayload.event]

            if (mappedEvent === null || mappedEvent === undefined) {
                console.log(`Asaas event ignored: ${asaasPayload.event}`)
                return new Response(
                    JSON.stringify({ success: true, message: `Event ${asaasPayload.event} ignored` }),
                    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            }

            normalized = normalizeAsaasPayload(asaasPayload, mappedEvent)

        } else {
            // ── MANUAL / formato interno ─────────────────────────────────
            const payload = JSON.parse(rawBody) as NormalizedPayload
            payload.gateway = payload.gateway || 'manual'
            normalized = payload
        }

        console.log(`Processing billing event: ${normalized.event} from ${normalized.gateway}`)

        // ─── Process event ───────────────────────────────────────────────
        let result: { success: boolean; message: string }

        switch (normalized.event) {
            case 'subscription.created':
                result = await handleSubscriptionCreated(supabase, normalized.data)
                break

            case 'subscription.updated':
                result = await handleSubscriptionUpdated(supabase, normalized.data)
                break

            case 'subscription.canceled':
                result = await handleSubscriptionCanceled(supabase, normalized.data)
                break

            case 'subscription.renewed':
                result = await handleSubscriptionRenewed(supabase, normalized.data)
                break

            case 'payment.succeeded':
                result = await handlePaymentSucceeded(supabase, normalized.data)
                break

            case 'payment.failed':
                result = await handlePaymentFailed(supabase, normalized.data)
                break

            default:
                result = { success: true, message: 'Event ignored' }
        }

        // Notify affected products
        if (normalized.data.product_id && normalized.data.company_id) {
            await notifyProduct(supabase, normalized.data.product_id, normalized.data.company_id, normalized.event)
        }

        return new Response(
            JSON.stringify(result),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Webhook error:', error)
        return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})

// ─── Asaas payload normalizer ────────────────────────────────────────────────

function normalizeAsaasPayload(
    raw: AsaasWebhookPayload,
    mappedEvent: BillingEvent
): NormalizedPayload {
    // Subscription events
    if ('subscription' in raw && raw.subscription) {
        const sub = raw.subscription
        const externalRef = parseExternalReference(sub.externalReference)

        return {
            event: mappedEvent,
            gateway: 'asaas',
            data: {
                subscription_id: sub.id,
                company_id: externalRef.company_id,
                product_id: externalRef.product_id,
                status: mapAsaasSubscriptionStatus(sub.status),
                amount: sub.value,
                billing_cycle: mapAsaasCycle(sub.cycle),
                current_period_end: sub.nextDueDate,
                metadata: {
                    asaas_customer: sub.customer,
                    asaas_status: sub.status,
                    asaas_description: sub.description,
                },
            },
        }
    }

    // Payment events
    if ('payment' in raw && raw.payment) {
        const payment = raw.payment
        const externalRef = parseExternalReference(payment.externalReference)

        return {
            event: mappedEvent,
            gateway: 'asaas',
            data: {
                subscription_id: payment.subscription || undefined,
                company_id: externalRef.company_id,
                product_id: externalRef.product_id,
                amount: payment.value,
                metadata: {
                    asaas_payment_id: payment.id,
                    asaas_customer: payment.customer,
                    asaas_billing_type: payment.billingType,
                    asaas_status: payment.status,
                    asaas_due_date: payment.dueDate,
                    asaas_payment_date: payment.paymentDate,
                    asaas_description: payment.description,
                },
            },
        }
    }

    // Fallback
    return {
        event: mappedEvent,
        gateway: 'asaas',
        data: { metadata: { raw_event: raw.event } },
    }
}

/**
 * Parseia o externalReference do Asaas.
 * Formato esperado: "company_id:product_id" ou apenas "company_id"
 * Configurado ao criar a cobrança/assinatura no Asaas.
 */
function parseExternalReference(ref?: string): { company_id?: string; product_id?: string } {
    if (!ref) return {}

    const parts = ref.split(':')
    return {
        company_id: parts[0] || undefined,
        product_id: parts[1] || undefined,
    }
}

function mapAsaasSubscriptionStatus(status: string): string {
    const map: Record<string, string> = {
        'ACTIVE': 'active',
        'INACTIVE': 'canceled',
        'EXPIRED': 'expired',
    }
    return map[status] || status.toLowerCase()
}

function mapAsaasCycle(cycle: string): 'monthly' | 'yearly' {
    if (cycle === 'YEARLY') return 'yearly'
    return 'monthly' // MONTHLY, WEEKLY, etc. → default monthly
}

// ─── Signature verification ──────────────────────────────────────────────────

function verifyStripeSignature(
    payload: string,
    signature: string,
    secret: string,
): boolean {
    // Stripe uses timestamp.signature format: t=timestamp,v1=signature
    const parts = signature.split(',')
    const timestampPart = parts.find(p => p.startsWith('t='))
    const signaturePart = parts.find(p => p.startsWith('v1='))

    if (!timestampPart || !signaturePart) return false

    const timestamp = timestampPart.split('=')[1]
    const expectedSig = signaturePart.split('=')[1]
    const signedPayload = `${timestamp}.${payload}`

    const hmac = createHmac('sha256', secret)
    hmac.update(signedPayload)
    const computed = hmac.digest('hex')

    return computed === expectedSig
}

// ─── Event handlers ──────────────────────────────────────────────────────────

async function handleSubscriptionCreated(
    supabase: ReturnType<typeof createClient>,
    data: NormalizedPayload['data']
): Promise<{ success: boolean; message: string }> {
    const { company_id, product_id, plan_id, billing_cycle, amount, current_period_end } = data

    if (!company_id || !product_id) {
        return { success: false, message: 'Missing company_id or product_id' }
    }

    const { error } = await supabase.from('subscriptions').insert({
        company_id,
        product_id,
        plan_id,
        status: 'active',
        billing_cycle: billing_cycle || 'monthly',
        monthly_amount: amount,
        current_period_end,
    })

    if (error) {
        console.error('Error creating subscription:', error)
        return { success: false, message: error.message }
    }

    return { success: true, message: 'Subscription created' }
}

async function handleSubscriptionUpdated(
    supabase: ReturnType<typeof createClient>,
    data: NormalizedPayload['data']
): Promise<{ success: boolean; message: string }> {
    const { subscription_id, plan_id, status, amount, current_period_end } = data

    if (!subscription_id) {
        return { success: false, message: 'Missing subscription_id' }
    }

    const updateData: Record<string, unknown> = {}
    if (plan_id) updateData.plan_id = plan_id
    if (status) updateData.status = status
    if (amount) updateData.monthly_amount = amount
    if (current_period_end) updateData.current_period_end = current_period_end

    const { error } = await supabase
        .from('subscriptions')
        .update(updateData)
        .eq('id', subscription_id)

    if (error) {
        console.error('Error updating subscription:', error)
        return { success: false, message: error.message }
    }

    return { success: true, message: 'Subscription updated' }
}

async function handleSubscriptionCanceled(
    supabase: ReturnType<typeof createClient>,
    data: NormalizedPayload['data']
): Promise<{ success: boolean; message: string }> {
    const { subscription_id, canceled_at } = data

    if (!subscription_id) {
        return { success: false, message: 'Missing subscription_id' }
    }

    const { error } = await supabase
        .from('subscriptions')
        .update({
            status: 'canceled',
            canceled_at: canceled_at || new Date().toISOString(),
        })
        .eq('id', subscription_id)

    if (error) {
        console.error('Error canceling subscription:', error)
        return { success: false, message: error.message }
    }

    return { success: true, message: 'Subscription canceled' }
}

async function handleSubscriptionRenewed(
    supabase: ReturnType<typeof createClient>,
    data: NormalizedPayload['data']
): Promise<{ success: boolean; message: string }> {
    const { subscription_id, current_period_start, current_period_end } = data

    if (!subscription_id) {
        return { success: false, message: 'Missing subscription_id' }
    }

    const { error } = await supabase
        .from('subscriptions')
        .update({
            status: 'active',
            current_period_start,
            current_period_end,
        })
        .eq('id', subscription_id)

    if (error) {
        console.error('Error renewing subscription:', error)
        return { success: false, message: error.message }
    }

    return { success: true, message: 'Subscription renewed' }
}

async function handlePaymentSucceeded(
    supabase: ReturnType<typeof createClient>,
    data: NormalizedPayload['data']
): Promise<{ success: boolean; message: string }> {
    const { subscription_id } = data

    if (subscription_id) {
        // Update subscription to active if it was past_due
        await supabase
            .from('subscriptions')
            .update({ status: 'active' })
            .eq('id', subscription_id)
            .eq('status', 'past_due')
    }

    return { success: true, message: 'Payment recorded' }
}

async function handlePaymentFailed(
    supabase: ReturnType<typeof createClient>,
    data: NormalizedPayload['data']
): Promise<{ success: boolean; message: string }> {
    const { subscription_id } = data

    if (subscription_id) {
        // Update subscription to past_due
        await supabase
            .from('subscriptions')
            .update({ status: 'past_due' })
            .eq('id', subscription_id)
    }

    return { success: true, message: 'Payment failure recorded' }
}

// ─── Product notification ────────────────────────────────────────────────────

async function notifyProduct(
    supabase: ReturnType<typeof createClient>,
    productId: string,
    companyId: string,
    event: BillingEvent
): Promise<void> {
    try {
        // Get product webhook URL
        const { data: product } = await supabase
            .from('products')
            .select('webhook_url, webhook_secret')
            .eq('id', productId)
            .single()

        if (!product?.webhook_url) return

        // Get updated subscription info
        const { data: subscription } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('company_id', companyId)
            .eq('product_id', productId)
            .single()

        // Send notification to product
        await fetch(product.webhook_url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Hub-Secret': product.webhook_secret || '',
            },
            body: JSON.stringify({
                type: 'billing_event',
                event,
                company_id: companyId,
                subscription,
            }),
        })
    } catch (error) {
        console.error('Error notifying product:', error)
    }
}
