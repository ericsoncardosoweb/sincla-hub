/**
 * Email/SMTP Settings Service — Sincla Hub
 * Configuração de SMTP próprio por empresa (tenant), com fallback do sistema.
 *
 * Segurança:
 *   - Leitura via RPC mascarada (get_company_notification_settings): nunca
 *     devolve senha/token, apenas flags "set".
 *   - Escrita via upsert em notification_settings (RLS: owner/admin).
 *   - Teste via Edge Function verify-smtp (envia e-mail real e marca verificado).
 */

import { supabase } from '../lib/supabase';

export interface CompanyEmailSettings {
    company_id: string;
    email_enabled: boolean;
    in_app_enabled: boolean;
    custom_smtp_host: string | null;
    custom_smtp_port: number | null;
    custom_smtp_secure: boolean | null;
    custom_smtp_user: string | null;
    custom_smtp_from: string | null;
    custom_smtp_from_name: string | null;
    custom_smtp_reply_to: string | null;
    smtp_password_set: boolean;
    smtp_verified: boolean;
    smtp_verified_at: string | null;
    smtp_last_error: string | null;
}

export interface SaveSmtpInput {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    /** Só envie se o usuário digitou uma nova senha; se vazio, mantém a atual. */
    password?: string;
    fromEmail: string;
    fromName: string;
    replyTo?: string;
}

/** Lê config mascarada (sem senha) da empresa. */
export async function getCompanyEmailSettings(companyId: string): Promise<CompanyEmailSettings | null> {
    const { data, error } = await supabase.rpc('get_company_notification_settings', {
        p_company_id: companyId,
    });
    if (error) {
        console.error('[emailSettings] Erro ao carregar:', error.message);
        return null;
    }
    const row = Array.isArray(data) ? data[0] : data;
    return (row as CompanyEmailSettings) || null;
}

/**
 * Salva o SMTP da empresa. Alterar a config zera a verificação
 * (smtp_verified=false) — é preciso testar novamente.
 */
export async function saveCompanySmtp(companyId: string, input: SaveSmtpInput): Promise<void> {
    const payload: Record<string, unknown> = {
        company_id: companyId,
        custom_smtp_host: input.host?.trim() || null,
        custom_smtp_port: input.port || null,
        custom_smtp_secure: input.secure,
        custom_smtp_user: input.user?.trim() || null,
        custom_smtp_from: input.fromEmail?.trim() || null,
        custom_smtp_from_name: input.fromName?.trim() || null,
        custom_smtp_reply_to: input.replyTo?.trim() || null,
        smtp_verified: false,
        updated_at: new Date().toISOString(),
    };
    // Só grava a senha se uma nova foi digitada (não sobrescreve com vazio)
    if (input.password && input.password.length > 0) {
        payload.custom_smtp_password = input.password;
    }

    const { error } = await supabase
        .from('notification_settings')
        .upsert(payload, { onConflict: 'company_id' });

    if (error) throw new Error(error.message);
}

/** Remove o SMTP próprio: a empresa volta a enviar pelo sistema Sincla. */
export async function disableCompanySmtp(companyId: string): Promise<void> {
    const { error } = await supabase
        .from('notification_settings')
        .upsert(
            {
                company_id: companyId,
                custom_smtp_host: null,
                custom_smtp_port: null,
                custom_smtp_user: null,
                custom_smtp_password: null,
                custom_smtp_from: null,
                custom_smtp_from_name: null,
                custom_smtp_reply_to: null,
                smtp_verified: false,
                smtp_last_error: null,
                updated_at: new Date().toISOString(),
            },
            { onConflict: 'company_id' }
        );
    if (error) throw new Error(error.message);
}

/** Testa o SMTP salvo enviando um e-mail real e marca como verificado. */
export async function testCompanySmtp(
    companyId: string,
    testTo?: string
): Promise<{ success: boolean; sent_to?: string; error?: string }> {
    const { data, error } = await supabase.functions.invoke('verify-smtp', {
        body: { company_id: companyId, test_to: testTo },
    });
    if (error) {
        return { success: false, error: error.message };
    }
    const res = data as { success?: boolean; sent_to?: string; error?: string };
    if (res?.error) return { success: false, error: res.error };
    return { success: true, sent_to: res?.sent_to };
}
