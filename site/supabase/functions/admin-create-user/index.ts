// =====================================================
// SINCLA HUB - Edge Function: admin-create-user
// Cria auth.user via service_role (admin only)
// Usa senha padrão !Sincla1000 e envia email com credenciais
// =====================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const DEFAULT_PASSWORD = '!Sincla1000'

interface RequestBody {
    email: string
    name: string
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: 'No authorization header' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        const userClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
            global: { headers: { Authorization: authHeader } },
        })

        const { data: { user: callerUser }, error: userError } = await userClient.auth.getUser()
        if (userError || !callerUser) {
            return new Response(
                JSON.stringify({ error: 'Invalid token' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const { data: adminData } = await adminClient
            .from('admin_users')
            .select('is_active')
            .eq('id', callerUser.id)
            .eq('is_active', true)
            .single()

        if (!adminData) {
            return new Response(
                JSON.stringify({ error: 'Acesso negado: requer privilégios de administrador.' }),
                { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const { email, name }: RequestBody = await req.json()
        if (!email || !name) {
            return new Response(
                JSON.stringify({ error: 'email and name are required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 1. Check if subscriber already exists (fast, reliable, no pagination issues)
        const { data: existingSub } = await adminClient
            .from('subscribers')
            .select('id, email')
            .ilike('email', email.trim())
            .maybeSingle()

        if (existingSub) {
            await adminClient
                .from('subscribers')
                .update({ name })
                .eq('id', existingSub.id)

            return new Response(
                JSON.stringify({ user_id: existingSub.id, already_existed: true }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 2. Create new auth user (trigger handle_new_user creates subscriber automatically)
        const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
            email: email.trim(),
            password: DEFAULT_PASSWORD,
            email_confirm: true,
            user_metadata: { name, must_change_password: true },
        })

        if (createError || !newUser?.user) {
            console.error('Error creating user:', createError)

            // Edge case: user exists in auth.users but not in subscribers
            if (createError?.message?.includes('already been registered') || createError?.message?.includes('already exists')) {
                // Try to find existing auth user by email
                const { data: { users } } = await adminClient.auth.admin.listUsers()
                const existingAuthUser = users?.find(u => u.email?.toLowerCase() === email.trim().toLowerCase())

                if (existingAuthUser) {
                    // Ensure subscriber record exists (trigger may have failed before)
                    await adminClient
                        .from('subscribers')
                        .upsert({
                            id: existingAuthUser.id,
                            email: email.trim(),
                            name,
                        }, { onConflict: 'id' })

                    return new Response(
                        JSON.stringify({ user_id: existingAuthUser.id, already_existed: true }),
                        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                    )
                }
            }

            return new Response(
                JSON.stringify({ error: 'Falha ao criar usuário: ' + (createError?.message || 'Erro desconhecido') }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Guarantee subscriber record exists (in case trigger failed)
        await adminClient
            .from('subscribers')
            .upsert({
                id: newUser.user.id,
                email: email.trim(),
                name,
            }, { onConflict: 'id' })

        // 3. Send welcome email with credentials via send-notification service
        const loginUrl = 'https://app.sincla.com.br/login?welcome=1'
        const credentialsContent = `
            <p>Sua conta no <strong>Sincla Hub</strong> foi criada com sucesso!</p>
            <p>Aqui estão seus dados de acesso:</p>
            <div style="background:#f8f9fa;border-radius:8px;padding:16px 20px;margin:16px 0;border-left:4px solid #0047CC;">
                <p style="margin:0 0 8px;font-size:14px;color:#666;">
                    <strong>Email:</strong> ${email}
                </p>
                <p style="margin:0;font-size:14px;color:#666;">
                    <strong>Senha:</strong> <code style="background:#e9ecef;padding:2px 8px;border-radius:4px;font-size:15px;font-weight:600;color:#1a1a2e;">${DEFAULT_PASSWORD}</code>
                </p>
            </div>
            <div style="background:#fff3cd;border-radius:8px;padding:12px 16px;margin:16px 0;border-left:4px solid #ff8c00;">
                <p style="margin:0;font-size:13px;color:#856404;">
                    ⚠️ <strong>Importante:</strong> Esta é uma senha temporária. Por segurança, altere-a assim que acessar o painel pela primeira vez em <strong>Perfil e Senha</strong>.
                </p>
            </div>
        `

        try {
            await fetch(`${SUPABASE_URL}/functions/v1/send-notification`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                },
                body: JSON.stringify({
                    channel: 'email',
                    to: email,
                    subject: `Bem-vindo ao Sincla, ${name}! 🚀 Seus dados de acesso`,
                    message: credentialsContent,
                    template: 'custom',
                    data: {
                        action_url: loginUrl,
                        action_label: 'Acessar meu Painel',
                    },
                }),
            })
        } catch (emailErr) {
            console.error('Error sending welcome email:', emailErr)
        }

        return new Response(
            JSON.stringify({ user_id: newUser.user.id, already_existed: false }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Error in admin-create-user:', error)
        return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
