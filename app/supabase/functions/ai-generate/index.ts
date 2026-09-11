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
// Sem fallback hardcoded: segredo ausente => cross-token sempre rejeitado.
const CROSS_TOKEN_SECRET = Deno.env.get('CROSS_TOKEN_SECRET') ?? '';
// Segredo compartilhado para chamadas server-to-server (ex.: proxy ai-insight do EAD)
const AI_GATEWAY_SECRET = Deno.env.get('AI_GATEWAY_SECRET') ?? '';
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') ?? '';
// Modelo padrão (ações complexas) e modelo leve (ações básicas)
const OPENAI_DEFAULT_MODEL = Deno.env.get('OPENAI_DEFAULT_MODEL') ?? 'gpt-5.4-mini';
const OPENAI_LIGHT_MODEL = Deno.env.get('OPENAI_LIGHT_MODEL') ?? 'gpt-5.4-nano';
const OPENAI_IMAGE_MODEL = Deno.env.get('OPENAI_IMAGE_MODEL') ?? 'gpt-image-1';
/** Débito fixo em créditos de IA por imagem gerada (tokens-equivalentes). */
const IMAGE_CREDIT_COST = Math.max(1, Number(Deno.env.get('OPENAI_IMAGE_CREDIT_COST') ?? '2000'));
// Fallback: Groq (usado SOMENTE se a OpenAI falhar). Modelo configurável por env.
const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY') ?? '';
const GROQ_FALLBACK_MODEL = Deno.env.get('GROQ_FALLBACK_MODEL') ?? 'llama-3.3-70b-versatile';

const MAX_PROMPT_CHARS = 12000;
const MAX_OUTPUT_TOKENS = 4000;
/** Custo interno aproximado (BRL / milhão de tokens) — só para log de metering */
const UNIT_COST_PER_M = 2.5;
const RESALE_COST_PER_M = 15;

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
    /** 'image' gera capa/arte via Images API (consome créditos fixos). */
    modality?: 'text' | 'image';
    /** Tamanho OpenAI: 1024x1024 | 1024x1792 | 1792x1024 */
    image_size?: string;
    /** Estilo visual: futurista | realista | minimalista | clean | ilustracao */
    image_style?: string;
    primary_color?: string;
    secondary_color?: string;
    brand_name?: string;
    segment?: string;
    /** URL pública do favicon/logo — usada só no prompt de marca (sem texto na arte). */
    brand_mark_url?: string;
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
        if (!CROSS_TOKEN_SECRET) return { error: 'cross-token não configurado', status: 401 };
        try {
            const secret = new TextEncoder().encode(CROSS_TOKEN_SECRET);
            const { payload } = await jwtVerify(crossToken, secret, { algorithms: ['HS256'] });
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

const STYLE_GUIDE: Record<string, string> = {
    futurista: 'futuristic, tech, neon accents, sleek surfaces, cinematic lighting',
    realista: 'photorealistic photography, natural lighting, shallow depth of field, editorial photo',
    minimalista: 'minimal composition, lots of negative space, simple geometric shapes, restrained palette',
    clean: 'clean modern design, soft gradients, polished product aesthetic, airy layout',
    ilustracao: 'illustration, vector-like shapes, stylized characters or scenes, artistic brush feel',
};

function buildImagePrompt(body: RequestBody, userPrompt: string): string {
    const styleKey = (body.image_style || 'clean').toLowerCase();
    const style = STYLE_GUIDE[styleKey] || STYLE_GUIDE.clean;
    const primary = body.primary_color || '#002982';
    const secondary = body.secondary_color || '#06b6d4';
    const brand = body.brand_name || 'brand';
    const segment = body.segment || 'education';
    return [
        `Create a cover artwork for an online course about: ${userPrompt}.`,
        `Visual style: ${style}.`,
        `Brand palette must dominate: primary ${primary}, secondary ${secondary}.`,
        `Brand context: "${brand}" in the ${segment} segment.`,
        body.brand_mark_url
            ? `Subtly echo the brand mark/favicon mood (abstract shapes inspired by the logo at ${body.brand_mark_url}), without copying trademarked logos literally.`
            : 'Use abstract brand-mark motifs consistent with a professional education brand.',
        'CRITICAL: Absolutely NO text, letters, numbers, watermarks, logos with readable words, titles, or typography anywhere in the image.',
        'The image must be pure visual art — the course title is only thematic context, never rendered as text.',
        'High quality, centered composition, suitable as an e-learning cover.',
    ].join(' ');
}

async function callOpenAIImage(opts: {
    prompt: string;
    size: string;
}): Promise<{ b64: string; model: string }> {
    const size = ['1024x1024', '1024x1792', '1792x1024'].includes(opts.size)
        ? opts.size
        : '1024x1024';

    const payload: Record<string, unknown> = {
        model: OPENAI_IMAGE_MODEL,
        prompt: opts.prompt,
        size,
        n: 1,
    };
    // gpt-image-1 returns b64 by default in many setups; dall-e-3 needs response_format
    if (/dall-e/i.test(OPENAI_IMAGE_MODEL)) {
        payload.response_format = 'b64_json';
        payload.quality = 'standard';
    }

    const res = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        const detail = await res.text();
        throw new Error(`OpenAI Images ${res.status}: ${detail.slice(0, 500)}`);
    }

    const data = await res.json();
    const b64: string = data?.data?.[0]?.b64_json
        || (data?.data?.[0]?.url ? '' : '');
    if (!b64 && data?.data?.[0]?.url) {
        const imgRes = await fetch(data.data[0].url);
        if (!imgRes.ok) throw new Error('Falha ao baixar imagem gerada');
        const buf = new Uint8Array(await imgRes.arrayBuffer());
        let binary = '';
        for (let i = 0; i < buf.length; i++) binary += String.fromCharCode(buf[i]);
        return { b64: btoa(binary), model: data?.model ?? OPENAI_IMAGE_MODEL };
    }
    if (!b64) throw new Error('OpenAI Images não retornou imagem');
    return { b64, model: data?.model ?? OPENAI_IMAGE_MODEL };
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

        // ── Billing: saldo de créditos de IA da empresa ──
        const { data: credits } = await admin
            .from('company_credits')
            .select('balance')
            .eq('company_id', resolved.companyId)
            .eq('service_type', 'ai')
            .maybeSingle();

        if (!credits || credits.balance <= 0) {
            return json({
                error: 'Créditos de IA esgotados. Recarregue no Hub Sincla para continuar.',
                error_code: 'NO_CREDITS',
                remaining_credits: credits?.balance ?? 0,
            }, 402);
        }

        // ── Imagem (capas / artes) ──────────────────────────────────────────
        if (body.modality === 'image') {
            if (!OPENAI_API_KEY) {
                return json({ error: 'OPENAI_API_KEY ausente para geração de imagem' }, 500);
            }
            if (credits.balance < IMAGE_CREDIT_COST) {
                return json({
                    error: `Créditos insuficientes para gerar imagem (precisa ~${IMAGE_CREDIT_COST}).`,
                    error_code: 'NO_CREDITS',
                    remaining_credits: credits.balance,
                }, 402);
            }

            const imagePrompt = buildImagePrompt(body, prompt);
            const image = await callOpenAIImage({
                prompt: imagePrompt,
                size: body.image_size || '1024x1792',
            });

            const { data: debitResult } = await admin.rpc('debit_credits', {
                p_company_id: resolved.companyId,
                p_service_type: 'ai',
                p_amount: IMAGE_CREDIT_COST,
            });
            const remainingCredits = debitResult?.success
                ? debitResult.balance
                : (typeof debitResult?.balance === 'number' ? debitResult.balance : credits.balance - IMAGE_CREDIT_COST);

            try {
                await admin.from('service_usage_log').insert({
                    company_id: resolved.companyId,
                    service_type: 'ai',
                    sub_type: 'image-cover',
                    tool_id: String(body.purpose || 'ai-image').slice(0, 64),
                    quantity: IMAGE_CREDIT_COST,
                    unit_cost_brl: UNIT_COST_PER_M / 1_000_000,
                    resale_cost_brl: RESALE_COST_PER_M / 1_000_000,
                    metadata: {
                        model: image.model,
                        provider: 'openai',
                        image_size: body.image_size || '1024x1792',
                        image_style: body.image_style || 'clean',
                        purpose: body.purpose ?? null,
                    },
                });
            } catch (logErr) {
                console.error('[ai-generate] Erro ao logar imagem:', logErr);
            }

            return json({
                image_base64: image.b64,
                mime_type: 'image/png',
                provider: 'openai',
                model: image.model,
                usage: { total_tokens: IMAGE_CREDIT_COST },
                remaining_credits: remainingCredits,
            });
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

        const usageObj = (result.usage ?? {}) as {
            prompt_tokens?: number;
            completion_tokens?: number;
            total_tokens?: number;
        };
        // Sempre debitar: se a API não reportar usage, estima (~4 chars/token).
        const estimatedTokens = Math.max(
            1,
            Math.ceil(((body.system?.length ?? 0) + prompt.length + (result.text?.length ?? 0)) / 4),
        );
        const totalTokens = Math.max(Number(usageObj.total_tokens) || 0, estimatedTokens);
        let remainingCredits: number | undefined = credits.balance;

        {
            const { data: debitResult } = await admin.rpc('debit_credits', {
                p_company_id: resolved.companyId,
                p_service_type: 'ai',
                p_amount: totalTokens,
            });

            if (debitResult?.success) {
                remainingCredits = debitResult.balance;
            } else {
                console.warn('[ai-generate] Débito falhou (pós-chamada):', debitResult);
                remainingCredits = typeof debitResult?.balance === 'number' ? debitResult.balance : 0;
                // Se o saldo não cobriu o uso real, ainda registra tentativa e alerta.
                // Não devolve free-forever silenciosamente sem log.
            }

            const unit = UNIT_COST_PER_M / 1_000_000;
            const resale = RESALE_COST_PER_M / 1_000_000;
            try {
                await admin.from('service_usage_log').insert({
                    company_id: resolved.companyId,
                    service_type: 'ai',
                    sub_type: providerUsed === 'groq' ? 'groq-fallback' : (body.tier === 'light' ? 'gpt-light' : 'gpt-standard'),
                    tool_id: String(body.purpose || 'ai-generate').slice(0, 64),
                    quantity: totalTokens,
                    unit_cost_brl: unit,
                    resale_cost_brl: resale,
                    metadata: {
                        model: result.model,
                        provider: providerUsed,
                        prompt_tokens: usageObj.prompt_tokens,
                        completion_tokens: usageObj.completion_tokens,
                        purpose: body.purpose ?? null,
                        estimated: !(Number(usageObj.total_tokens) > 0),
                        debit_ok: Boolean(debitResult?.success),
                    },
                });
            } catch (logErr) {
                console.error('[ai-generate] Erro ao logar service_usage:', logErr);
            }
        }

        return json({
            text: result.text,
            provider: providerUsed,
            model: result.model,
            usage: result.usage ?? { total_tokens: totalTokens },
            remaining_credits: remainingCredits,
        });
    } catch (error) {
        console.error('[ai-generate] erro:', error);
        const message = error instanceof Error ? error.message : 'Erro interno';
        return json({ error: message }, 500);
    }
});
