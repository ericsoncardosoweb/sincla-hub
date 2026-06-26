/**
 * Storage Service - Upload de arquivos via Supabase Edge Function → Bunny CDN
 * 
 * A Edge Function `upload-asset` faz proxy do upload para Bunny CDN Storage,
 * mantendo a API key segura no servidor.
 * 
 * Estrutura no Bunny:
 * - empresas/{slug}/logo.{ext}           -> Logo da empresa
 * - empresas/{slug}/favicon.{ext}        -> Favicon da empresa
 * - empresas/{slug}/assets/{filename}    -> Assets gerais
 * - avatares/{userId}/avatar.{ext}       -> Fotos de perfil
 */

import { supabase } from '../lib/supabase';
import { HUB_SUPABASE_ANON_KEY, HUB_SUPABASE_URL } from '../lib/supabaseConfig';

export interface UploadResult {
    success: boolean;
    url?: string;
    path?: string;
    error?: string;
}

/**
 * Gera slug limpo a partir de string
 */
export const generateSlug = (text: string): string => {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
};

/**
 * Upload via Edge Function (Bunny CDN)
 */
const uploadViaEdgeFunction = async (
    path: string,
    file: File
): Promise<UploadResult> => {
    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('path', path);

        // Get the current session for auth
        const { data: { session } } = await supabase.auth.getSession();

        const response = await fetch(
            `${HUB_SUPABASE_URL}/functions/v1/upload-asset`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session?.access_token || HUB_SUPABASE_ANON_KEY}`,
                },
                body: formData,
            }
        );

        const data = await response.json();

        if (!response.ok) {
            return { success: false, error: data.error || 'Erro no upload' };
        }

        return {
            success: true,
            url: data.url,
            path: data.path,
        };
    } catch (err: any) {
        console.error('Erro ao fazer upload:', err);
        return { success: false, error: err.message || 'Erro de conexão' };
    }
};

// ============================================================================
// APIs ESPECÍFICAS
// ============================================================================

/**
 * Upload de logo da empresa
 */
export const uploadEmpresaLogo = async (
    empresaSlug: string,
    file: File
): Promise<UploadResult> => {
    const slug = generateSlug(empresaSlug);
    const ext = file.name.split('.').pop() || 'png';
    const result = await uploadViaEdgeFunction(`empresas/${slug}/logo.${ext}`, file);
    // Adicionar cache-buster para forçar reload (Bunny CDN e browser podem cachear)
    if (result.success && result.url) {
        result.url = `${result.url}?v=${Date.now()}`;
    }
    return result;
};

/**
 * Upload de avatar (foto de perfil)
 */
export const uploadAvatar = async (
    userId: string,
    file: File
): Promise<UploadResult> => {
    const ext = file.name.split('.').pop() || 'png';
    return uploadViaEdgeFunction(`avatares/${userId}/avatar.${ext}`, file);
};

/**
 * Upload de asset genérico da empresa
 */
export const uploadEmpresaAsset = async (
    empresaSlug: string,
    tipo: string,
    file: File
): Promise<UploadResult> => {
    const slug = generateSlug(empresaSlug);
    const ext = file.name.split('.').pop() || 'png';
    const result = await uploadViaEdgeFunction(`empresas/${slug}/${tipo}.${ext}`, file);
    // Cache-buster para forçar reload
    if (result.success && result.url) {
        result.url = `${result.url}?v=${Date.now()}`;
    }
    return result;
};

/**
 * Deletar arquivo (não implementado ainda)
 */
export const deleteFile = async (_path: string): Promise<boolean> => {
    // TODO: implementar via Edge Function
    return false;
};

// Export default
export const storageService = {
    uploadEmpresaLogo,
    uploadAvatar,
    uploadEmpresaAsset,
    deleteFile,
    generateSlug,
};

export default storageService;
