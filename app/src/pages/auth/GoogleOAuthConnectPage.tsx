/**
 * GoogleOAuthConnectPage — Sincla Hub (OAuth Gateway Centralizado)
 * ═══════════════════════════════════════════════════════════════════
 * Inicia o fluxo OAuth com o Google usando as chaves do Hub,
 * mas recebendo scopes de qualquer ferramenta (Agenda, RH, etc).
 * Redireciona imediatamente para o Google.
 */
import { useEffect } from 'react';
import { Center, Loader, Stack, Text } from '@mantine/core';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const REDIRECT_URI = `${window.location.origin}/google/callback`;

export default function GoogleOAuthConnectPage() {
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        // Scopes padrão (perfil + email) se nenhuma for fornecida
        const scopes = params.get('scopes') || 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile';

        const googleParams = new URLSearchParams({
            client_id: GOOGLE_CLIENT_ID,
            redirect_uri: REDIRECT_URI,
            response_type: 'code',
            scope: scopes,
            access_type: 'offline',
            prompt: 'consent',
            state: crypto.randomUUID(),
        });

        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${googleParams.toString()}`;
        
        // Substituir a página atual no histórico para voltar e fechar o popup corretamente
        window.location.replace(authUrl);
    }, []);

    return (
        <Center h="100vh" style={{ background: '#f8f9fa' }}>
            <Stack align="center" gap="md">
                <Loader size="lg" color="blue" />
                <Text c="dimmed">Redirecionando para o Google...</Text>
            </Stack>
        </Center>
    );
}
