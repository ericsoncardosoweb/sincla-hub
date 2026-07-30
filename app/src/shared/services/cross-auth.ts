import { notifications } from '@mantine/notifications';
import { supabase } from '../lib/supabase';
import type { Company } from '../contexts/AuthContext';

/**
 * Cross-Auth Service
 *
 * Handles SSO between Sincla Hub and satellite products.
 */

interface CrossTokenPayload {
    user_id: string;
    email: string;
    name: string | null;
    company_id: string;
    company_slug: string;
    company_name: string;
    role: string;
    product_id: string;
    branding: {
        logo_url: string | null;
        logo_dark_url: string | null;
        favicon_url: string | null;
        primary_color: string;
        secondary_color: string;
        description: string | null;
    };
    exp: number;
    iat: number;
}

export interface ProductRef {
    id: string;
    name?: string;
    description?: string | null;
    icon?: string;
    base_url: string;
    is_active?: boolean;
}

interface Product extends ProductRef {
    name: string;
    description: string | null;
    icon: string;
    is_active: boolean;
}

type CompanySlugRef = Pick<Company, 'slug' | 'custom_domain'>;

function normalizeProductPath(baseUrl: string): string {
    if (baseUrl.startsWith('http')) {
        return new URL(baseUrl).pathname.replace(/\/$/, '') || '';
    }
    return baseUrl.replace(/\/$/, '');
}

/** URL pública de login da ferramenta para a empresa (compartilhável). */
export function buildProductLoginUrl(product: ProductRef, company: CompanySlugRef): string {
    const slug = company.slug || '';
    const productPath = normalizeProductPath(product.base_url);

    if (company.custom_domain) {
        return `https://${company.custom_domain}${productPath}/${slug}/login`;
    }

    if (product.base_url.startsWith('http')) {
        return `${product.base_url.replace(/\/$/, '')}/${slug}/login`;
    }

    return `${window.location.origin}${productPath}/${slug}/login`;
}

/** URL de callback SSO Hub → satélite. */
export function buildProductSsoUrl(product: ProductRef, company: Pick<Company, 'slug'>, token: string): string {
    const baseOrigin = product.base_url.startsWith('http')
        ? product.base_url
        : window.location.origin;
    const path = product.base_url.startsWith('http')
        ? '/smart-access'
        : `${normalizeProductPath(product.base_url)}/smart-access`;

    const callbackUrl = new URL(path, baseOrigin);
    callbackUrl.searchParams.set('key', token);
    callbackUrl.searchParams.set('empresa', company.slug);
    return callbackUrl.toString();
}

function mapTokenError(message: string): string {
    const lower = message.toLowerCase();
    if (lower.includes('non-2xx')) {
        return 'Não foi possível gerar o acesso à ferramenta. Tente novamente.';
    }
    if (lower.includes('not a member')) {
        return 'Você não é membro desta empresa.';
    }
    if (lower.includes('active subscription') || lower.includes('subscription')) {
        return 'Esta empresa não possui assinatura ativa desta ferramenta.';
    }
    if (lower.includes('does not have access') || lower.includes('access to this product')) {
        return 'Você não tem permissão para acessar esta ferramenta. Peça acesso ao administrador.';
    }
    if (lower.includes('invalid token') || lower.includes('authorization')) {
        return 'Sessão expirada. Faça login novamente no Hub.';
    }
    return message || 'Não foi possível gerar o acesso à ferramenta.';
}

export async function getProducts(): Promise<Product[]> {
    const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('name');

    if (error) {
        console.error('Error fetching products:', error);
        return [];
    }

    return data as Product[];
}

export async function getCompanySubscriptions(companyId: string) {
    const { data, error } = await supabase
        .from('subscriptions')
        .select(`
      *,
      products(id, name, icon, base_url)
    `)
        .eq('company_id', companyId)
        .in('status', ['active', 'trial']);

    if (error) {
        console.error('Error fetching subscriptions:', error);
        return [];
    }

    return data;
}

export async function hasProductAccess(
    companyMemberId: string,
    productId: string,
): Promise<boolean> {
    const { data, error } = await supabase
        .from('member_product_access')
        .select('id')
        .eq('company_member_id', companyMemberId)
        .eq('product_id', productId)
        .single();

    if (error || !data) {
        return false;
    }

    return true;
}

export async function generateCrossToken(
    productId: string,
    companyId: string,
): Promise<string> {
    const { data, error } = await supabase.functions.invoke('generate-cross-token', {
        body: {
            product_id: productId,
            company_id: companyId,
        },
    });

    if (error) {
        let bodyError = typeof data?.error === 'string' ? data.error : error.message;
        try {
            const ctx = (error as { context?: Response }).context;
            if (ctx && typeof ctx.json === 'function') {
                const parsed = await ctx.json();
                if (parsed?.error) bodyError = parsed.error;
            }
        } catch {
            // mantém mensagem padrão
        }
        throw new Error(mapTokenError(bodyError));
    }

    if (!data?.token) {
        throw new Error(mapTokenError(data?.error || 'Token não retornado'));
    }

    return data.token as string;
}

export interface RedirectToProductOptions {
    /** Abre em nova aba. Padrão: mesma aba (evita bloqueio de popup). */
    newTab?: boolean;
    /** Exibe toasts de loading/erro. Padrão: true. */
    notify?: boolean;
}

export async function redirectToProduct(
    product: ProductRef,
    company: Company,
    options: RedirectToProductOptions = {},
): Promise<void> {
    const { newTab = false, notify = true } = options;
    const label = product.name || 'ferramenta';

    if (notify) {
        notifications.show({
            id: `access-${product.id}`,
            title: `Abrindo ${label}`,
            message: 'Preparando acesso seguro...',
            loading: true,
            autoClose: false,
            withCloseButton: false,
        });
    }

    try {
        const token = await generateCrossToken(product.id, company.id);
        const url = buildProductSsoUrl(product, company, token);

        if (notify) {
            notifications.hide(`access-${product.id}`);
        }

        if (newTab) {
            const opened = window.open(url, '_blank', 'noopener,noreferrer');
            if (!opened) {
                window.location.href = url;
            }
        } else {
            window.location.href = url;
        }
    } catch (error) {
        if (notify) {
            notifications.update({
                id: `access-${product.id}`,
                title: 'Não foi possível abrir',
                message: error instanceof Error ? error.message : 'Erro desconhecido',
                color: 'red',
                loading: false,
                autoClose: 8000,
            });
        }
        throw error;
    }
}

export async function validateCrossToken(token: string): Promise<CrossTokenPayload | null> {
    try {
        const { data, error } = await supabase.functions.invoke('validate-cross-token', {
            body: { token },
        });

        if (error) {
            console.error('Error validating cross token:', error);
            return null;
        }

        return data.payload as CrossTokenPayload;
    } catch (error) {
        console.error('Error validating cross token:', error);
        return null;
    }
}

export async function createLocalSession(payload: CrossTokenPayload): Promise<boolean> {
    sessionStorage.setItem('sincla_user', JSON.stringify({
        id: payload.user_id,
        email: payload.email,
        name: payload.name,
    }));

    sessionStorage.setItem('sincla_company', JSON.stringify({
        id: payload.company_id,
        slug: payload.company_slug,
        name: payload.company_name,
    }));

    sessionStorage.setItem('sincla_branding', JSON.stringify(payload.branding));

    return true;
}
