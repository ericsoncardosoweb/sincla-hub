/**
 * ai-generate — Motor de IA único da Sincla (gateway provider-agnóstico)
 * =====================================================================
 * API única para geração de texto/insights por IA. Hoje roteia para a OpenAI
 * usando a chave da Sincla (OPENAI_API_KEY em Edge Function Secret). A estrutura
 * já prevê outros provedores (Gemini, Anthropic) para a fase BYOK — quando os
 * tenants poderão usar a própria chave.
 *
 * Autenticação aceita:
 *   1. Sessão do Hub (Authorization: Bearer <jwt>) + company_id no body.
 *   2. Cross-token SSO (header x-cross-token, HS256/CROSS_TOKEN_SECRET) — satélites.
 *
 * Body:
 *   { company_id?, prompt, system?, json?, max_tokens?, temperature?, purpose? }
 * Resposta:
 *   { text, provider, model, usage }
 */
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { jwtVerify } from 'https://deno.land/x/jose@v5.2.0/index.ts';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cross-token, x-service-secret',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const CROSS_TOKEN_SECRET = Deno.env.get('CROSS_TOKEN_SECRET') ?? 'sincla-hub-secret-key-change-in-production';
// Segredo compartilhado para chamadas server-to-server (ex.: proxy ai-insight do EAD)
const AI_GATEWAY_SECRET = Deno.env.get('AI_GATEWAY_SECRET') ?? '';
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') ?? '';
// Modelo padrão (ações complexas) e modelo leve (ações básicas)
const OPENAI_DEFAULT_MODEL = Deno.env.get('OPENAI_DEFAULT_MODEL') ?? 'gpt-5.4-mini';
const OPENAI_LIGHT_MODEL = Deno.env.get('OPENAI_LIGHT_MODEL') ?? 'gpt-5.4-nano';
// Fallback: Groq (usado SOMENTE se a OpenAI falhar). Modelo configurável por env.
const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY') ?? '';
const GROQ_FALLBACK_MODEL = Deno.env.get('GROQ_FALLBACK_MODEL') ?? 'llama-3.3-70b-versatile';

const MAX_PROMPT_CHARS = 12000;
const MAX_OUTPUT_TOKENS = 1500;

interface RequestBody {
    company_id?: string;
    prompt?: string;
    system?: string;
    json?: boolean;
    max_tokens?: number;
    temperature?: number;
    purpose?: string;
    /** 'light' usa o modelo leve (nano); padrão usa o modelo principal (mini) */
    tier?: 'light' | 'standard';
    /** Override explícito do modelo (tem prioridade sobre tier) */
    model?: string;
}

function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
}

/** Resolve a company_id autorizada a partir da sessão do Hub OU do cross-token. */
async function resolveCompanyId(req: Request, body: RequestBody): Promise<{ companyId: string } | { error: string; status: number }> {
    // Modo server-to-server: ferramentas satélite (EAD etc.) chamam com segredo de serviço.
    const serviceSecret = req.headers.get('x-service-secret');
    if (serviceSecret) {
        if (!AI_GATEWAY_SECRET || serviceSecret !== AI_GATEWAY_SECRET) {
            return { error: 'service secret inválido', status: 401 };
        }
        if (!body.company_id) return { error: 'company_id é obrigatório', status: 400 };
        return { companyId: body.company_id };
    }

    const crossToken = req.headers.get('x-cross-token');
    if (crossToken) {
        try {
            const secret = new TextEncoder().encode(CROSS_TOKEN_SECRET);
            const { payload } = await jwtVerify(crossToken, secret);
            const companyId = (payload as Record<string, unknown>).company_id as string | undefined;
            if (!companyId) return { error: 'cross-token sem company_id', status: 401 };
            return { companyId };
        } catch {
            return { error: 'cross-token inválido', status: 401 };
        }
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return { error: 'Sem autenticação', status: 401 };
    if (!body.company_id) return { error: 'company_id é obrigatório', status: 400 };

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return { error: 'Token inválido', status: 401 };

    const { data: membership } = await supabase
        .from('company_members')
        .select('id')
        .eq('user_id', user.id)
        .eq('company_id', body.company_id)
        .eq('status', 'active')
        .maybeSingle();

    if (!membership) return { error: 'Usuário não pertence a esta empresa', status: 403 };
    return { companyId: body.company_id };
}

async function callOpenAI(opts: {
    system?: string;
    prompt: string;
    json?: boolean;
    maxTokens: number;
    temperature: number;
    model: string;
}): Promise<{ text: string; usage: unknown; model: string }> {
    const messages: Array<{ role: string; content: string }> = [];
    if (opts.system) messages.push({ role: 'system', content: opts.system });
    messages.push({ role: 'user', content: opts.prompt });

    const payload: Record<string, unknown> = {
        model: opts.model,
        messages,
    };
    // A família GPT-5 usa max_completion_tokens e só aceita temperature padrão (1)
    const isGpt5Family = /^gpt-5/i.test(opts.model);
    if (isGpt5Family) {
        payload.max_completion_tokens = opts.maxTokens;
    } else {
        payload.max_tokens = opts.maxTokens;
        payload.temperature = opts.temperature;
    }
    if (opts.json) payload.response_format = { type: 'json_object' };

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        const detail = await res.text();
        throw new Error(`OpenAI ${res.status}: ${detail.slice(0, 500)}`);
    }

    const data = await res.json();
    const text: string = data?.choices?.[0]?.message?.content ?? '';
    return { text, usage: data?.usage ?? null, model: data?.model ?? opts.model };
}

/** Fallback Groq (API compatível com OpenAI). Usado só quando a OpenAI falha. */
async function callGroq(opts: {
    system?: string;
    prompt: string;
    json?: boolean;
    maxTokens: number;
    temperature: number;
}): Promise<{ text: string; usage: unknown; model: string }> {
    const messages: Array<{ role: string; content: string }> = [];
    if (opts.system) messages.push({ role: 'system', content: opts.system });
    messages.push({ role: 'user', content: opts.prompt });

    const payload: Record<string, unknown> = {
        model: GROQ_FALLBACK_MODEL,
        messages,
        max_tokens: opts.maxTokens,
        temperature: opts.temperature,
    };
    if (opts.json) payload.response_format = { type: 'json_object' };

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        const detail = await res.text();
        throw new Error(`Groq ${res.status}: ${detail.slice(0, 500)}`);
    }

    const data = await res.json();
    const text: string = data?.choices?.[0]?.message?.content ?? '';
    return { text, usage: data?.usage ?? null, model: data?.model ?? GROQ_FALLBACK_MODEL };
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    if (req.method !== 'POST') {
        return json({ error: 'Método não permitido' }, 405);
    }

    try {
        const body = (await req.json()) as RequestBody;

        const prompt = (body.prompt ?? '').trim();
        if (!prompt) return json({ error: 'prompt é obrigatório' }, 400);
        if (prompt.length > MAX_PROMPT_CHARS) {
            return json({ error: `prompt excede ${MAX_PROMPT_CHARS} caracteres` }, 400);
        }

        const resolved = await resolveCompanyId(req, body);
        if ('error' in resolved) return json({ error: resolved.error }, resolved.status);

        // Configuração de IA da empresa (service role contorna RLS de leitura)
        const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const { data: settings } = await admin
            .from('tenant_ai_settings')
            .select('ai_enabled, provider, model')
            .eq('company_id', resolved.companyId)
            .maybeSingle();

        if (settings && settings.ai_enabled === false) {
            return json({ error: 'IA desativada para esta empresa' }, 403);
        }

        const provider = (settings?.provider as string) ?? 'sincla';

        // Hoje só 'sincla' (OpenAI). BYOK (openai próprio/gemini/anthropic) virá depois.
        if (provider === 'gemini' || provider === 'anthropic') {
            return json({ error: `Provedor "${provider}" ainda não disponível (BYOK em breve)` }, 501);
        }

        if (!OPENAI_API_KEY && !GROQ_API_KEY) {
            return json({ error: 'Nenhum provedor de IA configurado (defina OPENAI_API_KEY e/ou GROQ_API_KEY)' }, 500);
        }

        const maxTokens = Math.min(Math.max(Number(body.max_tokens) || 800, 1), MAX_OUTPUT_TOKENS);
        const temperature = Math.min(Math.max(Number(body.temperature ?? 0.4), 0), 1);
        // Resolução de modelo: override explícito > config do tenant > tier (mini/nano)
        const tierModel = body.tier === 'light' ? OPENAI_LIGHT_MODEL : OPENAI_DEFAULT_MODEL;
        const model = (body.model as string) || (settings?.model as string) || tierModel;

        // OpenAI principal; Groq como fallback automático se a OpenAI falhar.
        let result: { text: string; usage: unknown; model: string };
        let providerUsed: 'openai' | 'groq';
        try {
            if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY ausente');
            result = await callOpenAI({ system: body.system, prompt, json: body.json === true, maxTokens, temperature, model });
            providerUsed = 'openai';
        } catch (primaryError) {
            if (!GROQ_API_KEY) throw primaryError;
            console.warn('[ai-generate] OpenAI falhou, usando fallback Groq:', primaryError instanceof Error ? primaryError.message : primaryError);
            result = await callGroq({ system: body.system, prompt, json: body.json === true, maxTokens, temperature });
            providerUsed = 'groq';
        }

        return json({
            text: result.text,
            provider: providerUsed,
            model: result.model,
            usage: result.usage,
        });
    } catch (error) {
        console.error('[ai-generate] erro:', error);
        const message = error instanceof Error ? error.message : 'Erro interno';
        return json({ error: message }, 500);
    }
});
