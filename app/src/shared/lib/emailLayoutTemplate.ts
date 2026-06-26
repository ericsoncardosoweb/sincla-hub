/**
 * Template HTML responsivo para e-mails transacionais.
 * Espelha o layout usado na edge function send-notification.
 */

export interface EmailLayoutOptions {
    title: string;
    content: string;
    actionUrl?: string;
    actionLabel?: string;
    footerText?: string;
    logoUrl?: string;
    primaryColor?: string;
    preheader?: string;
}

export const DEFAULT_EMAIL_LOGO = 'https://app.sincla.com.br/logos/logo-sincla.svg';
export const DEFAULT_EMAIL_PRIMARY = '#0047CC';
export const DEFAULT_EMAIL_FOOTER = 'Sincla — Plataforma de gestão inteligente para empresas.';

/** Escapa texto para uso seguro dentro de HTML. */
function esc(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

export function buildEmailLayoutHtml(options: EmailLayoutOptions): string {
    const {
        title,
        content,
        actionUrl,
        actionLabel = 'Acessar',
        footerText = DEFAULT_EMAIL_FOOTER,
        logoUrl = DEFAULT_EMAIL_LOGO,
        primaryColor = DEFAULT_EMAIL_PRIMARY,
        preheader = '',
    } = options;

    const safeTitle = esc(title);
    const safeFooter = esc(footerText);
    const safePreheader = preheader ? esc(preheader) : '';
    const safeLogo = esc(logoUrl);
    const safeColor = esc(primaryColor);

    const actionButton = actionUrl
        ? `
        <tr>
            <td align="center" style="padding: 24px 40px 8px;">
                <a href="${esc(actionUrl)}" target="_blank" style="
                    display: inline-block;
                    background: ${safeColor};
                    color: #ffffff;
                    text-decoration: none;
                    padding: 14px 32px;
                    border-radius: 8px;
                    font-weight: 600;
                    font-size: 15px;
                    mso-padding-alt: 0;
                ">${esc(actionLabel)}</a>
            </td>
        </tr>`
        : '';

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>${safeTitle}</title>
    ${safePreheader ? `<span style="display:none!important;font-size:1px;color:#f7f7f7;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${safePreheader}</span>` : ''}
    <!--[if mso]><style type="text/css">body,table,td{font-family:Arial,sans-serif!important;}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f0f2f5;font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-text-size-adjust:100%;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f0f2f5;">
        <tr>
            <td align="center" style="padding:24px 12px;">
                <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
                    <tr>
                        <td align="center" style="padding:0 0 20px;">
                            <img src="${safeLogo}" alt="" width="140" style="display:block;max-width:140px;width:100%;height:auto;border:0;" />
                        </td>
                    </tr>
                    <tr>
                        <td style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                <tr><td style="height:4px;background:${safeColor};font-size:0;line-height:0;">&nbsp;</td></tr>
                                <tr>
                                    <td style="padding:28px 24px 12px;">
                                        <h1 style="margin:0;font-size:20px;font-weight:700;color:#1a1a2e;line-height:1.35;">${safeTitle}</h1>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding:0 24px 24px;">
                                        <div style="font-size:15px;line-height:1.7;color:#4a4a68;">${content}</div>
                                    </td>
                                </tr>
                                ${actionButton}
                                <tr><td style="padding:0 0 28px;font-size:0;line-height:0;">&nbsp;</td></tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:20px 12px;text-align:center;">
                            <p style="margin:0;font-size:12px;line-height:1.5;color:#8c8ca1;">${safeFooter}</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
}

/** HTML de exemplo para o preview no painel. */
export function buildEmailLayoutPreview(options: {
    companyName: string;
    logoUrl?: string;
    primaryColor?: string;
    footerText?: string;
}): string {
    const { companyName, logoUrl, primaryColor, footerText } = options;
    return buildEmailLayoutHtml({
        title: 'Exemplo de notificação',
        content: `<p>Olá! Este é um preview de como os e-mails da <strong>${esc(companyName)}</strong> serão exibidos para seus colaboradores e clientes.</p>
            <p style="margin:16px 0 0;padding:12px 16px;background:#f8f9fa;border-radius:8px;border-left:4px solid ${esc(primaryColor || DEFAULT_EMAIL_PRIMARY)};">
                O layout é responsivo e funciona bem em celular e desktop.
            </p>`,
        actionUrl: 'https://app.sincla.com.br/painel',
        actionLabel: 'Acessar painel',
        logoUrl: logoUrl || DEFAULT_EMAIL_LOGO,
        primaryColor: primaryColor || DEFAULT_EMAIL_PRIMARY,
        footerText: footerText || `${companyName} — Notificações automáticas.`,
        preheader: 'Preview do layout de e-mail da sua empresa',
    });
}
