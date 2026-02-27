/**
 * Asaas Payment Service — Sincla Hub
 *
 * Comunicação segura com gateway de pagamento via Edge Function
 * Frontend → Edge Function (asaas-checkout) → Asaas API
 */

import { supabase } from '../lib/supabase';

// =============================================
// TYPES
// =============================================

export interface CreateSubscriptionData {
    planId: string;
    productId: string;
    companyId: string;
    billingType: 'CREDIT_CARD' | 'PIX';
    cycle: 'MONTHLY' | 'YEARLY';
    creditCard?: {
        holderName: string;
        number: string;
        expiryMonth: string;
        expiryYear: string;
        ccv: string;
    };
    creditCardHolderInfo?: {
        name: string;
        email: string;
        cpfCnpj: string;
        postalCode: string;
        addressNumber: string;
        phone: string;
    };
    customerName: string;
    customerEmail: string;
    customerCpfCnpj: string;
    customerPhone?: string;
}

export interface SubscriptionResponse {
    success: boolean;
    subscriptionId?: string;
    paymentId?: string;
    pixQrCode?: string;
    pixCopyPaste?: string;
    pixExpirationDate?: string;
    error?: string;
}

export type CardBrand = 'visa' | 'mastercard' | 'amex' | 'elo' | 'hipercard' | 'diners' | 'discover' | 'unknown';

// =============================================
// VALIDAÇÕES (client-side, UX only)
// =============================================

/**
 * Validação de CPF usando algoritmo oficial
 */
export function validateCpf(cpf: string): boolean {
    const clean = cpf.replace(/\D/g, '');
    if (clean.length !== 11) return false;
    if (/^(\d)\1+$/.test(clean)) return false;

    let sum = 0;
    for (let i = 0; i < 9; i++) {
        sum += parseInt(clean.charAt(i)) * (10 - i);
    }
    let remainder = 11 - (sum % 11);
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(clean.charAt(9))) return false;

    sum = 0;
    for (let i = 0; i < 10; i++) {
        sum += parseInt(clean.charAt(i)) * (11 - i);
    }
    remainder = 11 - (sum % 11);
    if (remainder === 10 || remainder === 11) remainder = 0;
    return remainder === parseInt(clean.charAt(10));
}

/**
 * Validação de CNPJ
 */
export function validateCnpj(cnpj: string): boolean {
    const clean = cnpj.replace(/\D/g, '');
    if (clean.length !== 14) return false;
    if (/^(\d)\1+$/.test(clean)) return false;

    const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

    let sum = 0;
    for (let i = 0; i < 12; i++) sum += parseInt(clean.charAt(i)) * weights1[i];
    let remainder = sum % 11;
    const d1 = remainder < 2 ? 0 : 11 - remainder;
    if (parseInt(clean.charAt(12)) !== d1) return false;

    sum = 0;
    for (let i = 0; i < 13; i++) sum += parseInt(clean.charAt(i)) * weights2[i];
    remainder = sum % 11;
    const d2 = remainder < 2 ? 0 : 11 - remainder;
    return parseInt(clean.charAt(13)) === d2;
}

/**
 * Validação de documento (CPF ou CNPJ)
 */
export function validateDocument(value: string): { valid: boolean; type: 'cpf' | 'cnpj' | null } {
    const clean = value.replace(/\D/g, '');
    if (clean.length === 11) return { valid: validateCpf(clean), type: 'cpf' };
    if (clean.length === 14) return { valid: validateCnpj(clean), type: 'cnpj' };
    return { valid: false, type: null };
}

/**
 * Validação de número de cartão (algoritmo Luhn)
 */
export function validateCardNumber(number: string): boolean {
    const clean = number.replace(/\D/g, '');
    if (clean.length < 13 || clean.length > 19) return false;

    let sum = 0;
    let isEven = false;
    for (let i = clean.length - 1; i >= 0; i--) {
        let digit = parseInt(clean.charAt(i));
        if (isEven) {
            digit *= 2;
            if (digit > 9) digit -= 9;
        }
        sum += digit;
        isEven = !isEven;
    }
    return sum % 10 === 0;
}

// =============================================
// DETECÇÃO DE BANDEIRA
// =============================================

export function detectCardBrand(number: string): CardBrand {
    const clean = number.replace(/\D/g, '');
    if (!clean) return 'unknown';

    // Elo
    const eloRanges = ['4011', '4312', '4389', '5041', '5066', '5067', '6277', '6362', '6363'];
    if (eloRanges.some(r => clean.startsWith(r))) return 'elo';

    // Hipercard
    if (clean.startsWith('606282') || clean.startsWith('3841')) return 'hipercard';

    // Visa
    if (clean.startsWith('4')) return 'visa';

    // Mastercard
    const mc = parseInt(clean.slice(0, 2));
    const mc4 = parseInt(clean.slice(0, 4));
    if ((mc >= 51 && mc <= 55) || (mc4 >= 2221 && mc4 <= 2720)) return 'mastercard';

    // Amex
    if (clean.startsWith('34') || clean.startsWith('37')) return 'amex';

    // Diners
    if (clean.startsWith('36') || clean.startsWith('38') || (parseInt(clean.slice(0, 3)) >= 300 && parseInt(clean.slice(0, 3)) <= 305)) return 'diners';

    // Discover
    if (clean.startsWith('6011') || clean.startsWith('622') || clean.startsWith('64') || clean.startsWith('65')) return 'discover';

    return 'unknown';
}

// =============================================
// FORMATAÇÃO
// =============================================

export function formatCpf(cpf: string): string {
    const clean = cpf.replace(/\D/g, '').slice(0, 11);
    if (clean.length <= 3) return clean;
    if (clean.length <= 6) return `${clean.slice(0, 3)}.${clean.slice(3)}`;
    if (clean.length <= 9) return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6)}`;
    return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9)}`;
}

export function formatCnpj(cnpj: string): string {
    const clean = cnpj.replace(/\D/g, '').slice(0, 14);
    if (clean.length <= 2) return clean;
    if (clean.length <= 5) return `${clean.slice(0, 2)}.${clean.slice(2)}`;
    if (clean.length <= 8) return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5)}`;
    if (clean.length <= 12) return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5, 8)}/${clean.slice(8)}`;
    return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5, 8)}/${clean.slice(8, 12)}-${clean.slice(12)}`;
}

export function formatDocument(value: string): string {
    const clean = value.replace(/\D/g, '');
    if (clean.length <= 11) return formatCpf(value);
    return formatCnpj(value);
}

export function formatCardNumber(number: string): string {
    const clean = number.replace(/\D/g, '').slice(0, 16);
    return clean.replace(/(\d{4})/g, '$1 ').trim();
}

export function formatExpiry(expiry: string): string {
    const clean = expiry.replace(/\D/g, '').slice(0, 4);
    if (clean.length >= 2) return clean.slice(0, 2) + '/' + clean.slice(2);
    return clean;
}

export function formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

// =============================================
// API CALLS (via Edge Function)
// =============================================

async function callAsaasCheckout(payload: Record<string, unknown>): Promise<any> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Não autenticado');

    const isSandbox = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    const { data, error } = await supabase.functions.invoke('asaas-checkout', {
        body: {
            ...payload,
            sandbox: isSandbox,
        },
    });

    if (error) throw new Error(error.message || 'Erro na comunicação com o gateway');
    if (data?.error) throw new Error(data.error);
    return data;
}

/**
 * Criar ou buscar cliente no Asaas
 */
export async function createOrGetCustomer(customerData: {
    name: string;
    email: string;
    cpfCnpj: string;
    phone?: string;
}): Promise<{ id: string }> {
    // First try to find existing
    const findResult = await callAsaasCheckout({
        endpoint: `/customers?cpfCnpj=${customerData.cpfCnpj.replace(/\D/g, '')}`,
        method: 'GET',
    });

    if (findResult?.data?.length > 0) {
        return { id: findResult.data[0].id };
    }

    // Create new
    const createResult = await callAsaasCheckout({
        endpoint: '/customers',
        method: 'POST',
        data: {
            name: customerData.name,
            email: customerData.email,
            cpfCnpj: customerData.cpfCnpj.replace(/\D/g, ''),
            phone: customerData.phone?.replace(/\D/g, '') || undefined,
            notificationDisabled: true,
        },
    });

    return { id: createResult.id };
}

/**
 * Criar assinatura no Asaas
 */
export async function createSubscription(data: CreateSubscriptionData): Promise<SubscriptionResponse> {
    try {
        // 1. Criar/buscar cliente
        const customer = await createOrGetCustomer({
            name: data.customerName,
            email: data.customerEmail,
            cpfCnpj: data.customerCpfCnpj,
            phone: data.customerPhone,
        });

        // 2. Buscar plano do banco
        const { data: plan } = await supabase
            .from('product_plans')
            .select('name, slug, price_monthly, price_yearly')
            .eq('id', data.planId)
            .single();

        if (!plan) throw new Error('Plano não encontrado');

        const value = data.cycle === 'YEARLY' ? (plan.price_yearly || plan.price_monthly * 12) : plan.price_monthly;
        const cycle = data.cycle === 'YEARLY' ? 'YEARLY' : 'MONTHLY';

        // 3. Criar assinatura no Asaas
        const subscriptionPayload: Record<string, unknown> = {
            customer: customer.id,
            billingType: data.billingType,
            value,
            cycle,
            description: `Sincla Hub - ${plan.name}`,
            nextDueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        };

        // Dados de cartão
        if (data.billingType === 'CREDIT_CARD' && data.creditCard) {
            subscriptionPayload.creditCard = {
                holderName: data.creditCard.holderName,
                number: data.creditCard.number.replace(/\D/g, ''),
                expiryMonth: data.creditCard.expiryMonth,
                expiryYear: data.creditCard.expiryYear.length === 2 ? `20${data.creditCard.expiryYear}` : data.creditCard.expiryYear,
                ccv: data.creditCard.ccv,
            };
            subscriptionPayload.creditCardHolderInfo = data.creditCardHolderInfo;
        }

        const result = await callAsaasCheckout({
            endpoint: '/subscriptions',
            method: 'POST',
            data: subscriptionPayload,
            userId: data.companyId,
            productId: data.productId,
        });

        // 4. Se PIX, buscar QR Code
        if (data.billingType === 'PIX' && result?.id) {
            const payments = await callAsaasCheckout({
                endpoint: `/subscriptions/${result.id}/payments`,
                method: 'GET',
            });

            const firstPayment = payments?.data?.[0];
            if (firstPayment) {
                const pixQr = await callAsaasCheckout({
                    endpoint: `/payments/${firstPayment.id}/pixQrCode`,
                    method: 'GET',
                });

                return {
                    success: true,
                    subscriptionId: result.id,
                    paymentId: firstPayment.id,
                    pixQrCode: pixQr?.encodedImage,
                    pixCopyPaste: pixQr?.payload,
                    pixExpirationDate: pixQr?.expirationDate,
                };
            }
        }

        return {
            success: true,
            subscriptionId: result.id,
        };
    } catch (error: any) {
        return {
            success: false,
            error: error.message || 'Erro ao criar assinatura',
        };
    }
}

/**
 * Verificar status de pagamento PIX
 */
export async function checkPixPaymentStatus(paymentId: string): Promise<{ status: string; paid: boolean }> {
    const result = await callAsaasCheckout({
        endpoint: `/payments/${paymentId}`,
        method: 'GET',
    });

    const paid = ['CONFIRMED', 'RECEIVED', 'RECEIVED_IN_CASH'].includes(result?.status);
    return { status: result?.status, paid };
}

/**
 * Cancelar assinatura
 */
export async function cancelSubscription(subscriptionId: string): Promise<{ success: boolean; error?: string }> {
    try {
        await callAsaasCheckout({
            endpoint: `/subscriptions/${subscriptionId}`,
            method: 'DELETE',
        });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
