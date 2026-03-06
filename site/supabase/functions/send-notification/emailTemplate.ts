/**
 * Email Template — Sincla Hub
 * Template HTML profissional responsivo para emails transacionais
 * Tema claro com identidade visual Sincla (azul + gradiente)
 */

export interface EmailTemplateOptions {
    title: string;
    content: string;
    actionUrl?: string;
    actionLabel?: string;
    footerText?: string;
    logoUrl?: string;
    primaryColor?: string;
    preheader?: string;
}

const DEFAULT_LOGO = 'https://app.sincla.com.br/logos/logo-sincla.svg';
const DEFAULT_PRIMARY = '#0047CC';
const DEFAULT_FOOTER = 'Sincla — Plataforma de gestão inteligente para empresas.';

/**
 * Gera o HTML completo de um email transacional
 */
export function getEmailTemplate(options: EmailTemplateOptions): string {
    const {
        title,
        content,
        actionUrl,
        actionLabel = 'Acessar',
        footerText = DEFAULT_FOOTER,
        logoUrl = DEFAULT_LOGO,
        primaryColor = DEFAULT_PRIMARY,
        preheader = '',
    } = options;

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
    ` : '';

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>${title}</title>
    ${preheader ? `<span style="display:none !important;font-size:1px;color:#f7f7f7;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheader}</span>` : ''}
    <!--[if mso]>
    <style type="text/css">
        body, table, td { font-family: Arial, sans-serif !important; }
    </style>
    <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f0f2f5;font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f2f5;">
        <tr>
            <td align="center" style="padding:32px 16px;">
                <!-- Container -->
                <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
                    
                    <!-- Logo -->
                    <tr>
                        <td align="center" style="padding:0 0 24px;">
                            <img src="${logoUrl}" alt="Sincla" width="140" style="display:block;max-width:140px;height:auto;" />
                        </td>
                    </tr>

                    <!-- Card -->
                    <tr>
                        <td style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                
                                <!-- Gradient Top Bar -->
                                <tr>
                                    <td style="height:4px;background:linear-gradient(90deg, ${primaryColor}, #00C2FF);"></td>
                                </tr>

                                <!-- Title -->
                                <tr>
                                    <td style="padding:32px 40px 16px;">
                                        <h1 style="margin:0;font-size:22px;font-weight:700;color:#1a1a2e;line-height:1.3;">${title}</h1>
                                    </td>
                                </tr>

                                <!-- Content -->
                                <tr>
                                    <td style="padding:0 40px 24px;">
                                        <div style="font-size:15px;line-height:1.7;color:#4a4a68;">
                                            ${content}
                                        </div>
                                    </td>
                                </tr>

                                <!-- Action Button -->
                                ${actionButton}

                                <!-- Bottom padding -->
                                <tr>
                                    <td style="padding:0 0 32px;"></td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding:24px 16px;text-align:center;">
                            <p style="margin:0 0 8px;font-size:13px;color:#8c8ca1;">${footerText}</p>
                            <p style="margin:0;font-size:12px;color:#b0b0c0;">
                                <a href="https://sincla.com.br" style="color:#b0b0c0;text-decoration:none;">sincla.com.br</a>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
}

/**
 * Templates pré-definidos para notificações comuns
 */
export const emailTemplates = {
    welcome: (name: string, actionUrl?: string) => getEmailTemplate({
        title: `Bem-vindo ao Sincla, ${name}! 🚀`,
        content: `
            <p>Estamos muito felizes em ter você conosco!</p>
            <p>O Sincla é a plataforma completa para gestão inteligente da sua empresa. Com ele você tem acesso a ferramentas de RH, EAD, Agenda e muito mais.</p>
            <p>Comece agora explorando o painel e configurando sua empresa.</p>
        `,
        actionUrl: actionUrl || 'https://app.sincla.com.br/painel',
        actionLabel: 'Acessar meu Painel',
        preheader: 'Sua conta Sincla foi criada com sucesso!',
    }),

    system: (title: string, message: string, actionUrl?: string, actionLabel?: string) => getEmailTemplate({
        title,
        content: `<p>${message}</p>`,
        actionUrl,
        actionLabel,
    }),

    billing: (title: string, message: string, actionUrl?: string) => getEmailTemplate({
        title: `💰 ${title}`,
        content: `<p>${message}</p>`,
        actionUrl,
        actionLabel: 'Ver Detalhes',
        primaryColor: '#10b981',
    }),

    alert: (title: string, message: string, actionUrl?: string) => getEmailTemplate({
        title: `⚠️ ${title}`,
        content: `<p>${message}</p>`,
        actionUrl,
        actionLabel: 'Ver Agora',
        primaryColor: '#f59e0b',
    }),

    security: (title: string, message: string) => getEmailTemplate({
        title: `🔒 ${title}`,
        content: `<p>${message}</p>`,
        primaryColor: '#ef4444',
    }),
};
