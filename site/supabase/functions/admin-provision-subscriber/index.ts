// =====================================================
// SINCLA HUB - Edge Function: admin-provision-subscriber
// Provisão completa: auth user + subscriber + company + subscriptions + email
// Tudo via service_role (bypass RLS e PostgREST)
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

interface ToolAssignment {
    productId: string
    planSlug: string
    durationDays: number
}

interface RequestBody {
    email: string
    name: string
    companyName: string
    tools: ToolAssignment[]
}

// ── Helper: gera slug único ──
async function generateUniqueSlug(adminClient: any, baseName: string): Promise<string> {
    let slug = baseName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')

    let counter = 0
    while (true) {
        const candidate = counter === 0 ? slug : `${slug}-${counter}`
        const { data } = await adminClient
            .from('companies')
            .select('id')
            .eq('slug', candidate)
            .maybeSingle()

        if (!data) return candidate
        counter++
    }
}

// ── Helper: envia email de boas-vindas ──
async function sendWelcomeEmail(email: string, name: string) {
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
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // ── Auth check: caller must be admin ──
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

        // ── Parse body ──
        const { email, name, companyName, tools }: RequestBody = await req.json()
        if (!email || !name || !companyName) {
            return new Response(
                JSON.stringify({ error: 'email, name e companyName são obrigatórios' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        let userId: string
        let alreadyExisted = false

        // ── Step 1: Ensure auth user exists ──
        const { data: existingSub } = await adminClient
            .from('subscribers')
            .select('id')
            .ilike('email', email.trim())
            .maybeSingle()

        if (existingSub) {
            userId = existingSub.id
            alreadyExisted = true
            // Update name
            await adminClient.from('subscribers').update({ name }).eq('id', userId)
        } else {
            // Try to create auth user
            const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
                email: email.trim(),
                password: DEFAULT_PASSWORD,
                email_confirm: true,
                user_metadata: { name, must_change_password: true },
            })

            if (createError || !newUser?.user) {
                // User might exist in auth but not in subscribers
                // Captura todas as variantes de erro: "already been registered", "already exists",
                // e "Database error creating new user" (trigger handle_new_user falha no INSERT duplicado)
                const isUserExistsError = createError?.message && (
                    createError.message.includes('already been registered') ||
                    createError.message.includes('already exists') ||
                    createError.message.includes('Database error creating new user') ||
                    createError.message.includes('duplicate key')
                )

                if (isUserExistsError) {
                    console.log(`[admin-provision-subscriber] User exists, looking up: ${email}`)
                    const { data: { users } } = await adminClient.auth.admin.listUsers()
                    const found = users?.find(u => u.email?.toLowerCase() === email.trim().toLowerCase())
                    if (found) {
                        userId = found.id
                        alreadyExisted = true
                        // Garantir que o subscriber record existe (pode ter falhado no trigger)
                        await adminClient.from('subscribers').upsert({
                            id: found.id,
                            email: email.trim(),
                            name,
                        }, { onConflict: 'id' })
                    } else {
                        return new Response(
                            JSON.stringify({ error: 'Usuário existe no auth mas não foi encontrado: ' + createError?.message }),
                            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                        )
                    }
                } else {
                    return new Response(
                        JSON.stringify({ error: 'Falha ao criar usuário: ' + (createError?.message || 'Erro desconhecido') }),
                        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                    )
                }
            } else {
                userId = newUser.user.id
            }

            // Ensure subscriber record exists
            await adminClient.from('subscribers').upsert({
                id: userId!,
                email: email.trim(),
                name,
            }, { onConflict: 'id' })
        }

        // ── Step 2: Get or create company (prevent duplicates) ──
        let companyId: string

        // Check if subscriber already has a company
        const { data: existingCompany } = await adminClient
            .from('companies')
            .select('id')
            .eq('subscriber_id', userId!)
            .eq('status', 'active')
            .limit(1)
            .maybeSingle()

        if (existingCompany) {
            // Reuse existing company
            companyId = existingCompany.id
        } else {
            // Create new company
            const slug = await generateUniqueSlug(adminClient, companyName)

            const { data: company, error: companyError } = await adminClient
                .from('companies')
                .insert({
                    subscriber_id: userId!,
                    name: companyName.trim(),
                    slug,
                })
                .select('id')
                .single()

            if (companyError || !company) {
                return new Response(
                    JSON.stringify({ error: 'Falha ao criar empresa: ' + (companyError?.message || 'Sem retorno') }),
                    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            }

            companyId = company.id

            // Create company member (owner) - trigger should handle this, but ensure
            await adminClient.from('company_members').upsert({
                company_id: companyId,
                user_id: userId!,
                role: 'owner',
                status: 'active',
                joined_at: new Date().toISOString(),
            }, { onConflict: 'company_id,user_id' })
        }

        // ── Step 3: Create subscriptions (direct INSERT, no RPC) ──
        const subscriptionErrors: string[] = []
        for (const tool of (tools || [])) {
            const periodEnd = (tool.durationDays || 0) <= 0
                ? new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString()  // ~100 years
                : new Date(Date.now() + tool.durationDays * 24 * 60 * 60 * 1000).toISOString()

            const { error: subError } = await adminClient
                .from('subscriptions')
                .upsert({
                    company_id: companyId,
                    product_id: tool.productId,
                    plan: tool.planSlug || 'enterprise',
                    status: 'active',
                    seats_limit: 9999,
                    billing_cycle: 'yearly',
                    current_period_start: new Date().toISOString(),
                    current_period_end: periodEnd,
                }, { onConflict: 'company_id,product_id' })

            if (subError) {
                console.error(`Error creating subscription for ${tool.productId}:`, subError)
                subscriptionErrors.push(`${tool.productId}: ${subError.message}`)
            }
        }

        // ── Step 4: Send welcome email ──
        await sendWelcomeEmail(email.trim(), name)

        return new Response(
            JSON.stringify({
                user_id: userId!,
                company_id: companyId,
                already_existed: alreadyExisted,
                subscription_errors: subscriptionErrors.length > 0 ? subscriptionErrors : null,
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Error in admin-provision-subscriber:', error)
        return new Response(
            JSON.stringify({ error: (error as Error).message || 'Internal server error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
