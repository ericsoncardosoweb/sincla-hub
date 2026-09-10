/**
 * get-company-useful-links
 * Retorna links úteis da empresa (companies.settings.useful_links)
 * para sidebars das ferramentas satélite.
 *
 * GET/POST ?company_id=...  ou  { company_id }
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function normalizeUrl(raw: string): string {
    const t = String(raw || '').trim()
    if (!t) return ''
    if (/^https?:\/\//i.test(t)) return t
    return `https://${t}`
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const url = new URL(req.url)
        let companyId = url.searchParams.get('company_id')
        if (!companyId && req.method === 'POST') {
            const body = await req.json().catch(() => ({}))
            companyId = body.company_id || null
        }
        if (!companyId) {
            return new Response(JSON.stringify({ error: 'company_id é obrigatório' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
        )

        const { data: company, error } = await supabase
            .from('companies')
            .select('id, settings')
            .eq('id', companyId)
            .maybeSingle()

        if (error || !company) {
            return new Response(JSON.stringify({ error: 'Empresa não encontrada' }), {
                status: 404,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        const settings = (company.settings || {}) as Record<string, unknown>
        const raw = Array.isArray(settings.useful_links) ? settings.useful_links as Array<Record<string, unknown>> : []
        const links = raw
            .map((l, idx) => ({
                id: String(l.id || idx),
                title: String(l.title || '').trim(),
                url: normalizeUrl(String(l.url || '')),
                sort_order: typeof l.sort_order === 'number' ? l.sort_order : idx,
            }))
            .filter((l) => l.title && l.url)
            .sort((a, b) => a.sort_order - b.sort_order)

        return new Response(JSON.stringify({ company_id: company.id, links }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    } catch (err: any) {
        return new Response(JSON.stringify({ error: err?.message || 'Erro interno' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
