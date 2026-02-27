import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Center, Loader, Stack, Text } from '@mantine/core';
import { supabase } from '../../shared/lib/supabase';

/**
 * AuthCallback
 * 
 * Handles the callback from Supabase Auth (Magic Link, OAuth, etc.)
 * This page is loaded after the user clicks the authentication link in their email.
 */
export function AuthCallback() {
    const navigate = useNavigate();

    useEffect(() => {
        const handleAuthCallback = async () => {
            try {
                // Get the hash from the URL (Supabase puts tokens in the hash)
                const hashParams = new URLSearchParams(window.location.hash.substring(1));
                const accessToken = hashParams.get('access_token');
                const refreshToken = hashParams.get('refresh_token');
                const error = hashParams.get('error');
                const errorDescription = hashParams.get('error_description');

                // Check for errors
                if (error) {
                    console.error('Auth error:', error, errorDescription);
                    navigate('/login?error=' + encodeURIComponent(errorDescription || error));
                    return;
                }

                // If we have tokens in the hash, set the session
                if (accessToken && refreshToken) {
                    const { error: sessionError } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken,
                    });

                    if (sessionError) {
                        console.error('Session error:', sessionError);
                        navigate('/login?error=' + encodeURIComponent(sessionError.message));
                        return;
                    }
                }

                // Check if we have a valid session
                const { data: { session } } = await supabase.auth.getSession();

                if (session) {
                    // Successfully authenticated, redirect to dashboard
                    // Check if this is a new user (needs to create company) or existing
                    const { data: companies } = await supabase
                        .from('companies')
                        .select('id')
                        .limit(1);

                    if (!companies || companies.length === 0) {
                        // New user, redirect to onboarding
                        navigate('/painel/onboarding');
                    } else {
                        // Existing user, redirect to dashboard
                        navigate('/painel');
                    }
                } else {
                    // No session, redirect to login
                    navigate('/login?error=' + encodeURIComponent('Sessão expirada. Por favor, tente novamente.'));
                }
            } catch (err) {
                console.error('Auth callback error:', err);
                navigate('/login?error=' + encodeURIComponent('Erro ao processar autenticação.'));
            }
        };

        handleAuthCallback();
    }, [navigate]);

    return (
        <Center h="100vh">
            <Stack align="center" gap="md">
                <Loader size="lg" color="blue" />
                <Text c="dimmed">Autenticando...</Text>
            </Stack>
        </Center>
    );
}
