import { supabase } from '../lib/supabase';
import {
    filterPlansForAccountType,
    type CompanyAccountType,
} from '../lib/companyAccountType';

export interface ActivateProductResult {
    success: boolean;
    instant?: boolean;
    requires_checkout?: boolean;
    plan_slug?: string;
    plan_id?: string;
    subscription_id?: string;
    status?: string;
    trial_days?: number;
    error?: string;
    reason?: string;
}

export interface ProductPlanOption {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    features: string[];
    price_monthly: number;
    price_yearly: number;
    discount_yearly_percent: number;
    trial_days: number;
    is_popular: boolean;
    account_type: string | null;
}

export async function activateCompanyAddon(
    companyId: string,
    productId: string,
    planSlug: string,
): Promise<ActivateProductResult> {
    const { data, error } = await supabase.rpc('activate_company_addon', {
        p_company_id: companyId,
        p_product_id: productId,
        p_plan_slug: planSlug,
    });

    if (error) throw new Error(error.message);
    return (data ?? { success: false, error: 'Resposta vazia' }) as ActivateProductResult;
}

export async function confirmCompanyAddonCheckout(
    companyId: string,
    productId: string,
    planId: string,
    externalSubscriptionId?: string,
    billingCycle: 'monthly' | 'yearly' = 'monthly',
    monthlyAmount?: number,
): Promise<{ success: boolean; error?: string }> {
    const { data, error } = await supabase.rpc('confirm_company_addon_checkout', {
        p_company_id: companyId,
        p_product_id: productId,
        p_plan_id: planId,
        p_external_subscription_id: externalSubscriptionId ?? null,
        p_billing_cycle: billingCycle,
        p_monthly_amount: monthlyAmount ?? null,
    });

    if (error) throw new Error(error.message);
    const result = (data ?? { success: false }) as { success: boolean; error?: string };
    return result;
}

export async function activateCompanyProduct(
    companyId: string,
    productId: string,
    planSlug?: string,
): Promise<ActivateProductResult> {
    const { data, error } = await supabase.rpc('activate_company_product', {
        p_company_id: companyId,
        p_product_id: productId,
        p_plan_slug: planSlug ?? null,
    });

    if (error) throw new Error(error.message);
    return (data ?? { success: false, error: 'Resposta vazia' }) as ActivateProductResult;
}

export async function loadProductPlans(
    productId: string,
    companyAccountType: CompanyAccountType = 'pj',
): Promise<ProductPlanOption[]> {
    const { data, error } = await supabase
        .from('product_plans')
        .select('id, name, slug, description, features, price_monthly, price_yearly, discount_yearly_percent, trial_days, is_popular, sort_order, account_type')
        .eq('product_id', productId)
        .eq('is_active', true)
        .eq('plan_kind', 'base')
        .order('sort_order');

    if (error) throw new Error(error.message);
    return filterPlansForAccountType((data || []) as ProductPlanOption[], companyAccountType);
}
