/**
 * Partner Withdrawal Edge Function
 * 
 * Processa solicitações de saque de parceiros via PIX usando a API do Asaas.
 * 
 * Endpoints:
 * - POST: Processar um saque pendente (admin only)
 * 
 * Secrets necessárias:
 * - ASAAS_API_KEY → API key do Asaas
 * - ASAAS_BASE_URL → URL base da API (sandbox ou produção)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TransferRequest {
    withdrawal_id: string
}

interface AsaasTransferResponse {
    id: string
    status: string
    value: number
    dateCreated: string
    transferFee: number
}

Deno.serve(async (req: Request) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Initialize Supabase with auth user
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // Verify admin auth
        const authHeader = req.headers.get('authorization')
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: 'Unauthorized' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const token = authHeader.replace('Bearer ', '')
        const { data: { user }, error: authError } = await supabase.auth.getUser(token)
        if (authError || !user) {
            return new Response(
                JSON.stringify({ error: 'Invalid token' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Verify user is admin
        const { data: admin } = await supabase
            .from('admin_users')
            .select('id')
            .eq('id', user.id)
            .eq('is_active', true)
            .single()

        if (!admin) {
            return new Response(
                JSON.stringify({ error: 'Admin access required' }),
                { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Parse request
        const { withdrawal_id } = await req.json() as TransferRequest

        if (!withdrawal_id) {
            return new Response(
                JSON.stringify({ error: 'withdrawal_id is required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Get withdrawal details
        const { data: withdrawal, error: wError } = await supabase
            .from('partner_withdrawals')
            .select(`
                *,
                partner:partners (
                    id, pix_key, pix_key_type, company_name,
                    subscriber:subscribers!user_id (name, email)
                )
            `)
            .eq('id', withdrawal_id)
            .eq('status', 'pending')
            .single()

        if (wError || !withdrawal) {
            return new Response(
                JSON.stringify({ error: 'Withdrawal not found or not pending' }),
                { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Update status to processing
        await supabase
            .from('partner_withdrawals')
            .update({ status: 'processing' })
            .eq('id', withdrawal_id)

        // Prepare Asaas transfer
        const asaasApiKey = Deno.env.get('ASAAS_API_KEY')
        const asaasBaseUrl = Deno.env.get('ASAAS_BASE_URL') || 'https://api.asaas.com/v3'

        if (!asaasApiKey) {
            // No Asaas key — mark as paid manually
            console.warn('ASAAS_API_KEY not configured. Marking as paid without transfer.')

            await supabase
                .from('partner_withdrawals')
                .update({
                    status: 'paid',
                    processed_at: new Date().toISOString(),
                    processed_by: user.id,
                    notes: 'Pagamento manual (Asaas não configurado)',
                })
                .eq('id', withdrawal_id)

            return new Response(
                JSON.stringify({
                    success: true,
                    message: 'Withdrawal marked as paid (manual)',
                    transfer_id: null,
                }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Map PIX key type to Asaas format
        const pixTypeMap: Record<string, string> = {
            cpf: 'CPF',
            cnpj: 'CNPJ',
            email: 'EMAIL',
            phone: 'PHONE',
            random: 'EVP',
        }

        // Create PIX transfer via Asaas
        const transferPayload = {
            value: withdrawal.amount,
            pixAddressKey: withdrawal.pix_key,
            pixAddressKeyType: pixTypeMap[withdrawal.pix_key_type] || 'CPF',
            description: `Comissão parceiro - ${withdrawal.partner?.subscriber?.name || 'Parceiro'}`,
            scheduleDate: null, // Immediate
        }

        const asaasResponse = await fetch(`${asaasBaseUrl}/transfers`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'access_token': asaasApiKey,
            },
            body: JSON.stringify(transferPayload),
        })

        if (!asaasResponse.ok) {
            const errorBody = await asaasResponse.text()
            console.error('Asaas transfer error:', errorBody)

            // Revert status
            await supabase
                .from('partner_withdrawals')
                .update({
                    status: 'pending',
                    notes: `Erro Asaas: ${errorBody}`,
                })
                .eq('id', withdrawal_id)

            return new Response(
                JSON.stringify({ error: 'Asaas transfer failed', details: errorBody }),
                { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const transfer = await asaasResponse.json() as AsaasTransferResponse

        // Update withdrawal with Asaas transfer ID
        await supabase
            .from('partner_withdrawals')
            .update({
                status: 'paid',
                asaas_transfer_id: transfer.id,
                processed_at: new Date().toISOString(),
                processed_by: user.id,
            })
            .eq('id', withdrawal_id)

        return new Response(
            JSON.stringify({
                success: true,
                message: 'Transfer created successfully',
                transfer_id: transfer.id,
                transfer_status: transfer.status,
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Partner withdrawal error:', error)
        return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
