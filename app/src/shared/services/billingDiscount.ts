/**
 * Regras de desconto na fatura (Hub)
 * Contratação dupla / ferramenta paralela → 15% OFF automático.
 */

import { supabase } from '../lib/supabase';

export const PARALLEL_TOOL_DISCOUNT_FALLBACK_PERCENT = 15;

export interface ParallelDiscountQuote {
    eligible: boolean;
    percent: number;
    listPrice: number;
    discountAmount: number;
    finalPrice: number;
}

export async function getParallelToolDiscountPercent(): Promise<number> {
    try {
        const { data, error } = await supabase.rpc('get_parallel_tool_discount_percent');
        if (error) throw error;
        const n = Number(data);
        return Number.isFinite(n) && n > 0 ? n : PARALLEL_TOOL_DISCOUNT_FALLBACK_PERCENT;
    } catch {
        return PARALLEL_TOOL_DISCOUNT_FALLBACK_PERCENT;
    }
}

export async function companyHasOtherActiveProduct(
    companyId: string,
    excludeProductId: string,
): Promise<boolean> {
    try {
        const { data, error } = await supabase.rpc('company_has_other_active_product', {
            p_company_id: companyId,
            p_exclude_product_id: excludeProductId,
        });
        if (error) throw error;
        return !!data;
    } catch {
        // Fallback direto na tabela se RPC ainda não existir
        const { data } = await supabase
            .from('subscriptions')
            .select('id')
            .eq('company_id', companyId)
            .neq('product_id', excludeProductId)
            .in('status', ['active', 'trial'])
            .limit(1);
        return (data?.length || 0) > 0;
    }
}

export function applyPercentDiscount(listPrice: number, percent: number): ParallelDiscountQuote {
    const p = Math.max(0, Math.min(100, percent));
    const discountAmount = Math.round(listPrice * (p / 100) * 100) / 100;
    const finalPrice = Math.round((listPrice - discountAmount) * 100) / 100;
    return {
        eligible: p > 0,
        percent: p,
        listPrice,
        discountAmount,
        finalPrice,
    };
}

export async function quoteParallelToolPrice(
    companyId: string,
    productId: string,
    listPrice: number,
): Promise<ParallelDiscountQuote> {
    const [eligible, percent] = await Promise.all([
        companyHasOtherActiveProduct(companyId, productId),
        getParallelToolDiscountPercent(),
    ]);
    if (!eligible || listPrice <= 0) {
        return {
            eligible: false,
            percent: 0,
            listPrice,
            discountAmount: 0,
            finalPrice: listPrice,
        };
    }
    return { ...applyPercentDiscount(listPrice, percent), eligible: true };
}
