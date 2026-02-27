// ─── Platform Types ──────────────────────────────────────────────────────────

/** Identificadores das plataformas do ecossistema */
export type SinclaPlatform = 'hub' | 'rh' | 'ead' | 'bolso' | 'leads' | 'agenda' | 'intranet';

/** Planos disponíveis */
export type PlanTier = 'starter' | 'pro' | 'business' | 'enterprise';

/** Ciclo de faturamento */
export type BillingCycle = 'monthly' | 'yearly';

// ─── User Types ──────────────────────────────────────────────────────────────

export interface SinclaUser {
    id: string;
    email: string;
    name: string;
    phone?: string;
    avatar_url?: string;
    connected_platforms: SinclaPlatform[];
    created_at: string;
    updated_at: string;
    last_login_at?: string;
}

// ─── Company Types ───────────────────────────────────────────────────────────

export interface SinclaCompany {
    id: string;
    name: string;
    trade_name?: string;
    document?: string;       // CNPJ
    segment?: string;
    subdomain: string;       // empresa.sincla.com.br
    custom_domain?: string;  // rh.minhaempresa.com.br
    logo_url?: string;
    primary_color?: string;
    owner_id: string;
    plan_tier: PlanTier;
    max_users: number;
    active_modules: SinclaPlatform[];
    created_at: string;
    updated_at: string;
}

// ─── Subscription Types ──────────────────────────────────────────────────────

export interface Subscription {
    id: string;
    company_id: string;
    product_id: string;
    plan_id: string;
    status: 'active' | 'past_due' | 'canceled' | 'trialing' | 'paused';
    billing_cycle: BillingCycle;
    current_period_start: string;
    current_period_end: string;
    canceled_at?: string;
    gateway: 'stripe' | 'asaas' | 'manual';
    gateway_subscription_id?: string;
}

// ─── API Response Types ──────────────────────────────────────────────────────

export interface ApiResponse<T> {
    data: T | null;
    error: string | null;
    success: boolean;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
    total: number;
    page: number;
    per_page: number;
    has_more: boolean;
}
