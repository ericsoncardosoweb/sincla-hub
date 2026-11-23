/**
 * Assinatura manual com convite — Sincla Hub
 * Frontend → Edge Function (subscription-invite)
 */

import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export type BillingCycle = 'monthly' | 'yearly';

export interface InviteItemInput {
    product_id: string;
    plan_id: string;
    ai_tokens: number | null;
    /** Valor por ciclo; null = valor normal do plano */
    price: number | null;
}

export interface CreateInviteInput {
    contact_name: string;
    company_name: string;
    email: string;
    phone: string;
    cpf_cnpj: string;
    billing_cycle: BillingCycle;
    due_date: string;
    storage_gb: number | null;
    items: InviteItemInput[];
    send_email: boolean;
}

export interface PublicInviteItem {
    product_name: string;
    plan_name: string;
    ai_tokens: number | null;
    list_price: number;
    price: number;
}

export interface PublicInvite {
    status: 'pending' | 'processing' | 'accepted' | 'canceled' | 'expired';
    contact_name: string;
    company_name: string;
    email: string;
    billing_cycle: BillingCycle;
    due_date: string;
    storage_gb: number | null;
    total_amount: number;
    expires_at: string;
    items: PublicInviteItem[];
    invoice_url: string | null;
}

export interface GetInviteResponse {
    invite: PublicInvite;
    needs_password: boolean;
    is_invited_user: boolean;
}

async function callInvite<T>(body: Record<string, unknown>): Promise<T> {
    const { data, error } = await supabase.functions.invoke('subscription-invite', { body });
    if (error) {
        if (error instanceof FunctionsHttpError) {
            const payload = await error.context.json().catch(() => null);
            throw new Error(payload?.error || 'Falha na comunicação com o servidor');
        }
        throw new Error(error.message || 'Falha na comunicação com o servidor');
    }
    if (data?.error) throw new Error(data.error);
    return data as T;
}

export const subscriptionInviteService = {
    create: (input: CreateInviteInput) =>
        callInvite<{ invite_id: string; invite_url: string; email_sent: boolean }>({ action: 'create', ...input }),
    resend: (inviteId: string) =>
        callInvite<{ invite_url: string }>({ action: 'resend', invite_id: inviteId }),
    cancel: (inviteId: string) =>
        callInvite<{ success: boolean }>({ action: 'cancel', invite_id: inviteId }),
    get: (token: string) =>
        callInvite<GetInviteResponse>({ action: 'get', token }),
    setPassword: (token: string, password: string) =>
        callInvite<{ email: string }>({ action: 'set_password', token, password }),
    accept: (token: string, password?: string) =>
        callInvite<{ email: string; invoice_url: string | null }>({ action: 'accept', token, password }),
};

export const AI_TOKEN_SUGGESTIONS = [2_000_000, 5_000_000, 10_000_000, 20_000_000, 50_000_000];

export const STORAGE_SUGGESTIONS_GB = [5, 10, 25, 50, 100, 250, 500];

export const formatTokens = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`;
    if (n >= 1_000) return `${(n / 1_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`;
    return n.toLocaleString('pt-BR');
};
