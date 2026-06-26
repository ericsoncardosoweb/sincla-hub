/** PF = CPF (11 dígitos) ou sem documento; PJ = CNPJ (14 dígitos). */
export type CompanyAccountType = 'pf' | 'pj';

export function resolveCompanyAccountType(company: { cnpj?: string | null } | null | undefined): CompanyAccountType {
    const doc = (company?.cnpj || '').replace(/\D/g, '');
    if (doc.length === 14) return 'pj';
    return 'pf';
}

export function companyAccountTypeLabel(type: CompanyAccountType): string {
    return type === 'pj' ? 'Pessoa jurídica (CNPJ)' : 'Pessoa física (CPF)';
}

export function planMatchesAccountType(
    planAccountType: string | null | undefined,
    companyType: CompanyAccountType,
): boolean {
    if (!planAccountType || planAccountType === 'any') return true;
    return planAccountType === companyType;
}

export function filterPlansForAccountType<T extends { account_type?: string | null }>(
    plans: T[],
    companyType: CompanyAccountType,
): T[] {
    return plans.filter(p => planMatchesAccountType(p.account_type, companyType));
}
