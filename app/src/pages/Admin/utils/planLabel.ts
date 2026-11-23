export interface PlanRef {
    id: string;
    product_id: string;
    slug: string;
    name: string;
}

export type PlanLabelKind = 'plan' | 'courtesy' | 'legacy';

/** Cortesias ("Conceder acesso ilimitado") gravam estes apelidos sem plano cadastrado. */
const COURTESY_PLAN_CODES = ['enterprise', 'lifetime'];

/** Nome do plano cadastrado (por plan_id, depois pelo slug legado do produto). */
export function resolvePlanLabel(
    sub: { plan: string | null; plan_id?: string | null; product_id: string },
    plans: PlanRef[],
): { label: string; kind: PlanLabelKind } {
    const byId = sub.plan_id ? plans.find(p => p.id === sub.plan_id) : undefined;
    if (byId) return { label: byId.name, kind: 'plan' };
    const bySlug = plans.find(p => p.product_id === sub.product_id && p.slug === sub.plan);
    if (bySlug) return { label: bySlug.name, kind: 'plan' };
    if (sub.plan && COURTESY_PLAN_CODES.includes(sub.plan)) return { label: 'Cortesia ilimitada', kind: 'courtesy' };
    const code = sub.plan || 'sem plano';
    return { label: code.charAt(0).toUpperCase() + code.slice(1), kind: 'legacy' };
}
