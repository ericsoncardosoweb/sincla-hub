export type CompanyAccountMode = 'lifetime' | 'partner' | 'billing_active' | 'free_access';

export interface CompanyAccountContext {
    lifetime_access?: boolean;
    partner_id?: string | null;
}

/** Modo da conta para decidir layout de billing vs acesso. */
export function resolveCompanyAccountMode(
    company: CompanyAccountContext | null | undefined,
    activeMonthlyTotal: number,
): CompanyAccountMode {
    if (company?.lifetime_access) return 'lifetime';
    if (company?.partner_id) return 'partner';
    if (activeMonthlyTotal > 0) return 'billing_active';
    return 'free_access';
}

/** Billing self-service (faturas, compras, KPIs financeiros). */
export function shouldShowBillingUI(
    mode: CompanyAccountMode,
    platformBillingEnabled: boolean,
): boolean {
    return platformBillingEnabled && mode === 'billing_active';
}

export function isFullAccessMode(mode: CompanyAccountMode): boolean {
    return mode === 'lifetime' || mode === 'partner';
}

export function accountModeLabel(mode: CompanyAccountMode): string {
    switch (mode) {
        case 'lifetime':
            return 'Acesso vitalício';
        case 'partner':
            return 'Conta parceira';
        case 'billing_active':
            return 'Assinatura ativa';
        default:
            return 'Acesso às ferramentas';
    }
}
