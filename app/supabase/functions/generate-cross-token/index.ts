/**
 * generate-cross-token — SSO Hub → Satélites
 * Inclui entitlements resolvidos (plano base + add-ons) para gates no EAD.
 */
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SignJWT } from 'https://deno.land/x/jose@v5.2.0/index.ts';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const JWT_SECRET = Deno.env.get('CROSS_TOKEN_SECRET') ?? 'sincla-hub-secret-key-change-in-production';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface RequestBody {
    product_id: string;
    company_id: string;
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'No authorization header' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
            global: { headers: { Authorization: authHeader } },
        });

        const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
        if (userError || !user) {
            return new Response(JSON.stringify({ error: 'Invalid token' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const { product_id, company_id }: RequestBody = await req.json();
        if (!product_id || !company_id) {
            return new Response(JSON.stringify({ error: 'product_id and company_id are required' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const { data: membership, error: memberError } = await supabaseClient
            .from('company_members')
            .select('id, role, user_type')
            .eq('user_id', user.id)
            .eq('company_id', company_id)
            .eq('status', 'active')
            .single();

        if (memberError || !membership) {
            return new Response(JSON.stringify({ error: 'User is not a member of this company' }), {
                status: 403,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const { data: subscription, error: subError } = await supabaseClient
            .from('subscriptions')
            .select('id, status, plan, plan_id')
            .eq('company_id', company_id)
            .eq('product_id', product_id)
            .in('status', ['active', 'trial'])
            .single();

        if (subError || !subscription) {
            return new Response(JSON.stringify({ error: 'Company does not have an active subscription to this product' }), {
                status: 403,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        let accessLevel = 'admin';
        if (membership.role !== 'owner') {
            const { data: access, error: accessError } = await supabaseClient
                .from('member_product_access')
                .select('access_level')
                .eq('company_member_id', membership.id)
                .eq('product_id', product_id)
                .single();

            if (accessError || !access) {
                return new Response(JSON.stringify({ error: 'User does not have access to this product' }), {
                    status: 403,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
            }
            accessLevel = access.access_level;
        }

        const { data: company, error: companyError } = await supabaseClient
            .from('companies')
            .select('*')
            .eq('id', company_id)
            .single();

        if (companyError || !company) {
            return new Response(JSON.stringify({ error: 'Company not found' }), {
                status: 404,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const { data: subscriber, error: subProfileError } = await supabaseClient
            .from('subscribers')
            .select('name, email')
            .eq('id', user.id)
            .single();

        if (subProfileError || !subscriber) {
            return new Response(JSON.stringify({ error: 'Subscriber not found' }), {
                status: 404,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // Entitlements: plano base + add-ons (RPC)
        const { data: entitlements, error: entError } = await supabaseClient.rpc(
            'get_company_product_entitlements',
            { p_company_id: company_id, p_product_id: product_id },
        );

        if (entError) {
            console.error('Entitlements RPC error:', entError);
        }

        const ent = entitlements ?? { active: false };
        const features = ent.features ?? {};

        const now = Math.floor(Date.now() / 1000);
        const payload = {
            user_id: user.id,
            email: subscriber.email,
            name: subscriber.name,
            company_id: company.id,
            company_slug: company.slug,
            company_name: company.name,
            cnpj: company.cnpj,
            role: membership.role,
            access_level: accessLevel,
            product_id,
            plan_code: ent.plan_code ?? subscription.plan ?? 'legacy',
            plan_limits: ent.raw_base_limits ?? {},
            entitlements: ent,
            account_type: ent.account_type ?? (company.cnpj ? 'pj' : 'pf'),
            max_storage_gb: ent.storage_gb_included ?? 0,
            transaction_fee_percent: ent.transaction_fee_percent ?? 5.99,
            community_enabled: features.community === true,
            gamification_enabled: features.gamification === true,
            api_enabled: features.api === true,
            user_type: membership.user_type || 'collaborator',
            branding: {
                logo_url: company.logo_url,
                favicon_url: company.favicon_url,
                primary_color: company.primary_color,
                secondary_color: company.secondary_color,
                description: company.description,
            },
            iat: now,
            exp: now + 5 * 60,
        };

        const secret = new TextEncoder().encode(JWT_SECRET);
        const token = await new SignJWT(payload)
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('5m')
            .sign(secret);

        return new Response(JSON.stringify({ token }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Error generating cross token:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
