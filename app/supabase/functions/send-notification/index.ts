/**
 * Send Notification — Edge Function Centralizada
 * Sincla Hub — Serviço de Notificações Multi-Canal
 *
 * Canais: email, whatsapp, in_app (Supabase Realtime)
 *
 * ROTEAMENTO de E-MAIL:
 *   1) Se a empresa (company_id) tem SMTP PRÓPRIO configurado e verificado em
 *      notification_settings  ->  envia pelo servidor da empresa. Nesse caso
 *      NÃO consome créditos (a empresa paga o provedor dela).
 *   2) Caso contrário  ->  fallback pelo sistema Sincla (MailGrid) e registra
 *      consumo em service_usage_log (metering/billing).
 *
 * WhatsApp e in_app seguem pelo sistema (UAZAPI / Realtime).
 *
 * NOTA: template de email inlineado pois o deploy via Dashboard exige um único arquivo.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts'

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

function escapeHtmlAttr(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
}

function sanitizeHexColor(color: string | undefined, fallback = DEFAULT_PRIMARY): string {
    const c = String(color || '').trim()
    if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(c)) return c
    return fallback
}

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

    const btnColor = sanitizeHexColor(primaryColor)
    // Botão "bulletproof" (tabela + bgcolor) — Outlook/Office 365 costuma
    // engolir <a> com gradient/box-shadow e o CTA some visualmente.
    const actionBlock = actionUrl ? `
        <tr>
            <td align="center" style="padding: 8px 40px 8px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
                    <tr>
                        <td align="center" bgcolor="${btnColor}" style="background-color:${btnColor}; border-radius:8px; mso-padding-alt:14px 36px;">
                            <a href="${escapeHtmlAttr(actionUrl)}" target="_blank"
                               style="display:inline-block; background-color:${btnColor}; color:#ffffff !important; text-decoration:none; padding:14px 36px; border-radius:8px; font-weight:700; font-size:15px; font-family:Segoe UI, Roboto, Helvetica, Arial, sans-serif; line-height:1.2;">
                                ${actionLabel}
                            </a>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
        <tr>
            <td align="center" style="padding: 4px 40px 24px;">
                <p style="margin:0; font-size:12px; line-height:1.5; color:#8c8ca1; word-break:break-all;">
                    Se o botão não aparecer, copie e cole este link no navegador:<br/>
                    <a href="${escapeHtmlAttr(actionUrl)}" target="_blank" style="color:${btnColor}; text-decoration:underline;">${escapeHtmlAttr(actionUrl)}</a>
                </p>
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
                            <tr><td style="height:4px;background-color:${btnColor};"></td></tr>
                            <tr><td style="padding:32px 40px 16px;">
                                <h1 style="margin:0;font-size:22px;font-weight:700;color:#1a1a2e;line-height:1.3;">${title}</h1>
                            </td></tr>
                            <tr><td style="padding:0 40px 16px;">
                                <div style="font-size:15px;line-height:1.7;color:#4a4a68;">${content}</div>
                            </td></tr>
                            ${actionBlock}
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

function templateWelcome(name: string, actionUrl?: string, brand?: Partial<EmailBranding>) {
    return getEmailTemplate({
        title: `Bem-vindo ao Sincla, ${name}! 🚀`,
        content: `<p>Estamos muito felizes em ter você conosco!</p><p>O Sincla é a plataforma completa para gestão inteligente da sua empresa.</p><p>Comece agora explorando o painel e configurando sua empresa.</p>`,
        actionUrl: actionUrl || 'https://app.sincla.com.br/painel',
        actionLabel: 'Acessar meu Painel',
        preheader: 'Sua conta Sincla foi criada com sucesso!',
        logoUrl: brand?.logoUrl,
        primaryColor: brand?.primaryColor,
        footerText: brand?.footerText,
    })
}

function templateSystem(title: string, message: string, actionUrl?: string, actionLabel?: string, brand?: Partial<EmailBranding>) {
    return getEmailTemplate({ title, content: `<p>${message}</p>`, actionUrl, actionLabel, logoUrl: brand?.logoUrl, primaryColor: brand?.primaryColor, footerText: brand?.footerText })
}

function templateBilling(title: string, message: string, actionUrl?: string, brand?: Partial<EmailBranding>) {
    return getEmailTemplate({ title: `💰 ${title}`, content: `<p>${message}</p>`, actionUrl, actionLabel: 'Ver Detalhes', primaryColor: brand?.primaryColor || '#10b981', logoUrl: brand?.logoUrl, footerText: brand?.footerText })
}

function templateAlert(title: string, message: string, actionUrl?: string, brand?: Partial<EmailBranding>) {
    return getEmailTemplate({ title: `⚠️ ${title}`, content: `<p>${message}</p>`, actionUrl, actionLabel: 'Ver Agora', primaryColor: brand?.primaryColor || '#f59e0b', logoUrl: brand?.logoUrl, footerText: brand?.footerText })
}

function templateSecurity(title: string, message: string, actionUrl?: string, actionLabel?: string, brand?: Partial<EmailBranding>) {
    return getEmailTemplate({
        title: `🔒 ${title}`,
        content: `<p>${message}</p>`,
        actionUrl,
        actionLabel: actionLabel || 'Redefinir minha senha',
        primaryColor: brand?.primaryColor || '#ef4444',
        logoUrl: brand?.logoUrl,
        footerText: brand?.footerText,
    })
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
    provider?: string
}

// Linha bruta de notification_settings (lida com service_role)
interface TenantSettings {
    email_enabled?: boolean
    custom_smtp_host?: string | null
    custom_smtp_port?: number | null
    custom_smtp_secure?: boolean | null
    custom_smtp_user?: string | null
    custom_smtp_password?: string | null
    custom_smtp_from?: string | null
    custom_smtp_from_name?: string | null
    custom_smtp_reply_to?: string | null
    smtp_verified?: boolean | null
    email_layout_logo_url?: string | null
    email_layout_primary_color?: string | null
    email_layout_footer_text?: string | null
}

interface EmailBranding {
    logoUrl: string
    primaryColor: string
    footerText: string
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

        // Carrega config da empresa (SMTP/WhatsApp próprios), se houver company_id
        let tenant: TenantSettings | null = null
        if (payload.company_id) {
            tenant = await getTenantSettings(supabase, payload.company_id)
        }

        const results: SendResult[] = []
        const channels = payload.channel === 'all'
            ? ['email', 'whatsapp', 'in_app']
            : [payload.channel]

        for (const channel of channels) {
            try {
                switch (channel) {
                    case 'email': {
                        const provider = await sendEmail(supabase, payload, tenant)
                        results.push({ channel: 'email', success: true, provider })
                        break
                    }
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
// Tenant settings loader
// =============================================
async function getTenantSettings(supabase: any, companyId: string): Promise<TenantSettings | null> {
    try {
        const { data } = await supabase
            .from('notification_settings')
            .select('*')
            .eq('company_id', companyId)
            .maybeSingle()
        return data || null
    } catch (err) {
        console.error('[Notification] Erro ao carregar notification_settings:', err)
        return null
    }
}

function tenantSmtpReady(t: TenantSettings | null): boolean {
    return !!(t && t.smtp_verified && t.custom_smtp_host && t.custom_smtp_user && t.custom_smtp_password)
}

async function resolveEmailBranding(
    supabase: any,
    companyId: string,
    tenant: TenantSettings | null,
): Promise<EmailBranding> {
    const { data: company } = await supabase
        .from('companies')
        .select('name, logo_url, primary_color')
        .eq('id', companyId)
        .maybeSingle()

    const companyName = company?.name || 'Sua empresa'
    return {
        logoUrl: tenant?.email_layout_logo_url || company?.logo_url || DEFAULT_LOGO,
        primaryColor: tenant?.email_layout_primary_color || company?.primary_color || DEFAULT_PRIMARY,
        footerText: tenant?.email_layout_footer_text || `${companyName} — Notificações automáticas.`,
    }
}

function buildHtmlFromPayload(payload: NotificationPayload, branding: EmailBranding): string {
    const template = payload.template || 'system'
    const data = payload.data || {}
    const actionUrl = data.action_url || payload.action_url || undefined
    const actionLabel = data.action_label || 'Acessar'
    const brand = {
        logoUrl: data.logo_url || branding.logoUrl,
        primaryColor: sanitizeHexColor(data.primary_color || branding.primaryColor),
        footerText: branding.footerText,
    }

    switch (template) {
        case 'welcome':
            return templateWelcome(data.name || 'Usuário', actionUrl, brand)
        case 'billing':
            return templateBilling(payload.subject || 'Atualização de Pagamento', payload.message, actionUrl, brand)
        case 'alert':
            return templateAlert(payload.subject || 'Alerta', payload.message, actionUrl, brand)
        case 'security':
            return templateSecurity(
                payload.subject || 'Segurança',
                payload.message,
                actionUrl,
                data.action_label || 'Redefinir minha senha',
                brand,
            )
        case 'custom':
            return getEmailTemplate({
                title: payload.subject || 'Notificação',
                content: payload.message,
                actionUrl,
                actionLabel,
                ...brand,
            })
        default:
            return templateSystem(
                payload.subject || 'Notificação do Sistema',
                payload.message,
                actionUrl,
                data.action_label || actionLabel,
                brand,
            )
    }
}

// =============================================
// Email — SMTP próprio do tenant OU MailGrid (sistema)
// retorna o provider usado ('tenant_smtp' | 'mailgrid')
// =============================================
async function sendEmail(supabase: any, payload: NotificationPayload, tenant: TenantSettings | null): Promise<string> {
    const branding = payload.company_id
        ? await resolveEmailBranding(supabase, payload.company_id, tenant)
        : { logoUrl: DEFAULT_LOGO, primaryColor: DEFAULT_PRIMARY, footerText: DEFAULT_FOOTER }

    let htmlContent = payload.html
    if (!htmlContent) {
        htmlContent = buildHtmlFromPayload(payload, branding)
    }

    // ── 1) SMTP próprio do tenant (sem metering) ──
    if (tenantSmtpReady(tenant)) {
        await sendEmailViaSmtp(tenant as TenantSettings, payload, htmlContent!)
        await logNotification(supabase, {
            channel: 'email', recipient: payload.to, subject: payload.subject,
            message: payload.message, status: 'sent',
            source_tool: payload.source_tool || 'hub', company_id: payload.company_id,
            metadata: { provider: 'tenant_smtp', host: tenant!.custom_smtp_host },
        })
        return 'tenant_smtp'
    }

    // ── 2) Fallback: MailGrid (sistema) + metering ──
    await sendEmailViaMailGrid(payload, htmlContent!)
    await logNotification(supabase, {
        channel: 'email', recipient: payload.to, subject: payload.subject,
        message: payload.message, status: 'sent',
        source_tool: payload.source_tool || 'hub', company_id: payload.company_id,
        metadata: { provider: 'mailgrid' },
    })
    if (payload.company_id) {
        await logServiceUsage(supabase, payload.company_id, 'notification_email', payload.source_tool || 'hub')
    }
    return 'mailgrid'
}

async function sendEmailViaSmtp(t: TenantSettings, payload: NotificationPayload, html: string) {
    const port = t.custom_smtp_port || 587
    // secure explícito; default: implícito (TLS direto) só na 465
    const secure = t.custom_smtp_secure ?? (port === 465)
    const fromEmail = t.custom_smtp_from || t.custom_smtp_user!
    const fromName = t.custom_smtp_from_name || 'Notificações'

    console.log(`[Notification] Enviando email para ${payload.to} via SMTP do tenant (${t.custom_smtp_host}:${port})`)

    const client = new SMTPClient({
        connection: {
            hostname: t.custom_smtp_host!,
            port,
            tls: secure,
            auth: { username: t.custom_smtp_user!, password: t.custom_smtp_password! },
        },
    })

    try {
        await client.send({
            from: `${fromName} <${fromEmail}>`,
            to: payload.to,
            replyTo: t.custom_smtp_reply_to || undefined,
            subject: payload.subject || 'Notificação',
            content: payload.message,
            html,
        })
    } finally {
        await client.close().catch(() => {})
    }
}

async function sendEmailViaMailGrid(payload: NotificationPayload, html: string) {
    const host = Deno.env.get('MAILGRID_HOST') || 'server11.mailgrid.com.br'
    const user = Deno.env.get('MAILGRID_USER') || 'smtp@sincla.com.br'
    const password = Deno.env.get('MAILGRID_PASSWORD')
    const fromEmail = Deno.env.get('MAILGRID_FROM') || 'naoresponda@sincla.com.br'
    const fromName = Deno.env.get('MAILGRID_FROM_NAME') || 'Sincla'

    if (!password) throw new Error('MAILGRID_PASSWORD não configurada')

    // Contrato oficial MailGrid (/sendmail/): host_smtp, usuario_smtp, senha_smtp,
    // emailRemetente, emailDestino (ARRAY), assunto, mensagem.
    // Payload antigo (host/usuario/corpo_html) retornava HTTP 200 com
    // codigo 227 e NÃO enviava — por isso os logs marcavam "sent" sem chegar.
    const mailPayload = {
        host_smtp: host,
        usuario_smtp: user,
        senha_smtp: password,
        emailRemetente: fromEmail,
        nomeRemetente: fromName,
        emailDestino: [payload.to],
        assunto: payload.subject || 'Notificação Sincla',
        mensagem: html,
        mensagemTipo: 'html',
        mensagemAlt: payload.message || undefined,
    }

    console.log(`[Notification] Enviando email para ${payload.to} via MailGrid (from=${fromEmail})`)

    const response = await fetch('https://api.mailgrid.net.br/sendmail/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify(mailPayload),
    })

    const raw = await response.text()
    let parsed: unknown = null
    try {
        parsed = JSON.parse(raw)
    } catch {
        /* resposta não-JSON */
    }

    const items = Array.isArray(parsed) ? parsed : (parsed ? [parsed] : [])
    const first = (items[0] || {}) as { status?: string; codigo?: string | number; message?: string }
    const codigo = String(first.codigo ?? '')
    const statusTxt = String(first.status ?? '')
    const okApi = response.ok && (codigo === '200' || statusTxt.toUpperCase().includes('ENVIADA'))

    if (!okApi) {
        console.error(`[Notification] MailGrid recusou: HTTP ${response.status} body=${raw}`)
        throw new Error(
            `MailGrid error ${response.status}/${codigo || '—'}: ${statusTxt || raw || 'falha no envio'}`,
        )
    }

    console.log(`[Notification] MailGrid OK id=${(first as { id?: string }).id || '—'}`)
}

// =============================================
// WhatsApp via UAZAPI (sistema)
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

    await logNotification(supabase, {
        channel: 'whatsapp', recipient: phone, subject: payload.subject,
        message: payload.message, status: 'sent',
        source_tool: payload.source_tool || 'hub', company_id: payload.company_id,
        metadata: { provider: 'uazapi' },
    })
    if (payload.company_id) {
        await logServiceUsage(supabase, payload.company_id, 'notification_whatsapp', payload.source_tool || 'hub')
    }
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
// Service Usage Tracking (Billing) — só no fallback do sistema
// =============================================
const NOTIFICATION_COSTS: Record<string, { cost: number; resale: number }> = {
    notification_email: { cost: 0.002, resale: 0.003 },
    notification_whatsapp: { cost: 0.015, resale: 0.025 },
}

async function logServiceUsage(supabase: any, companyId: string, serviceType: string, toolId: string) {
    try {
        const costs = NOTIFICATION_COSTS[serviceType] || { cost: 0, resale: 0 }
        await supabase.from('service_usage_log').insert({
            company_id: companyId,
            service_type: serviceType,
            sub_type: serviceType.replace('notification_', ''),
            tool_id: toolId,
            quantity: 1,
            unit_cost_brl: costs.cost,
            resale_cost_brl: costs.resale,
        })
    } catch (err) {
        console.error('[Notification] Erro ao logar service_usage:', err)
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
