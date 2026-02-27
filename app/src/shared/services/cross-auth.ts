import { supabase } from '../lib/supabase';
import type { Company } from '../contexts/AuthContext';

/**
 * Cross-Auth Service
 * 
 * Handles SSO between Sincla Hub and satellite products.
 * When a user clicks to access a product (RH, EAD, etc.), 
 * we generate a temporary token that the product can validate.
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
        favicon_url: string | null;
        primary_color: string;
        secondary_color: string;
        description: string | null;
    };
    exp: number;
    iat: number;
}

interface Product {
    id: string;
    name: string;
    description: string | null;
    icon: string;
    base_url: string;
    is_active: boolean;
}

/**
 * Fetches all active products from the catalog
 */
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

/**
 * Fetches subscriptions for a company
 */
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

/**
 * Checks if a user has access to a specific product
 */
export async function hasProductAccess(
    companyMemberId: string,
    productId: string
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

/**
 * Generates a cross-token for SSO to a product.
 * This calls a Supabase Edge Function that creates a signed JWT.
 */
export async function generateCrossToken(
    productId: string,
    companyId: string
): Promise<string | null> {
    try {
        const { data, error } = await supabase.functions.invoke('generate-cross-token', {
            body: {
                product_id: productId,
                company_id: companyId,
            },
        });

        if (error) {
            console.error('Error generating cross token:', error);
            return null;
        }

        return data.token;
    } catch (error) {
        console.error('Error generating cross token:', error);
        return null;
    }
}

/**
 * Redirects user to a product with SSO
 */
export async function redirectToProduct(
    product: Product,
    company: Company
): Promise<void> {
    const token = await generateCrossToken(product.id, company.id);

    if (!token) {
        throw new Error('Failed to generate authentication token');
    }

    // Construct the callback URL
    // fallback handling if base_url is still an absolute URL, but expected to be '/rh'
    const baseOrigin = product.base_url.startsWith('http') ? product.base_url : window.location.origin;
    const path = product.base_url.startsWith('http') ? '/smart-access' : `${product.base_url}/smart-access`;

    const callbackUrl = new URL(path, baseOrigin);
    callbackUrl.searchParams.set('key', token);
    callbackUrl.searchParams.set('empresa', company.slug);

    // Redirect to the product
    window.location.href = callbackUrl.toString();
}

/**
 * Validates a cross-token received from the Hub.
 * This should be called by satellite products.
 */
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

/**
 * Creates a local session in a satellite product after SSO
 */
export async function createLocalSession(payload: CrossTokenPayload): Promise<boolean> {
    // This function should be implemented in each satellite product
    // It creates a local session based on the validated token payload

    // Store user info in local storage or session
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
