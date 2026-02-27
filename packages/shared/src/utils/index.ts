import type { SinclaPlatform } from '../types';

/**
 * Formata valor monetário em BRL.
 */
export function formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(value);
}

/**
 * Formata data no padrão brasileiro.
 */
export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('pt-BR', options ?? {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
}

/**
 * Formata data e hora no padrão brasileiro.
 */
export function formatDateTime(date: string | Date): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

/**
 * Retorna a URL base de uma plataforma.
 */
export function getPlatformUrl(platform: SinclaPlatform, baseDomain = 'sincla.com.br'): string {
    if (platform === 'hub') return `https://app.${baseDomain}`;
    return `https://app.${baseDomain}/${platform}`;
}

/**
 * Retorna o nome legível de uma plataforma.
 */
export function getPlatformName(platform: SinclaPlatform): string {
    const names: Record<SinclaPlatform, string> = {
        hub: 'Sincla Hub',
        rh: 'Sincla RH',
        ead: 'Sincla EAD',
        bolso: 'Sincla Bolso',
        leads: 'Sincla Leads',
        agenda: 'Sincla Agenda',
        intranet: 'Sincla Intranet',
    };
    return names[platform];
}

/**
 * Monta classnames condicionais.
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
    return classes.filter(Boolean).join(' ');
}

/**
 * Retorna as iniciais do nome (max 2 caracteres).
 */
export function getInitials(name: string): string {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0].toUpperCase())
        .join('');
}
