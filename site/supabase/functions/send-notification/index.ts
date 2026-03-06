/**
 * Send Notification — Edge Function Centralizada
 * Sincla Hub — Serviço de Notificações Multi-Canal
 *
 * Canais: email (MailGrid), whatsapp (UAZAPI), in_app (Supabase Realtime)
 * Consumido pelo Hub e ferramentas satélite (RH, EAD, Agenda, etc.)
 *
 * NOTA: emailTemplate está inlineado pois o deploy via Dashboard
 * requer tudo em um único arquivo.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// =============================================
// Email Template (inlineado)
// =============================================

interface EmailTemplateOptions {
    title: string
    content: string
    actionUrl?: string
    actionLabel?: string
    footerText?: string
    logoUrl?: string
    primaryColor?: string
    preheader?: string
}

const DEFAULT_LOGO = 'https://app.sincla.com.br/logos/logo-sincla.svg'
const DEFAULT_PRIMARY = '#0047CC'
const DEFAULT_FOOTER = 'Sincla — Plataforma de gestão inteligente para empresas.'

function getEmailTemplate(options: EmailTemplateOptions): string {
    const {
        title,
        content,
        actionUrl,
        actionLabel = 'Acessar',
        footerText = DEFAULT_FOOTER,
        logoUrl = DEFAULT_LOGO,
        primaryColor = DEFAULT_PRIMARY,
        preheader = '',
    } = options

    const actionButton = actionUrl ? `
        <tr>
            <td align="center" style="padding: 24px 0 8px;">
                <a href="${actionUrl}" target="_blank" style="
                    display: inline-block;
                    background: linear-gradient(135deg, ${primaryColor}, ${primaryColor}cc);
                    color: #ffffff;
                    text-decoration: none;
                    padding: 14px 36px;
                    border-radius: 8px;
                    font-weight: 600;
                    font-size: 15px;
                    letter-spacing: 0.3px;
                    box-shadow: 0 4px 12px ${primaryColor}40;
                ">${actionLabel}</a>
            </td>
        </tr>
    ` : ''

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    ${preheader ? `<span style="display:none !important;font-size:1px;color:#f7f7f7;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheader}</span>` : ''}
</head>
<body style="margin:0;padding:0;background-color:#f0f2f5;font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f2f5;">
        <tr>
            <td align="center" style="padding:32px 16px;">
                <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
                    <tr><td align="center" style="padding:0 0 24px;">
                        <img src="${logoUrl}" alt="Sincla" width="140" style="display:block;max-width:140px;height:auto;" />
                    </td></tr>
                    <tr><td style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                            <tr><td style="height:4px;background:linear-gradient(90deg, ${primaryColor}, #00C2FF);"></td></tr>
                            <tr><td style="padding:32px 40px 16px;">
                                <h1 style="margin:0;font-size:22px;font-weight:700;color:#1a1a2e;line-height:1.3;">${title}</h1>
                            </td></tr>
                            <tr><td style="padding:0 40px 24px;">
                                <div style="font-size:15px;line-height:1.7;color:#4a4a68;">${content}</div>
                            </td></tr>
                            ${actionButton}
                            <tr><td style="padding:0 0 32px;"></td></tr>
                        </table>
                    </td></tr>
                    <tr><td style="padding:24px 16px;text-align:center;">
                        <p style="margin:0 0 8px;font-size:13px;color:#8c8ca1;">${footerText}</p>
                        <p style="margin:0;font-size:12px;color:#b0b0c0;"><a href="https://sincla.com.br" style="color:#b0b0c0;text-decoration:none;">sincla.com.br</a></p>
                    </td></tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`
}

function templateWelcome(name: string, actionUrl?: string) {
    return getEmailTemplate({
        title: `Bem-vindo ao Sincla, ${name}! 🚀`,
        content: `<p>Estamos muito felizes em ter você conosco!</p><p>O Sincla é a plataforma completa para gestão inteligente da sua empresa.</p><p>Comece agora explorando o painel e configurando sua empresa.</p>`,
        actionUrl: actionUrl || 'https://app.sincla.com.br/painel',
        actionLabel: 'Acessar meu Painel',
        preheader: 'Sua conta Sincla foi criada com sucesso!',
    })
}

function templateSystem(title: string, message: string, actionUrl?: string, actionLabel?: string) {
    return getEmailTemplate({ title, content: `<p>${message}</p>`, actionUrl, actionLabel })
}

function templateBilling(title: string, message: string, actionUrl?: string) {
    return getEmailTemplate({ title: `💰 ${title}`, content: `<p>${message}</p>`, actionUrl, actionLabel: 'Ver Detalhes', primaryColor: '#10b981' })
}

function templateAlert(title: string, message: string, actionUrl?: string) {
    return getEmailTemplate({ title: `⚠️ ${title}`, content: `<p>${message}</p>`, actionUrl, actionLabel: 'Ver Agora', primaryColor: '#f59e0b' })
}

function templateSecurity(title: string, message: string) {
    return getEmailTemplate({ title: `🔒 ${title}`, content: `<p>${message}</p>`, primaryColor: '#ef4444' })
}

// =============================================
// CORS
// =============================================
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// =============================================
// Types
// =============================================
interface NotificationPayload {
    channel: 'email' | 'whatsapp' | 'in_app' | 'all'
    to: string
    subject?: string
    message: string
    html?: string
    template?: 'welcome' | 'system' | 'billing' | 'alert' | 'security' | 'custom'
    data?: Record<string, string>
    source_tool?: string
    company_id?: string
    category?: string
    icon?: string
    color?: string
    action_url?: string
}

interface SendResult {
    channel: string
    success: boolean
    error?: string
}

// =============================================
// Main Handler
// =============================================
Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders })
    }

    try {
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return jsonResponse({ error: 'Não autorizado' }, 401)
        }

        const payload: NotificationPayload = await req.json()

        if (!payload.channel || !payload.to || !payload.message) {
            return jsonResponse({ error: 'Campos obrigatórios: channel, to, message' }, 400)
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseKey)

        const results: SendResult[] = []
        const channels = payload.channel === 'all'
            ? ['email', 'whatsapp', 'in_app']
            : [payload.channel]

        for (const channel of channels) {
            try {
                switch (channel) {
                    case 'email':
                        await sendEmail(supabase, payload)
                        results.push({ channel: 'email', success: true })
                        break
                    case 'whatsapp':
                        await sendWhatsapp(supabase, payload)
                        results.push({ channel: 'whatsapp', success: true })
                        break
                    case 'in_app':
                        await sendInApp(supabase, payload)
                        results.push({ channel: 'in_app', success: true })
                        break
                }
            } catch (err: any) {
                console.error(`[Notification] Erro no canal ${channel}:`, err.message)
                results.push({ channel, success: false, error: err.message })
                await logNotification(supabase, {
                    channel, recipient: payload.to, subject: payload.subject,
                    message: payload.message, status: 'failed', error_message: err.message,
                    source_tool: payload.source_tool || 'hub', company_id: payload.company_id,
                })
            }
        }

        return jsonResponse({ success: results.every(r => r.success), results })
    } catch (error: any) {
        console.error('[Notification] Erro geral:', error)
        return jsonResponse({ error: error.message || 'Erro interno' }, 500)
    }
})

// =============================================
// Email via MailGrid
// =============================================
async function sendEmail(supabase: any, payload: NotificationPayload) {
    const host = Deno.env.get('MAILGRID_HOST') || 'server11.mailgrid.com.br'
    const user = Deno.env.get('MAILGRID_USER') || 'smtp@sincla.com.br'
    const password = Deno.env.get('MAILGRID_PASSWORD')
    const fromEmail = Deno.env.get('MAILGRID_FROM') || 'notificacoes@sincla.com.br'
    const fromName = Deno.env.get('MAILGRID_FROM_NAME') || 'Sincla'

    if (!password) throw new Error('MAILGRID_PASSWORD não configurada')

    let htmlContent = payload.html
    if (!htmlContent) {
        const template = payload.template || 'system'
        const data = payload.data || {}

        switch (template) {
            case 'welcome':
                htmlContent = templateWelcome(data.name || 'Usuário', data.action_url)
                break
            case 'billing':
                htmlContent = templateBilling(payload.subject || 'Atualização de Pagamento', payload.message, data.action_url)
                break
            case 'alert':
                htmlContent = templateAlert(payload.subject || 'Alerta', payload.message, data.action_url)
                break
            case 'security':
                htmlContent = templateSecurity(payload.subject || 'Segurança', payload.message)
                break
            case 'custom':
                htmlContent = getEmailTemplate({
                    title: payload.subject || 'Notificação',
                    content: payload.message,
                    actionUrl: data.action_url,
                    actionLabel: data.action_label || 'Acessar',
                    primaryColor: data.primary_color,
                    logoUrl: data.logo_url,
                })
                break
            default:
                htmlContent = templateSystem(payload.subject || 'Notificação do Sistema', payload.message, data.action_url, data.action_label)
        }
    }

    const mailPayload = {
        host, usuario: user, senha: password,
        email_remetente: fromEmail, nome_remetente: fromName,
        email_destinatario: payload.to,
        assunto: payload.subject || 'Notificação Sincla',
        corpo_html: htmlContent, corpo_texto: payload.message,
    }

    console.log(`[Notification] Enviando email para ${payload.to} via MailGrid`)

    const response = await fetch('https://api.mailgrid.net.br/sendmail/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mailPayload),
    })

    if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`MailGrid error ${response.status}: ${errorText}`)
    }

    const result = await response.json().catch(() => ({}))

    await logNotification(supabase, {
        channel: 'email', recipient: payload.to, subject: payload.subject,
        message: payload.message, status: 'sent',
        source_tool: payload.source_tool || 'hub', company_id: payload.company_id,
        metadata: { provider: 'mailgrid', response: result },
    })
}

// =============================================
// WhatsApp via UAZAPI
// =============================================
async function sendWhatsapp(supabase: any, payload: NotificationPayload) {
    const serverUrl = Deno.env.get('UAZAPI_URL') || 'https://ux4you.uazapi.com'
    const token = Deno.env.get('UAZAPI_TOKEN')

    if (!token) throw new Error('UAZAPI_TOKEN não configurado')

    let phone = payload.to.replace(/\D/g, '')
    if (phone.length === 11) phone = `55${phone}`
    if (phone.length === 10) phone = `55${phone}`
    if (!phone.startsWith('55')) phone = `55${phone}`

    console.log(`[Notification] Enviando WhatsApp para ${phone} via UAZAPI`)

    const response = await fetch(`${serverUrl}/sendText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'token': token },
        body: JSON.stringify({ phone, message: payload.message }),
    })

    if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`UAZAPI error ${response.status}: ${errorText}`)
    }

    const result = await response.json().catch(() => ({}))

    await logNotification(supabase, {
        channel: 'whatsapp', recipient: phone, subject: payload.subject,
        message: payload.message, status: 'sent',
        source_tool: payload.source_tool || 'hub', company_id: payload.company_id,
        metadata: { provider: 'uazapi', response: result },
    })
}

// =============================================
// In-App Notification (Supabase Realtime)
// =============================================
async function sendInApp(supabase: any, payload: NotificationPayload) {
    const userId = payload.to

    const { error } = await supabase.from('notifications').insert({
        user_id: userId,
        company_id: payload.company_id || null,
        title: payload.subject || 'Notificação',
        message: payload.message,
        category: payload.category || 'system',
        icon: payload.icon || null,
        color: payload.color || '#228be6',
        action_url: payload.action_url || null,
        source_tool: payload.source_tool || 'hub',
        metadata: payload.data || {},
    })

    if (error) throw new Error(`Supabase insert error: ${error.message}`)

    await logNotification(supabase, {
        channel: 'in_app', recipient: userId, subject: payload.subject,
        message: payload.message, status: 'sent',
        source_tool: payload.source_tool || 'hub', company_id: payload.company_id,
    })
}

// =============================================
// Logging Helper
// =============================================
async function logNotification(supabase: any, data: {
    channel: string; recipient: string; subject?: string; message?: string;
    status: string; error_message?: string; source_tool?: string;
    company_id?: string; metadata?: Record<string, unknown>
}) {
    try {
        await supabase.from('notification_logs').insert({
            channel: data.channel, recipient: data.recipient,
            subject: data.subject, message: data.message,
            status: data.status, error_message: data.error_message || null,
            source_tool: data.source_tool || 'hub',
            company_id: data.company_id || null, metadata: data.metadata || {},
        })
    } catch (err) {
        console.error('[Notification] Erro ao logar notificação:', err)
    }
}

// =============================================
// Response Helper
// =============================================
function jsonResponse(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), {
        status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
}
