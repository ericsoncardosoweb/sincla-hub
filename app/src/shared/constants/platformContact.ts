/** WhatsApp oficial Sincla (contato comercial / Enterprise) */
export const PLATFORM_WHATSAPP_DISPLAY = '(11) 97020-7076';
export const PLATFORM_WHATSAPP_E164 = '5511970207076';

export function resolvePlatformWhatsAppNumber(stored?: string | null): string {
    const value = (stored || PLATFORM_WHATSAPP_DISPLAY).trim();
    return value || PLATFORM_WHATSAPP_DISPLAY;
}

export function buildPlatformWhatsAppUrl(message: string, stored?: string | null): string {
    const digits = resolvePlatformWhatsAppNumber(stored).replace(/\D/g, '');
    const e164 = digits.startsWith('55') ? digits : `55${digits}`;
    return `https://wa.me/${e164}?text=${encodeURIComponent(message)}`;
}
