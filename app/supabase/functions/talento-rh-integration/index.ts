/**
 * talento-rh-integration — Ativa/desativa ponte Talento↔RH no Hub e espelha no Supabase Talento
 */
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const TALENTO_SUPABASE_URL = Deno.env.get('TALENTO_SUPABASE_URL') ?? '';
const TALENTO_SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('TALENTO_SUPABASE_SERVICE_ROLE_KEY') ?? '';

const TALENTO_PRODUCTS = ['talento', 'recrutamento', 'vagas'];

interface SaveBody {
    company_id: string;
    is_active: boolean;
    auto_promote_rh?: boolean;
    sync_cultura_auto?: boolean;
    promote_exige_confirmacao?: boolean;
    promote_gatilho?: 'manual' | 'etapa_contratado';
}

function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
}

async function hasActiveProduct(
    hubAdmin: ReturnType<typeof createClient>,
    companyId: string,
    productIds: string[],
): Promise<boolean> {
    const { data } = await hubAdmin
        .from('subscriptions')
        .select('id')
        .eq('company_id', companyId)
        .in('product_id', productIds)
        .in('status', ['active', 'trial'])
        .limit(1);
    return (data?.length ?? 0) > 0;
}

async function fetchHubCompany(hubAdmin: ReturnType<typeof createClient>, companyId: string) {
    const { data } = await hubAdmin
        .from('companies')
        .select('id, name, slug')
        .eq('id', companyId)
        .maybeSingle();
    return data;
}

async function pushToTalento(
    hubAdmin: ReturnType<typeof createClient>,
    companyId: string,
    cfg: SaveBody,
): Promise<void> {
    if (!TALENTO_SUPABASE_URL || !TALENTO_SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error('TALENTO_SUPABASE_URL/SERVICE_ROLE não configurados no Hub');
    }

    const company = await fetchHubCompany(hubAdmin, companyId);
    if (!company) throw new Error('Empresa não encontrada no Hub');

    const talentoAdmin = createClient(TALENTO_SUPABASE_URL, TALENTO_SUPABASE_SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
    });

    await talentoAdmin.from('empresas').upsert({
        id: companyId,
        nome: company.name,
        slug: company.slug,
        rh_integrado: cfg.is_active,
        rh_tenant_id: cfg.is_active ? companyId : null,
        updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

    if (cfg.is_active) {
        await talentoAdmin.from('empresa_integracao_rh').upsert({
            empresa_id: companyId,
            auto_promote_rh: cfg.auto_promote_rh ?? true,
            sync_cultura_auto: cfg.sync_cultura_auto ?? true,
            promote_exige_confirmacao: cfg.promote_exige_confirmacao ?? true,
            promote_gatilho: cfg.promote_gatilho ?? 'manual',
            updated_at: new Date().toISOString(),
        }, { onConflict: 'empresa_id' });

        if (cfg.sync_cultura_auto) {
            const fnUrl = `${TALENTO_SUPABASE_URL}/functions/v1/vagas-rh-bridge`;
            await fetch(fnUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${TALENTO_SUPABASE_SERVICE_ROLE_KEY}`,
                },
                body: JSON.stringify({ action: 'sync_cultura', empresa_id: companyId }),
            }).catch((e) => console.warn('[talento-rh] sync_cultura:', e));
        }
    } else {
        await talentoAdmin
            .from('empresas')
            .update({ rh_integrado: false, updated_at: new Date().toISOString() })
            .eq('id', companyId);
    }
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return json({ error: 'No authorization header' }, 401);
        }

        const hubUserClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
            global: { headers: { Authorization: authHeader } },
        });
        const hubAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        const { data: { user }, error: userError } = await hubUserClient.auth.getUser();
        if (userError || !user) {
            return json({ error: 'Invalid token' }, 401);
        }

        if (req.method === 'GET') {
            const url = new URL(req.url);
            const companyId = url.searchParams.get('company_id');
            if (!companyId) return json({ error: 'company_id required' }, 400);

            const [talentoSub, rhSub, configRes] = await Promise.all([
                hasActiveProduct(hubAdmin, companyId, TALENTO_PRODUCTS),
                hasActiveProduct(hubAdmin, companyId, ['rh']),
                hubAdmin
                    .from('company_talento_rh_integration')
                    .select('*')
                    .eq('company_id', companyId)
                    .maybeSingle(),
            ]);

            return json({
                eligible: talentoSub && rhSub,
                has_talento: talentoSub,
                has_rh: rhSub,
                talento_available: !!(TALENTO_SUPABASE_URL && TALENTO_SUPABASE_SERVICE_ROLE_KEY),
                config: configRes.data ?? {
                    is_active: false,
                    auto_promote_rh: true,
                    sync_cultura_auto: true,
                    promote_exige_confirmacao: true,
                    promote_gatilho: 'manual',
                },
            });
        }

        const body: SaveBody = await req.json();
        if (!body.company_id) {
            return json({ error: 'company_id required' }, 400);
        }

        const { data: membership } = await hubAdmin
            .from('company_members')
            .select('role')
            .eq('user_id', user.id)
            .eq('company_id', body.company_id)
            .eq('status', 'active')
            .maybeSingle();

        if (!membership || !['owner', 'admin'].includes(membership.role)) {
            return json({ error: 'Permissão negada' }, 403);
        }

        const [talentoSub, rhSub] = await Promise.all([
            hasActiveProduct(hubAdmin, body.company_id, TALENTO_PRODUCTS),
            hasActiveProduct(hubAdmin, body.company_id, ['rh']),
        ]);

        if (body.is_active && (!talentoSub || !rhSub)) {
            return json({
                error: 'Assinaturas Sincla Talento e Sincla RH ativas são necessárias',
            }, 403);
        }

        const row = {
            company_id: body.company_id,
            is_active: body.is_active,
            auto_promote_rh: body.auto_promote_rh ?? true,
            sync_cultura_auto: body.sync_cultura_auto ?? true,
            promote_exige_confirmacao: body.promote_exige_confirmacao ?? true,
            promote_gatilho: body.promote_gatilho ?? 'manual',
            synced_to_talento_at: new Date().toISOString(),
        };

        const { error: upsertErr } = await hubAdmin
            .from('company_talento_rh_integration')
            .upsert(row, { onConflict: 'company_id' });

        if (upsertErr) throw upsertErr;

        await pushToTalento(hubAdmin, body.company_id, body);

        return json({ success: true, config: row });
    } catch (err: unknown) {
        console.error('[talento-rh-integration]', err);
        const message = err instanceof Error ? err.message : 'Erro interno';
        return json({ error: message }, 500);
    }
});
