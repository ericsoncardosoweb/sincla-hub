/**
 * Links úteis por empresa (Hub)
 * Persistidos em companies.settings.useful_links
 */

import { supabase } from '../lib/supabase';

export interface UsefulLink {
    id: string;
    title: string;
    url: string;
    sort_order: number;
}

function normalizeUrl(raw: string): string {
    const t = raw.trim();
    if (!t) return '';
    if (/^https?:\/\//i.test(t)) return t;
    return `https://${t}`;
}

function isValidHttpUrl(url: string): boolean {
    try {
        const u = new URL(url);
        return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
        return false;
    }
}

export function sanitizeUsefulLinks(links: UsefulLink[]): UsefulLink[] {
    return (links || [])
        .map((l, idx) => ({
            id: l.id || crypto.randomUUID(),
            title: String(l.title || '').trim(),
            url: normalizeUrl(String(l.url || '')),
            sort_order: typeof l.sort_order === 'number' ? l.sort_order : idx,
        }))
        .filter((l) => l.title && l.url && isValidHttpUrl(l.url))
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((l, idx) => ({ ...l, sort_order: idx }));
}

export async function getCompanyUsefulLinks(companyId: string): Promise<UsefulLink[]> {
    const { data, error } = await supabase
        .from('companies')
        .select('settings')
        .eq('id', companyId)
        .maybeSingle();
    if (error) throw error;
    const settings = (data as { settings?: Record<string, unknown> } | null)?.settings || {};
    const raw = (settings as { useful_links?: UsefulLink[] }).useful_links;
    return sanitizeUsefulLinks(Array.isArray(raw) ? raw : []);
}

export async function saveCompanyUsefulLinks(
    companyId: string,
    links: UsefulLink[],
): Promise<{ success: boolean; links?: UsefulLink[]; error?: string }> {
    try {
        const cleaned = sanitizeUsefulLinks(links);

        const { data: current, error: readErr } = await supabase
            .from('companies')
            .select('settings')
            .eq('id', companyId)
            .single();
        if (readErr) throw readErr;

        const prev = ((current as { settings?: Record<string, unknown> })?.settings || {}) as Record<string, unknown>;
        const nextSettings = { ...prev, useful_links: cleaned };

        const { error: updErr } = await supabase
            .from('companies')
            .update({ settings: nextSettings })
            .eq('id', companyId);
        if (updErr) throw updErr;

        return { success: true, links: cleaned };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return { success: false, error: message };
    }
}
