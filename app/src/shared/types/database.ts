/**
 * Database Types for Sincla Hub
 * 
 * These types mirror the database schema defined in the migrations.
 */

// =====================================================
// CAMADA 1: ASSINANTES
// =====================================================

export interface Subscriber {
    id: string;
    email: string;
    name: string | null;
    phone: string | null;
    cpf_cnpj: string | null;
    avatar_url: string | null;
    created_at: string;
    updated_at: string;
}

// =====================================================
// CAMADA 2: EMPRESAS
// =====================================================

export type CompanyStatus = 'active' | 'suspended' | 'canceled';

export interface Company {
    id: string;
    subscriber_id: string;

    // Identificação
    name: string;
    slug: string;
    cnpj: string | null;

    // Personalização (Branding)
    custom_domain: string | null;
    logo_url: string | null;
    favicon_url: string | null;
    primary_color: string;
    secondary_color: string;

    // Contexto
    description: string | null;
    industry: string | null;
    employee_count: number | null;

    // Status
    status: CompanyStatus;
    settings: Record<string, unknown>;

    created_at: string;
    updated_at: string;
}

export interface CompanyInsert {
    name: string;
    slug?: string;
    cnpj?: string;
    custom_domain?: string;
    logo_url?: string;
    favicon_url?: string;
    primary_color?: string;
    secondary_color?: string;
    description?: string;
    industry?: string;
    employee_count?: number;
}

export interface CompanyUpdate extends Partial<CompanyInsert> { }

// =====================================================
// CAMADA 3: MEMBROS
// =====================================================

export type MemberRole = 'owner' | 'admin' | 'manager' | 'member';
export type MemberStatus = 'active' | 'invited' | 'suspended';

export interface CompanyMember {
    id: string;
    company_id: string;
    user_id: string;
    role: MemberRole;
    status: MemberStatus;
    invited_by: string | null;
    invited_at: string | null;
    joined_at: string | null;
    created_at: string;
    updated_at: string;
}

// With relations
export interface CompanyMemberWithUser extends CompanyMember {
    subscribers: Pick<Subscriber, 'id' | 'email' | 'name' | 'avatar_url'>;
}

// =====================================================
// CAMADA 4: PRODUTOS E ASSINATURAS
// =====================================================

export interface Product {
    id: string;
    name: string;
    description: string | null;
    icon: string;
    base_url: string;
    webhook_url: string | null;
    webhook_secret: string | null;
    is_active: boolean;
    created_at: string;
}

export type SubscriptionPlan = 'starter' | 'pro' | 'business' | 'enterprise';
export type SubscriptionStatus = 'active' | 'trial' | 'past_due' | 'canceled' | 'suspended';

export interface Subscription {
    id: string;
    company_id: string;
    product_id: string;

    plan: SubscriptionPlan;
    status: SubscriptionStatus;

    seats_limit: number;
    seats_used: number;

    external_subscription_id: string | null;
    external_customer_id: string | null;

    current_period_start: string | null;
    current_period_end: string | null;
    trial_ends_at: string | null;
    canceled_at: string | null;

    created_at: string;
    updated_at: string;
}

// With relations
export interface SubscriptionWithProduct extends Subscription {
    products: Product;
}

export type AccessLevel = 'admin' | 'manager' | 'user' | 'viewer';

export interface MemberProductAccess {
    id: string;
    company_member_id: string;
    product_id: string;
    access_level: AccessLevel;
    granted_by: string | null;
    granted_at: string;
}

// =====================================================
// CAMADA 5: CONTATOS E SINCRONIZAÇÃO
// =====================================================

export interface Contact {
    id: string;
    company_id: string;

    name: string;
    email: string | null;
    phone: string | null;

    tags: string[];
    custom_fields: Record<string, unknown>;

    source_product: string | null;
    source_id: string | null;

    created_at: string;
    updated_at: string;
}

export type SyncDirection = 'to_hub' | 'from_hub' | 'both';

export interface SyncSettings {
    id: string;
    company_id: string;
    product_id: string;

    sync_enabled: boolean;
    sync_direction: SyncDirection;
    sync_contacts: boolean;
    sync_tags: boolean;

    filter_tags: string[];
    field_mapping: Record<string, string>;

    last_sync_at: string | null;
    last_sync_status: string | null;
    last_sync_error: string | null;

    created_at: string;
    updated_at: string;
}

export interface SyncLog {
    id: string;
    company_id: string;
    product_id: string;

    direction: 'to_hub' | 'from_hub';
    records_synced: number;
    records_created: number;
    records_updated: number;
    records_failed: number;
    error_details: Record<string, unknown> | null;

    started_at: string;
    completed_at: string | null;
}

// =====================================================
// CAMADA 6: TOKENS
// =====================================================

export interface ApiToken {
    id: string;
    company_id: string;
    product_id: string;

    token_hash: string;
    name: string | null;
    scopes: string[];

    last_used_at: string | null;
    expires_at: string | null;
    revoked_at: string | null;

    created_at: string;
}

// =====================================================
// DATABASE HELPER TYPE
// =====================================================

export interface Database {
    public: {
        Tables: {
            subscribers: {
                Row: Subscriber;
                Insert: Omit<Subscriber, 'created_at' | 'updated_at'>;
                Update: Partial<Omit<Subscriber, 'id' | 'created_at' | 'updated_at'>>;
            };
            companies: {
                Row: Company;
                Insert: CompanyInsert & { subscriber_id: string };
                Update: CompanyUpdate;
            };
            company_members: {
                Row: CompanyMember;
                Insert: Omit<CompanyMember, 'id' | 'created_at' | 'updated_at'>;
                Update: Partial<Pick<CompanyMember, 'role' | 'status'>>;
            };
            products: {
                Row: Product;
                Insert: Omit<Product, 'created_at'>;
                Update: Partial<Omit<Product, 'id' | 'created_at'>>;
            };
            subscriptions: {
                Row: Subscription;
                Insert: Omit<Subscription, 'id' | 'created_at' | 'updated_at'>;
                Update: Partial<Omit<Subscription, 'id' | 'company_id' | 'product_id' | 'created_at' | 'updated_at'>>;
            };
            member_product_access: {
                Row: MemberProductAccess;
                Insert: Omit<MemberProductAccess, 'id' | 'granted_at'>;
                Update: Partial<Pick<MemberProductAccess, 'access_level'>>;
            };
            contacts: {
                Row: Contact;
                Insert: Omit<Contact, 'id' | 'created_at' | 'updated_at'>;
                Update: Partial<Omit<Contact, 'id' | 'company_id' | 'created_at' | 'updated_at'>>;
            };
            sync_settings: {
                Row: SyncSettings;
                Insert: Omit<SyncSettings, 'id' | 'created_at' | 'updated_at'>;
                Update: Partial<Omit<SyncSettings, 'id' | 'company_id' | 'product_id' | 'created_at' | 'updated_at'>>;
            };
            sync_logs: {
                Row: SyncLog;
                Insert: Omit<SyncLog, 'id' | 'started_at'>;
                Update: Partial<Pick<SyncLog, 'completed_at' | 'records_synced' | 'records_created' | 'records_updated' | 'records_failed' | 'error_details'>>;
            };
            api_tokens: {
                Row: ApiToken;
                Insert: Omit<ApiToken, 'id' | 'created_at'>;
                Update: Partial<Pick<ApiToken, 'name' | 'scopes' | 'last_used_at' | 'expires_at' | 'revoked_at'>>;
            };
        };
    };
}
