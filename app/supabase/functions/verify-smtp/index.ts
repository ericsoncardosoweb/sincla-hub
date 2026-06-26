/**
 * Verify SMTP — Edge Function
 * Sincla Hub — Testa o SMTP próprio de uma empresa enviando um e-mail de teste.
 *
 * Fluxo:
 *   1. Exige Authorization (JWT do usuário) e valida que o caller é owner/admin
 *      da empresa (company_members).
 *   2. Lê a config salva em notification_settings (service_role).
 *   3. Tenta enviar um e-mail de teste via SMTP do tenant.
 *   4. Atualiza smtp_verified / smtp_verified_at / smtp_last_error conforme o
 *      resultado e devolve sucesso/erro.
 *
 * A senha NUNCA trafega pelo frontend: a função usa o que está salvo no banco.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface RequestBody {
    company_id: string
    test_to?: string
}

function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
}

function buildTestEmailHtml(opts: {
    host: string
    logoUrl: string
    primaryColor: string
    footerText: string
    companyName: string
}): string {
    const { host, logoUrl, primaryColor, footerText, companyName } = opts
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f0f2f5;">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
<tr><td align="center" style="padding:0 0 20px;"><img src="${logoUrl}" alt="" width="140" style="display:block;max-width:140px;height:auto;border:0;" /></td></tr>
<tr><td style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08);">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td style="height:4px;background:${primaryColor};">&nbsp;</td></tr>
<tr><td style="padding:28px 24px;">
<h1 style="margin:0 0 12px;font-size:20px;color:#1a1a2e;">✅ SMTP configurado com sucesso</h1>
<p style="font-size:15px;line-height:1.7;color:#4a4a68;margin:0 0 8px;">Este é um e-mail de teste enviado pela <strong>${companyName}</strong> via Sincla, usando o servidor <code>${host}</code>.</p>
<p style="font-size:14px;color:#8c8ca1;margin:16px 0 0;">Suas notificações passarão a usar este layout e o seu SMTP.</p>
</td></tr>
</table></td></tr>
<tr><td style="padding:16px 12px;text-align:center;"><p style="margin:0;font-size:12px;color:#8c8ca1;">${footerText}</p></td></tr>
</table></td></tr></table></body></html>`
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) return json({ error: 'No authorization header' }, 401)

        const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        const userClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
            global: { headers: { Authorization: authHeader } },
        })

        const { data: { user: caller }, error: callerErr } = await userClient.auth.getUser()
        if (callerErr || !caller) return json({ error: 'Invalid token' }, 401)

        const body: RequestBody = await req.json()
        if (!body.company_id) return json({ error: 'company_id é obrigatório' }, 400)

        // Caller precisa ser owner/admin da empresa
        const { data: membership } = await adminClient
            .from('company_members')
            .select('role')
            .eq('company_id', body.company_id)
            .eq('user_id', caller.id)
            .maybeSingle()

        if (!membership || !['owner', 'admin'].includes(membership.role)) {
            return json({ error: 'Acesso negado: requer owner/admin da empresa.' }, 403)
        }

        // Config salva
        const { data: settings } = await adminClient
            .from('notification_settings')
            .select('custom_smtp_host, custom_smtp_port, custom_smtp_secure, custom_smtp_user, custom_smtp_password, custom_smtp_from, custom_smtp_from_name, custom_smtp_reply_to, email_layout_logo_url, email_layout_primary_color, email_layout_footer_text')
            .eq('company_id', body.company_id)
            .maybeSingle()

        if (!settings || !settings.custom_smtp_host || !settings.custom_smtp_user || !settings.custom_smtp_password) {
            return json({ error: 'SMTP não configurado. Preencha host, usuário e senha antes de testar.' }, 400)
        }

        const { data: company } = await adminClient
            .from('companies')
            .select('name, logo_url, primary_color')
            .eq('id', body.company_id)
            .maybeSingle()

        const companyName = company?.name || 'Sua empresa'
        const logoUrl = settings.email_layout_logo_url || company?.logo_url || 'https://app.sincla.com.br/logos/logo-sincla.svg'
        const primaryColor = settings.email_layout_primary_color || company?.primary_color || '#0047CC'
        const footerText = settings.email_layout_footer_text || `${companyName} — Notificações automáticas.`

        const port = settings.custom_smtp_port || 587
        const secure = settings.custom_smtp_secure ?? (port === 465)
        const fromEmail = settings.custom_smtp_from || settings.custom_smtp_user
        const fromName = settings.custom_smtp_from_name || 'Notificações'
        const testTo = (body.test_to && body.test_to.trim()) || fromEmail

        const client = new SMTPClient({
            connection: {
                hostname: settings.custom_smtp_host,
                port,
                tls: secure,
                auth: { username: settings.custom_smtp_user, password: settings.custom_smtp_password },
            },
        })

        // Erro do SMTP é tratado aqui para podermos persistir smtp_last_error
        try {
            await client.send({
                from: `${fromName} <${fromEmail}>`,
                to: testTo,
                replyTo: settings.custom_smtp_reply_to || undefined,
                subject: '✅ Teste de SMTP — Sincla',
                content: 'Este é um e-mail de teste do Sincla. Seu SMTP está funcionando.',
                html: buildTestEmailHtml({ host: settings.custom_smtp_host, logoUrl, primaryColor, footerText, companyName }),
            })
        } catch (sendErr) {
            const message = (sendErr as Error).message || 'Falha ao enviar e-mail de teste'
            await adminClient
                .from('notification_settings')
                .update({ smtp_verified: false, smtp_last_error: message, updated_at: new Date().toISOString() })
                .eq('company_id', body.company_id)
            return json({ error: message }, 502)
        } finally {
            await client.close().catch(() => {})
        }

        // Marca como verificado
        await adminClient
            .from('notification_settings')
            .update({
                smtp_verified: true,
                smtp_verified_at: new Date().toISOString(),
                smtp_last_error: null,
                updated_at: new Date().toISOString(),
            })
            .eq('company_id', body.company_id)

        return json({ success: true, sent_to: testTo })
    } catch (error) {
        const message = (error as Error).message || 'Falha ao testar SMTP'
        console.error('[verify-smtp]', message)
        return json({ error: message }, 500)
    }
})
