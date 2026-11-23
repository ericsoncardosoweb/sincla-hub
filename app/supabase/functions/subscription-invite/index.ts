// =====================================================
// SINCLA HUB - Edge Function: subscription-invite
// Assinatura manual criada pelo Admin Master + aceite pelo convidado.
//
// Ações de admin (Authorization de admin_users ativo):
//   create  -> cria conta "virgem" (auth user + subscriber + company) e o convite
//   resend  -> reenvia o e-mail do convite (renova a validade)
//   cancel  -> cancela um convite pendente
// Ações públicas (pelo token do convite):
//   get           -> dados do convite para a página /convite/:token
//   set_password  -> cria a senha da conta criada pelo convite (antes do aceite)
//   accept        -> confirma planos/valores, gera a cobrança no Asaas e ativa
//                    as assinaturas (com senha nova ou já logado na conta)
//
// Deploy com verify_jwt = false (ações públicas usam o token do convite).
// =====================================================

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const APP_URL = (Deno.env.get('HUB_APP_URL') || 'https://app.sincla.com.br').replace(/\/$/, '');
const ASAAS_PROD_URL = 'https://api.asaas.com/v3';
const ASAAS_SANDBOX_URL = 'https://sandbox.asaas.com/api/v3';
const INVITE_VALIDITY_DAYS = 30;
const MIN_PASSWORD_LENGTH = 8;

type Admin = SupabaseClient;

interface InviteItemInput {
    product_id: string;
    plan_id: string;
    ai_tokens?: number | null;
    price?: number | null;
}

interface InviteItem {
    product_id: string;
    product_name: string;
    plan_id: string;
    plan_name: string;
    plan_slug: string;
    ai_tokens: number | null;
    list_price: number;
    price: number;
    seats_limit: number;
}

interface CreateBody {
    action: 'create';
    contact_name: string;
    company_name: string;
    email: string;
    phone?: string;
    cpf_cnpj: string;
    billing_cycle: 'monthly' | 'yearly';
    due_date: string;
    storage_gb?: number | null;
    items: InviteItemInput[];
    send_email?: boolean;
}

function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
}

class HttpError extends Error {
    constructor(public status: number, message: string) {
        super(message);
    }
}

const onlyDigits = (v: string | null | undefined) => (v || '').replace(/\D/g, '');

const round2 = (n: number) => Math.round(n * 100) / 100;

const escapeHtml = (s: string) => s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const formatBRL = (n: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);

const formatDateBR = (iso: string) => {
    const [y, m, d] = iso.slice(0, 10).split('-');
    return `${d}/${m}/${y}`;
};

const todayISO = () => new Date().toISOString().slice(0, 10);

function addCycle(isoDate: string, cycle: 'monthly' | 'yearly'): string {
    const d = new Date(`${isoDate}T12:00:00Z`);
    if (cycle === 'yearly') d.setUTCFullYear(d.getUTCFullYear() + 1);
    else d.setUTCMonth(d.getUTCMonth() + 1);
    return d.toISOString();
}

function validCpf(cpf: string): boolean {
    if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
    const calc = (len: number) => {
        let sum = 0;
        for (let i = 0; i < len; i++) sum += Number(cpf[i]) * (len + 1 - i);
        const r = (sum * 10) % 11;
        return r === 10 ? 0 : r;
    };
    return calc(9) === Number(cpf[9]) && calc(10) === Number(cpf[10]);
}

function validCnpj(cnpj: string): boolean {
    if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false;
    const calc = (weights: number[]) => {
        const sum = weights.reduce((acc, w, i) => acc + Number(cnpj[i]) * w, 0);
        const r = sum % 11;
        return r < 2 ? 0 : 11 - r;
    };
    const d1 = calc([5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    const d2 = calc([6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    return d1 === Number(cnpj[12]) && d2 === Number(cnpj[13]);
}

function newToken(): string {
    return (crypto.randomUUID() + crypto.randomUUID()).replace(/-/g, '');
}

function inviteUrl(token: string) {
    return `${APP_URL}/convite/${token}`;
}

function isExpired(invite: { expires_at: string }) {
    return new Date(invite.expires_at).getTime() < Date.now();
}

// ── Auth helpers ──

async function getCaller(req: Request) {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return null;
    const userClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    return user ?? null;
}

async function requireAdmin(admin: Admin, req: Request) {
    const caller = await getCaller(req);
    if (!caller) throw new HttpError(401, 'Não autenticado');
    const { data } = await admin
        .from('admin_users')
        .select('is_active')
        .eq('id', caller.id)
        .eq('is_active', true)
        .maybeSingle();
    if (!data) throw new HttpError(403, 'Acesso negado: requer privilégios de administrador.');
    return caller;
}

// ── Asaas ──

function asaasConfig(req: Request) {
    const origin = req.headers.get('origin') || '';
    const sandbox = origin.includes('localhost') || origin.includes('127.0.0.1');
    const apiKey = sandbox ? Deno.env.get('ASAAS_SANDBOX_API_KEY') : Deno.env.get('ASAAS_PROD_API_KEY');
    if (!apiKey) throw new HttpError(500, 'Gateway de pagamento não configurado');
    return { baseUrl: sandbox ? ASAAS_SANDBOX_URL : ASAAS_PROD_URL, apiKey };
}

async function asaas(cfg: { baseUrl: string; apiKey: string }, method: string, endpoint: string, body?: unknown) {
    const res = await fetch(`${cfg.baseUrl}${endpoint}`, {
        method,
        headers: {
            'Content-Type': 'application/json',
            'access_token': cfg.apiKey,
            'User-Agent': 'SinclaHub/1.0',
        },
        body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let data: any;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }
    if (!res.ok) {
        const msg = data?.errors?.[0]?.description || `Erro na API do Asaas (${res.status})`;
        throw new HttpError(502, msg);
    }
    return data;
}

// ── E-mail ──

async function sendEmail(to: string, subject: string, message: string, actionUrl: string, actionLabel: string) {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-notification`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
            channel: 'email',
            to,
            subject,
            message,
            template: 'custom',
            source_tool: 'hub',
            data: { action_url: actionUrl, action_label: actionLabel },
        }),
    });
    if (!res.ok) throw new Error(`Falha ao enviar e-mail (${res.status})`);
}

function itemsTableHtml(items: InviteItem[], cycle: 'monthly' | 'yearly', total: number) {
    const cycleLabel = cycle === 'yearly' ? '/ano' : '/mês';
    const rows = items.map(i => `
        <tr>
            <td style="padding:8px 0;border-bottom:1px solid #eee;">
                <strong>${escapeHtml(i.product_name)}</strong> — ${escapeHtml(i.plan_name)}
                ${i.ai_tokens != null ? `<br><span style="font-size:12px;color:#666;">${i.ai_tokens.toLocaleString('pt-BR')} tokens de IA por mês</span>` : ''}
            </td>
            <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;white-space:nowrap;">${formatBRL(i.price)}${cycleLabel}</td>
        </tr>`).join('');
    return `
        <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;color:#333;">
            ${rows}
            <tr>
                <td style="padding:10px 0;"><strong>Total</strong></td>
                <td style="padding:10px 0;text-align:right;white-space:nowrap;"><strong>${formatBRL(total)}${cycleLabel}</strong></td>
            </tr>
        </table>`;
}

async function sendInviteEmail(invite: any) {
    const items = invite.items as InviteItem[];
    const content = `
        <p>Olá, <strong>${escapeHtml(invite.contact_name)}</strong>!</p>
        <p>Preparamos a assinatura do <strong>Sincla</strong> para <strong>${escapeHtml(invite.company_name)}</strong>. Confira os planos e valores:</p>
        ${itemsTableHtml(items, invite.billing_cycle, Number(invite.total_amount))}
        ${invite.storage_gb != null ? `<p style="font-size:14px;color:#333;">Armazenamento inicial da conta: <strong>${Number(invite.storage_gb).toLocaleString('pt-BR')} GB</strong></p>` : ''}
        <p style="font-size:14px;color:#333;">Primeiro vencimento: <strong>${formatDateBR(invite.due_date)}</strong></p>
        <p>Clique no botão abaixo para revisar, criar sua senha e confirmar a assinatura. A cobrança só é gerada depois da sua confirmação.</p>
        <p style="font-size:12px;color:#888;">Este convite é válido até ${formatDateBR(invite.expires_at)}.</p>
    `;
    await sendEmail(
        invite.email,
        `Sua assinatura Sincla está pronta, ${invite.contact_name}`,
        content,
        inviteUrl(invite.token),
        'Revisar e aceitar',
    );
}

async function sendAcceptedEmail(invite: any, invoiceUrl: string | null) {
    const items = invite.items as InviteItem[];
    const total = Number(invite.total_amount);
    const content = `
        <p>Olá, <strong>${escapeHtml(invite.contact_name)}</strong>!</p>
        <p>Sua assinatura do <strong>Sincla</strong> para <strong>${escapeHtml(invite.company_name)}</strong> foi confirmada e o acesso já está liberado.</p>
        ${itemsTableHtml(items, invite.billing_cycle, total)}
        ${total > 0 ? `
            <p style="font-size:14px;color:#333;">A primeira cobrança vence em <strong>${formatDateBR(invite.due_date)}</strong>. Você pode pagar por boleto, Pix ou cartão.</p>
            ${invoiceUrl ? `<p><a href="${invoiceUrl}" style="color:#0047CC;font-weight:600;">Abrir a fatura para pagamento</a></p>` : ''}
        ` : ''}
    `;
    await sendEmail(
        invite.email,
        'Assinatura confirmada — Sincla',
        content,
        `${APP_URL}/painel`,
        'Acessar meu painel',
    );
}

// ── Conta virgem ──

async function findAuthUserByEmail(admin: Admin, email: string) {
    const target = email.toLowerCase();
    for (let page = 1; page <= 20; page++) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
        if (error) throw error;
        const found = data.users.find(u => u.email?.toLowerCase() === target);
        if (found) return found;
        if (data.users.length < 1000) return null;
    }
    return null;
}

async function generateUniqueSlug(admin: Admin, baseName: string): Promise<string> {
    const base = baseName
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'empresa';
    for (let counter = 0; counter < 200; counter++) {
        const candidate = counter === 0 ? base : `${base}-${counter}`;
        const { data } = await admin.from('companies').select('id').eq('slug', candidate).maybeSingle();
        if (!data) return candidate;
    }
    return `${base}-${crypto.randomUUID().slice(0, 6)}`;
}

async function ensureAccount(admin: Admin, input: CreateBody) {
    const email = input.email.trim().toLowerCase();
    const doc = onlyDigits(input.cpf_cnpj);
    const phone = onlyDigits(input.phone) || null;

    let subscriberId: string;
    let accountCreated = false;

    const { data: existingSub } = await admin
        .from('subscribers')
        .select('id')
        .ilike('email', email)
        .maybeSingle();

    if (existingSub) {
        subscriberId = existingSub.id;
    } else {
        const { data: created, error } = await admin.auth.admin.createUser({
            email,
            password: `${crypto.randomUUID()}Aa1!`,
            email_confirm: true,
            user_metadata: { name: input.contact_name.trim(), invited_via: 'subscription_invite' },
        });
        if (created?.user) {
            subscriberId = created.user.id;
            accountCreated = true;
        } else {
            const msg = error?.message || '';
            if (!/already|registered|exists/i.test(msg)) {
                throw new HttpError(500, `Falha ao criar a conta: ${msg || 'erro desconhecido'}`);
            }
            const found = await findAuthUserByEmail(admin, email);
            if (!found) throw new HttpError(500, 'E-mail já registrado, mas o usuário não foi localizado.');
            subscriberId = found.id;
        }
        const { error: subErr } = await admin.from('subscribers').upsert({
            id: subscriberId,
            email,
            name: input.contact_name.trim(),
            phone,
            cpf_cnpj: doc,
        }, { onConflict: 'id' });
        if (subErr) throw new HttpError(500, `Falha ao registrar o assinante: ${subErr.message}`);
    }

    // Empresa: reaproveita a do mesmo assinante com o mesmo documento; senão cria
    const { data: companies } = await admin
        .from('companies')
        .select('id, cnpj')
        .eq('subscriber_id', subscriberId);
    const sameDoc = (companies || []).find(c => onlyDigits(c.cnpj) === doc);

    let companyId: string;
    if (sameDoc) {
        companyId = sameDoc.id;
    } else {
        const slug = await generateUniqueSlug(admin, input.company_name);
        const { data: company, error: compErr } = await admin
            .from('companies')
            .insert({ subscriber_id: subscriberId, name: input.company_name.trim(), slug, cnpj: doc })
            .select('id')
            .single();
        if (compErr || !company) throw new HttpError(500, `Falha ao criar a empresa: ${compErr?.message || 'sem retorno'}`);
        companyId = company.id;
        await admin.from('company_members').upsert({
            company_id: companyId,
            user_id: subscriberId,
            role: 'owner',
            status: 'active',
            joined_at: new Date().toISOString(),
        }, { onConflict: 'company_id,user_id' });
    }

    return { subscriberId, companyId, accountCreated };
}

async function needsPassword(admin: Admin, invite: any): Promise<boolean> {
    if (!invite.account_created || !invite.subscriber_id) return false;
    const { data } = await admin.auth.admin.getUserById(invite.subscriber_id);
    return !!data?.user && !data.user.last_sign_in_at;
}

async function loadInviteByToken(admin: Admin, token: unknown) {
    if (typeof token !== 'string' || token.length < 32) throw new HttpError(400, 'Convite inválido');
    const { data: invite } = await admin
        .from('subscription_invites')
        .select('*')
        .eq('token', token)
        .maybeSingle();
    if (!invite) throw new HttpError(404, 'Convite não encontrado');
    return invite;
}

const PROCESSING_STALE_MS = 5 * 60 * 1000;

const processingIsStale = (invite: any) =>
    invite.status === 'processing' && Date.now() - new Date(invite.updated_at).getTime() > PROCESSING_STALE_MS;

function assertPending(invite: any) {
    if (invite.status === 'accepted') throw new HttpError(409, 'Este convite já foi aceito.');
    if (invite.status === 'canceled') throw new HttpError(410, 'Este convite foi cancelado.');
    if (invite.status === 'processing' && !processingIsStale(invite)) {
        throw new HttpError(409, 'Este convite está sendo processado. Aguarde alguns segundos.');
    }
    if (isExpired(invite)) throw new HttpError(410, 'Este convite expirou. Peça um novo envio.');
}

// ── Ações ──

async function handleCreate(admin: Admin, req: Request, body: CreateBody) {
    const caller = await requireAdmin(admin, req);

    const email = (body.email || '').trim().toLowerCase();
    const doc = onlyDigits(body.cpf_cnpj);
    if (!body.contact_name?.trim()) throw new HttpError(400, 'Informe o nome da pessoa.');
    if (!body.company_name?.trim()) throw new HttpError(400, 'Informe o nome da empresa.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'E-mail inválido.');
    if (!(doc.length === 14 ? validCnpj(doc) : doc.length === 11 ? validCpf(doc) : false)) {
        throw new HttpError(400, 'CNPJ (ou CPF) inválido.');
    }
    if (!['monthly', 'yearly'].includes(body.billing_cycle)) throw new HttpError(400, 'Ciclo de cobrança inválido.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.due_date || '') || body.due_date < todayISO()) {
        throw new HttpError(400, 'Informe um vencimento a partir de hoje.');
    }
    if (body.storage_gb != null && (!Number.isFinite(body.storage_gb) || body.storage_gb < 0)) {
        throw new HttpError(400, 'Armazenamento inválido.');
    }
    if (!Array.isArray(body.items) || body.items.length === 0) throw new HttpError(400, 'Selecione ao menos um produto e plano.');
    const productIds = body.items.map(i => i.product_id);
    if (new Set(productIds).size !== productIds.length) throw new HttpError(400, 'Cada produto só pode aparecer uma vez.');

    const { data: plans, error: plansErr } = await admin
        .from('product_plans')
        .select('id, product_id, name, slug, price_monthly, price_yearly, limits, products:products!product_id (name)')
        .in('id', body.items.map(i => i.plan_id));
    if (plansErr) throw new HttpError(500, plansErr.message);

    const items: InviteItem[] = body.items.map(input => {
        const plan = (plans || []).find(p => p.id === input.plan_id);
        if (!plan || plan.product_id !== input.product_id) throw new HttpError(400, 'Plano inválido para o produto selecionado.');
        const product = Array.isArray(plan.products) ? plan.products[0] : plan.products;
        const listPrice = body.billing_cycle === 'yearly'
            ? Number(plan.price_yearly) || Number(plan.price_monthly) * 12
            : Number(plan.price_monthly) || 0;
        const price = input.price == null ? listPrice : Number(input.price);
        if (!Number.isFinite(price) || price < 0) throw new HttpError(400, `Valor inválido para ${plan.name}.`);
        const tokens = input.ai_tokens == null ? null : Math.round(Number(input.ai_tokens));
        if (tokens != null && (!Number.isFinite(tokens) || tokens < 0)) throw new HttpError(400, `Tokens inválidos para ${plan.name}.`);
        const limits = (plan.limits || {}) as Record<string, unknown>;
        const seats = Number(limits.seats ?? limits.users);
        return {
            product_id: plan.product_id,
            product_name: product?.name || plan.product_id,
            plan_id: plan.id,
            plan_name: plan.name,
            plan_slug: plan.slug,
            ai_tokens: tokens,
            list_price: round2(listPrice),
            price: round2(price),
            seats_limit: Number.isFinite(seats) && seats > 0 ? seats : 9999,
        };
    });
    const total = round2(items.reduce((sum, i) => sum + i.price, 0));
    if (total > 0 && total < 5) throw new HttpError(400, 'O Asaas exige cobrança mínima de R$ 5,00.');

    const { subscriberId, companyId, accountCreated } = await ensureAccount(admin, body);

    const { data: activeSubs } = await admin
        .from('subscriptions')
        .select('product_id')
        .eq('company_id', companyId)
        .in('status', ['active', 'trial', 'past_due'])
        .in('product_id', productIds);
    if (activeSubs && activeSubs.length > 0) {
        const names = items.filter(i => activeSubs.some(s => s.product_id === i.product_id)).map(i => i.product_name);
        throw new HttpError(409, `Esta empresa já possui assinatura ativa de: ${names.join(', ')}.`);
    }

    const { data: pending } = await admin
        .from('subscription_invites')
        .select('id')
        .eq('company_id', companyId)
        .in('status', ['pending', 'processing'])
        .limit(1);
    if (pending && pending.length > 0) {
        throw new HttpError(409, 'Já existe um convite pendente para esta empresa. Cancele-o antes de criar outro.');
    }

    const expiresAt = new Date(Date.now() + INVITE_VALIDITY_DAYS * 86400000).toISOString();
    const { data: invite, error: invErr } = await admin
        .from('subscription_invites')
        .insert({
            token: newToken(),
            contact_name: body.contact_name.trim(),
            company_name: body.company_name.trim(),
            email,
            phone: onlyDigits(body.phone) || null,
            cpf_cnpj: doc,
            billing_cycle: body.billing_cycle,
            due_date: body.due_date,
            storage_gb: body.storage_gb ?? null,
            items,
            total_amount: total,
            subscriber_id: subscriberId,
            company_id: companyId,
            account_created: accountCreated,
            expires_at: expiresAt,
            created_by: caller.id,
        })
        .select('*')
        .single();
    if (invErr || !invite) throw new HttpError(500, `Falha ao criar o convite: ${invErr?.message || 'sem retorno'}`);

    let emailSent = false;
    if (body.send_email !== false) {
        try {
            await sendInviteEmail(invite);
            await admin.from('subscription_invites').update({ last_sent_at: new Date().toISOString() }).eq('id', invite.id);
            emailSent = true;
        } catch (err) {
            console.error('[subscription-invite] invite email failed:', err);
        }
    }

    return json({ success: true, invite_id: invite.id, invite_url: inviteUrl(invite.token), email_sent: emailSent });
}

async function handleResend(admin: Admin, req: Request, inviteId: string) {
    await requireAdmin(admin, req);
    const { data: invite } = await admin.from('subscription_invites').select('*').eq('id', inviteId).maybeSingle();
    if (!invite) throw new HttpError(404, 'Convite não encontrado');
    if (invite.status !== 'pending') throw new HttpError(409, 'Só é possível reenviar convites pendentes.');

    const expiresAt = new Date(Date.now() + INVITE_VALIDITY_DAYS * 86400000).toISOString();
    const refreshed = { ...invite, expires_at: expiresAt };
    await sendInviteEmail(refreshed);
    await admin
        .from('subscription_invites')
        .update({ expires_at: expiresAt, last_sent_at: new Date().toISOString() })
        .eq('id', inviteId);
    return json({ success: true, invite_url: inviteUrl(invite.token) });
}

async function handleCancel(admin: Admin, req: Request, inviteId: string) {
    await requireAdmin(admin, req);
    const { data, error } = await admin
        .from('subscription_invites')
        .update({ status: 'canceled', canceled_at: new Date().toISOString() })
        .eq('id', inviteId)
        .eq('status', 'pending')
        .select('id');
    if (error) throw new HttpError(500, error.message);
    if (!data || data.length === 0) throw new HttpError(409, 'Só é possível cancelar convites pendentes.');
    return json({ success: true });
}

async function handleGet(admin: Admin, req: Request, token: unknown) {
    const invite = await loadInviteByToken(admin, token);
    const caller = await getCaller(req);
    const expired = invite.status === 'pending' && isExpired(invite);
    return json({
        invite: {
            status: expired ? 'expired' : invite.status,
            contact_name: invite.contact_name,
            company_name: invite.company_name,
            email: invite.email,
            billing_cycle: invite.billing_cycle,
            due_date: invite.due_date,
            storage_gb: invite.storage_gb,
            total_amount: Number(invite.total_amount),
            expires_at: invite.expires_at,
            items: (invite.items as InviteItem[]).map(i => ({
                product_name: i.product_name,
                plan_name: i.plan_name,
                ai_tokens: i.ai_tokens,
                list_price: i.list_price,
                price: i.price,
            })),
            invoice_url: invite.status === 'accepted' ? invite.invoice_url : null,
        },
        needs_password: invite.status === 'pending' ? await needsPassword(admin, invite) : false,
        is_invited_user: !!caller && caller.id === invite.subscriber_id,
    });
}

async function setPasswordForInvite(admin: Admin, invite: any, password: unknown) {
    if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
        throw new HttpError(400, `A senha deve ter no mínimo ${MIN_PASSWORD_LENGTH} caracteres.`);
    }
    if (!(await needsPassword(admin, invite))) {
        throw new HttpError(409, 'Esta conta já tem senha. Entre com seu e-mail e senha para aceitar o convite.');
    }
    const { error } = await admin.auth.admin.updateUserById(invite.subscriber_id, { password });
    if (error) throw new HttpError(400, `Não foi possível definir a senha: ${error.message}`);
}

async function handleSetPassword(admin: Admin, token: unknown, password: unknown) {
    const invite = await loadInviteByToken(admin, token);
    assertPending(invite);
    await setPasswordForInvite(admin, invite, password);
    return json({ success: true, email: invite.email });
}

async function handleAccept(admin: Admin, req: Request, token: unknown, password: unknown) {
    const invite = await loadInviteByToken(admin, token);
    assertPending(invite);

    if (password != null && password !== '') {
        await setPasswordForInvite(admin, invite, password);
    } else {
        const caller = await getCaller(req);
        if (!caller) throw new HttpError(401, 'Entre na sua conta ou crie sua senha para aceitar o convite.');
        if (caller.id !== invite.subscriber_id) {
            throw new HttpError(403, `Este convite é para ${invite.email}. Entre com essa conta para aceitar.`);
        }
    }

    const { data: locked } = await admin
        .from('subscription_invites')
        .update({ status: 'processing', last_error: null })
        .eq('id', invite.id)
        .eq('status', invite.status)
        .eq('updated_at', invite.updated_at)
        .select('id');
    if (!locked || locked.length === 0) throw new HttpError(409, 'Este convite já está sendo processado.');

    const items = invite.items as InviteItem[];
    const cycle = invite.billing_cycle as 'monthly' | 'yearly';
    const total = Number(invite.total_amount);
    const companyId = invite.company_id as string;
    const dueDate = invite.due_date < todayISO() ? todayISO() : (invite.due_date as string);

    let customerId: string | null = invite.external_customer_id;
    let asaasSubscriptionId: string | null = null;
    let invoiceUrl: string | null = null;
    let cfg: { baseUrl: string; apiKey: string } | null = null;

    try {
        if (total > 0) {
            cfg = asaasConfig(req);

            if (!customerId) {
                const found = await asaas(cfg, 'GET', `/customers?cpfCnpj=${invite.cpf_cnpj}`);
                customerId = found?.data?.[0]?.id ?? null;
            }
            if (!customerId) {
                const created = await asaas(cfg, 'POST', '/customers', {
                    name: invite.company_name,
                    email: invite.email,
                    cpfCnpj: invite.cpf_cnpj,
                    mobilePhone: invite.phone || undefined,
                    externalReference: companyId,
                    notificationDisabled: false,
                });
                customerId = created.id;
            }

            const description = `Sincla - ${items.map(i => `${i.product_name} ${i.plan_name}`).join(' + ')}`.slice(0, 500);
            const sub = await asaas(cfg, 'POST', '/subscriptions', {
                customer: customerId,
                billingType: 'UNDEFINED',
                value: total,
                cycle: cycle === 'yearly' ? 'YEARLY' : 'MONTHLY',
                nextDueDate: dueDate,
                description,
                externalReference: companyId,
            });
            asaasSubscriptionId = sub.id;

            try {
                const payments = await asaas(cfg, 'GET', `/subscriptions/${sub.id}/payments`);
                invoiceUrl = payments?.data?.[0]?.invoiceUrl ?? null;
            } catch (err) {
                console.warn('[subscription-invite] could not fetch first payment:', err);
            }
        }

        const { error: compErr } = await admin
            .from('companies')
            .update({ storage_quota_gb_override: invite.storage_gb })
            .eq('id', companyId);
        if (compErr) throw new Error(`Falha ao aplicar o armazenamento: ${compErr.message}`);

        const now = new Date().toISOString();
        const rows = items.map(i => ({
            company_id: companyId,
            product_id: i.product_id,
            plan: i.plan_slug,
            plan_id: i.plan_id,
            status: 'active',
            seats_limit: i.seats_limit,
            billing_cycle: cycle,
            monthly_amount: cycle === 'yearly' ? round2(i.price / 12) : i.price,
            custom_limits: i.ai_tokens != null ? { ai_tokens: i.ai_tokens } : null,
            external_subscription_id: asaasSubscriptionId,
            external_customer_id: customerId,
            current_period_start: now,
            current_period_end: addCycle(dueDate, cycle),
            canceled_at: null,
            invite_id: invite.id,
        }));
        const { error: subsErr } = await admin.from('subscriptions').upsert(rows, { onConflict: 'company_id,product_id' });
        if (subsErr) throw new Error(`Falha ao ativar as assinaturas: ${subsErr.message}`);

        if (customerId) {
            await admin.from('company_payment_methods').upsert({
                company_id: companyId,
                asaas_customer_id: customerId,
                updated_at: now,
            }, { onConflict: 'company_id' });
        }

        const { error: creditsErr } = await admin.rpc('reload_company_credits', { p_company_id: companyId });
        if (creditsErr) console.error('[subscription-invite] reload credits:', creditsErr);

        await admin
            .from('subscribers')
            .update({ activated_at: now })
            .eq('id', invite.subscriber_id)
            .is('activated_at', null);

        await admin
            .from('subscription_invites')
            .update({
                status: 'accepted',
                accepted_at: now,
                external_customer_id: customerId,
                external_subscription_id: asaasSubscriptionId,
                invoice_url: invoiceUrl,
                last_error: null,
            })
            .eq('id', invite.id);
    } catch (err) {
        const message = (err as Error).message || 'Erro ao processar o aceite';
        console.error('[subscription-invite] accept failed:', err);
        if (cfg && asaasSubscriptionId) {
            try { await asaas(cfg, 'DELETE', `/subscriptions/${asaasSubscriptionId}`); } catch (rollbackErr) {
                console.error('[subscription-invite] rollback Asaas subscription failed:', rollbackErr);
            }
        }
        await admin
            .from('subscription_invites')
            .update({ status: 'pending', last_error: message, external_customer_id: customerId })
            .eq('id', invite.id);
        throw new HttpError(err instanceof HttpError ? err.status : 500, message);
    }

    try {
        await sendAcceptedEmail(invite, invoiceUrl);
    } catch (err) {
        console.error('[subscription-invite] accepted email failed:', err);
    }

    return json({ success: true, email: invite.email, invoice_url: invoiceUrl });
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }
    if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405);

    try {
        const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const body = await req.json().catch(() => ({}));

        switch (body?.action) {
            case 'create': return await handleCreate(admin, req, body as CreateBody);
            case 'resend': return await handleResend(admin, req, String(body.invite_id || ''));
            case 'cancel': return await handleCancel(admin, req, String(body.invite_id || ''));
            case 'get': return await handleGet(admin, req, body.token);
            case 'set_password': return await handleSetPassword(admin, body.token, body.password);
            case 'accept': return await handleAccept(admin, req, body.token, body.password);
            default: return json({ error: 'Ação inválida' }, 400);
        }
    } catch (error) {
        if (error instanceof HttpError) return json({ error: error.message }, error.status);
        console.error('[subscription-invite]', error);
        return json({ error: (error as Error).message || 'Erro interno' }, 500);
    }
});
