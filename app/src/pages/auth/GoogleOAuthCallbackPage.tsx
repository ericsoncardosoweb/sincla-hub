/**
 * GoogleOAuthCallbackPage — Sincla Hub (OAuth Gateway Centralizado)
 * ═══════════════════════════════════════════════════════════════════
 * Recebe o código OAuth do Google e troca por tokens.
 * Devolve os tokens para a janela pai (qualquer ferramenta Sincla)
 * via window.opener.postMessage.
 *
 * Rota: /google/callback
 * Redirect URI no Google Console:
 *   - Dev:  http://localhost:5172/google/callback
 *   - Prod: https://app.sincla.com.br/google/callback
 */
import { useEffect, useState } from 'react';
import { Center, Loader, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconCheck, IconX } from '@tabler/icons-react';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = import.meta.env.VITE_GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = `${window.location.origin}/google/callback`;

export default function GoogleOAuthCallbackPage() {
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        const handleCallback = async () => {
            try {
                const params = new URLSearchParams(window.location.search);
                const code = params.get('code');
                const error = params.get('error');

                if (error) {
                    setErrorMsg(error === 'access_denied' ? 'Acesso negado pelo usuário' : error);
                    setStatus('error');
                    return;
                }

                if (!code) {
                    setErrorMsg('Código de autorização não encontrado');
                    setStatus('error');
                    return;
                }

                // 1. Trocar código por tokens
                const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({
                        code,
                        client_id: GOOGLE_CLIENT_ID,
                        client_secret: GOOGLE_CLIENT_SECRET,
                        redirect_uri: REDIRECT_URI,
                        grant_type: 'authorization_code',
                    }),
                });

                if (!tokenResponse.ok) {
                    const errorData = await tokenResponse.json();
                    throw new Error(errorData.error_description || 'Falha ao obter tokens do Google');
                }

                const tokenData = await tokenResponse.json();

                // 2. Buscar email do usuário Google
                const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                    headers: { Authorization: `Bearer ${tokenData.access_token}` },
                });
                const userInfo = await userInfoResponse.json();

                // 3. Enviar tokens para a janela pai via postMessage
                const payload = {
                    type: 'GOOGLE_OAUTH_TOKENS',
                    access_token: tokenData.access_token,
                    refresh_token: tokenData.refresh_token,
                    expires_in: tokenData.expires_in,
                    email: userInfo.email,
                };

                setStatus('success');

                setTimeout(() => {
                    if (window.opener) {
                        window.opener.postMessage(payload, '*');
                        window.close();
                    }
                }, 1200);
            } catch (err: any) {
                console.error('[GoogleOAuthCallback] Erro:', err);
                setErrorMsg(err.message || 'Erro ao conectar com Google');
                setStatus('error');
            }
        };

        handleCallback();
    }, []);

    return (
        <Center h="100vh" style={{ background: '#f8f9fa' }}>
            <Stack align="center" gap="md">
                {status === 'loading' && (
                    <>
                        <Loader size="lg" color="blue" />
                        <Text c="dimmed">Conectando com Google...</Text>
                    </>
                )}
                {status === 'success' && (
                    <>
                        <ThemeIcon size={60} radius="xl" color="green" variant="light">
                            <IconCheck size={30} />
                        </ThemeIcon>
                        <Text fw={600} size="lg">Google conectado!</Text>
                        <Text c="dimmed" size="sm">Esta janela fechará automaticamente...</Text>
                    </>
                )}
                {status === 'error' && (
                    <>
                        <ThemeIcon size={60} radius="xl" color="red" variant="light">
                            <IconX size={30} />
                        </ThemeIcon>
                        <Text fw={600} size="lg">Erro ao conectar</Text>
                        <Text c="dimmed" size="sm">{errorMsg}</Text>
                        <Text c="dimmed" size="xs">Feche esta janela e tente novamente.</Text>
                    </>
                )}
            </Stack>
        </Center>
    );
}
