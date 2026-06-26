// =====================================================
// SINCLA HUB - Edge Function: admin-set-password
// Gestão de senha pelo admin de plataforma:
//   action = 'set'        -> define uma nova senha para o usuário
//   action = 'send_link'  -> envia email com link de redefinição de senha
// Tudo via service_role (auth.admin) com checagem de admin_users.
// =====================================================

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const DEFAULT_REDIRECT = 'https://app.sincla.com.br/auth/callback?type=recovery';

interface RequestBody {
    action: 'set' | 'send_link';
    user_id?: string;
    email?: string;
    new_password?: string;
    redirect_to?: string;
}

function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
}

async function sendResetEmail(email: string, link: string, companyId?: string) {
    const content = `
        <p>Recebemos uma solicitação para redefinir a senha da sua conta no <strong>Sincla Hub</strong>.</p>
        <p>Clique no botão abaixo para cadastrar uma nova senha. O link é válido por tempo limitado.</p>
        <div style="background:#fff3cd;border-radius:8px;padding:12px 16px;margin:16px 0;border-left:4px solid #ff8c00;">
            <p style="margin:0;font-size:13px;color:#856404;">
                Se você não solicitou esta alteração, ignore este email — sua senha atual continua válida.
            </p>
        </div>
    `;

    await fetch(`${SUPABASE_URL}/functions/v1/send-notification`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
            channel: 'email',
            to: email,
            subject: 'Redefinição de senha — Sincla Hub',
            message: content,
            template: 'security',
            source_tool: 'hub',
            company_id: companyId || undefined,
            data: {
                action_url: link,
                action_label: 'Cadastrar nova senha',
            },
        }),
    });
}

async function resolvePrimaryCompanyId(adminClient: ReturnType<typeof createClient>, userId: string): Promise<string | undefined> {
    const { data } = await adminClient
        .from('company_members')
        .select('company_id')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('joined_at', { ascending: true })
        .limit(1)
        .maybeSingle();
    return data?.company_id ?? undefined;
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

        const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const userClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
            global: { headers: { Authorization: authHeader } },
        });

        const { data: { user: caller }, error: callerError } = await userClient.auth.getUser();
        if (callerError || !caller) {
            return json({ error: 'Invalid token' }, 401);
        }

        // Apenas admin de plataforma
        const { data: adminData } = await adminClient
            .from('admin_users')
            .select('is_active')
            .eq('id', caller.id)
            .eq('is_active', true)
            .single();

        if (!adminData) {
            return json({ error: 'Acesso negado: requer privilégios de administrador.' }, 403);
        }

        const body: RequestBody = await req.json();
        const action = body.action;

        // Resolve user_id / email
        let userId = body.user_id ?? null;
        let email = body.email?.trim() ?? null;

        if (!userId && email) {
            const { data: sub } = await adminClient
                .from('subscribers')
                .select('id, email')
                .ilike('email', email)
                .maybeSingle();
            if (sub) {
                userId = sub.id;
                email = sub.email;
            }
        } else if (userId && !email) {
            const { data: sub } = await adminClient
                .from('subscribers')
                .select('email')
                .eq('id', userId)
                .maybeSingle();
            email = sub?.email ?? null;
        }

        // ── Definir nova senha diretamente ──
        if (action === 'set') {
            if (!userId) return json({ error: 'user_id (ou email) é obrigatório' }, 400);
            if (!body.new_password || body.new_password.length < 6) {
                return json({ error: 'A senha deve ter no mínimo 6 caracteres' }, 400);
            }

            const { error: updErr } = await adminClient.auth.admin.updateUserById(userId, {
                password: body.new_password,
            });
            if (updErr) return json({ error: 'Falha ao definir senha: ' + updErr.message }, 500);

            return json({ success: true, user_id: userId });
        }

        // ── Enviar link de redefinição por email ──
        if (action === 'send_link') {
            if (!email) return json({ error: 'email (ou user_id válido) é obrigatório' }, 400);

            const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
                type: 'recovery',
                email,
                options: { redirectTo: body.redirect_to || DEFAULT_REDIRECT },
            });
            if (linkErr || !linkData?.properties?.action_link) {
                return json({ error: 'Falha ao gerar link: ' + (linkErr?.message || 'sem link') }, 500);
            }

            await sendResetEmail(email, linkData.properties.action_link, userId ? await resolvePrimaryCompanyId(adminClient, userId) : undefined);
            return json({ success: true, email });
        }

        return json({ error: "action inválida (use 'set' ou 'send_link')" }, 400);
    } catch (error) {
        console.error('[admin-set-password]', error);
        return json({ error: (error as Error).message || 'Internal server error' }, 500);
    }
});
