import { useState } from 'react';
import {
    Text, Card, Group, Button, Switch, Badge, ThemeIcon, Divider, Skeleton, Stack, Title, Alert
} from '@mantine/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { IconAlertCircle, IconBrandApple } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useAuth } from '../../../shared/contexts';
import { supabase } from '../../../shared/lib/supabase';

// ─── Google SVG Icon ─────────────────────────────────────────────────────────
const GoogleIcon = ({ size = 22 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
);

// ─── Microsoft SVG Icon ──────────────────────────────────────────────────────
const MicrosoftIcon = ({ size = 22 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <rect x="1" y="1" width="10" height="10" fill="#F25022"/>
        <rect x="13" y="1" width="10" height="10" fill="#7FBA00"/>
        <rect x="1" y="13" width="10" height="10" fill="#00A4EF"/>
        <rect x="13" y="13" width="10" height="10" fill="#FFB900"/>
    </svg>
);

// ─── Google Integration Services ─────────────────────────────────────────────
const HUB_ORIGIN = window.location.origin;

async function getGoogleIntegration(tenantId: string, userId: string) {
    const { data, error } = await supabase
        .from('google_integrations')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('user_id', userId)
        .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
}

function connectGoogleViaHub(): Promise<any> {
    return new Promise((resolve, reject) => {
        const scopes = [
            'https://www.googleapis.com/auth/contacts.readonly',
            'https://www.googleapis.com/auth/calendar',
            'https://www.googleapis.com/auth/calendar.events',
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile',
        ].join(' ');

        const params = new URLSearchParams({ scopes });
        const authUrl = `${HUB_ORIGIN}/google/connect?${params.toString()}`;

        const width = 500;
        const height = 600;
        const left = window.screenX + (window.innerWidth - width) / 2;
        const top = window.screenY + (window.innerHeight - height) / 2;

        const popup = window.open(
            authUrl,
            'google-oauth',
            `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
        );

        const handler = (event: MessageEvent) => {
            if (event.data?.type === 'GOOGLE_OAUTH_TOKENS') {
                window.removeEventListener('message', handler);
                resolve(event.data);
            }
        };

        window.addEventListener('message', handler);

        const interval = setInterval(() => {
            if (popup?.closed) {
                clearInterval(interval);
                window.removeEventListener('message', handler);
                reject(new Error('Popup fechado sem concluir a autenticação'));
            }
        }, 500);

        setTimeout(() => {
            clearInterval(interval);
            window.removeEventListener('message', handler);
        }, 120000);
    });
}

function GoogleAccountCard({ tenantId, userId }: { tenantId: string; userId: string; }) {
    const queryClient = useQueryClient();
    const [connecting, setConnecting] = useState(false);
    const [disconnecting, setDisconnecting] = useState(false);

    const { data: integration, isLoading } = useQuery({
        queryKey: ['google-integration', tenantId, userId],
        queryFn: () => getGoogleIntegration(tenantId, userId),
        enabled: !!tenantId && !!userId,
    });

    const isConnected = !!integration?.refresh_token;

    const handleConnect = async () => {
        setConnecting(true);
        try {
            const tokens = await connectGoogleViaHub();

            const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
            const { error } = await supabase
                .from('google_integrations')
                .upsert({
                    tenant_id: tenantId,
                    user_id: userId,
                    google_email: tokens.email,
                    access_token: tokens.access_token,
                    refresh_token: tokens.refresh_token,
                    token_expires_at: expiresAt,
                }, { onConflict: 'tenant_id,user_id' });

            if (error) throw error;

            queryClient.invalidateQueries({ queryKey: ['google-integration'] });
            notifications.show({
                title: 'Google conectado!',
                message: `Conta ${tokens.email} vinculada com sucesso.`,
                color: 'green',
            });
        } catch (err: any) {
            if (err.message !== 'Popup fechado sem concluir a autenticação') {
                notifications.show({ title: 'Erro', message: err.message || 'Erro ao conectar.', color: 'red' });
            }
        } finally {
            setConnecting(false);
        }
    };

    const handleDisconnect = async () => {
        if (!confirm('Desconectar Google? Links Meet e integrações existentes serão interrompidas.')) return;
        setDisconnecting(true);
        try {
            if (integration?.access_token) {
                try {
                    await fetch(`https://oauth2.googleapis.com/revoke?token=${integration.access_token}`, { method: 'POST' });
                } catch { }
            }
            await supabase.from('google_integrations').delete().eq('tenant_id', tenantId).eq('user_id', userId);
            queryClient.invalidateQueries({ queryKey: ['google-integration'] });
            notifications.show({ title: 'Google desconectado', message: 'Conta desvinculada.', color: 'orange' });
        } catch (err: any) {
            notifications.show({ title: 'Erro', message: err.message, color: 'red' });
        } finally { setDisconnecting(false); }
    };

    const handleTogglePref = async (key: string, value: boolean) => {
        if (!integration?.id) return;
        try {
            const newPrefs = { ...integration.preferences, [key]: value };
            const { error } = await supabase.from('google_integrations').update({ preferences: newPrefs }).eq('id', integration.id);
            if (error) throw error;
            queryClient.invalidateQueries({ queryKey: ['google-integration'] });
        } catch (err: any) {
            notifications.show({ title: 'Erro', message: err.message, color: 'red' });
        }
    };

    if (isLoading) return <Skeleton height={120} radius="lg" />;

    return (
        <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" align="center" mb="md">
                <Group gap="md">
                    <ThemeIcon size={48} radius="md" variant="light" color={isConnected ? 'green' : 'gray'}>
                        <GoogleIcon size={24} />
                    </ThemeIcon>
                    <div>
                        <Group gap="xs">
                            <Text fw={700}>Google</Text>
                            {isConnected && <Badge variant="dot" color="green" size="sm">Conectado</Badge>}
                        </Group>
                        {isConnected && integration?.google_email ? (
                            <Text size="sm" c="dimmed">{integration.google_email}</Text>
                        ) : (
                            <Text size="sm" c="dimmed">Calendar, Contacts e Meet</Text>
                        )}
                    </div>
                </Group>
                {isConnected ? (
                    <Button variant="light" color="red" size="sm" onClick={handleDisconnect} loading={disconnecting}>Desconectar</Button>
                ) : (
                    <Button variant="filled" size="sm" onClick={handleConnect} loading={connecting} style={{ background: 'var(--sincla-primary, #ff8609)' }}>Conectar</Button>
                )}
            </Group>

            {isConnected && (
                <>
                    <Divider mb="md" />
                    <Stack gap="sm">
                        <Group justify="space-between">
                            <div>
                                <Text size="sm" fw={500}>📇 Sincronizar Contatos</Text>
                                <Text size="xs" c="dimmed">Importar clientes do Google Contacts</Text>
                            </div>
                            <Switch checked={integration?.preferences?.sync_contacts ?? true} onChange={e => handleTogglePref('sync_contacts', e.currentTarget.checked)} />
                        </Group>
                        <Group justify="space-between">
                            <div>
                                <Text size="sm" fw={500}>📅 Sincronizar Calendário</Text>
                                <Text size="xs" c="dimmed">Integrar eventos com o Sincla Agenda</Text>
                            </div>
                            <Switch checked={integration?.preferences?.sync_calendar ?? true} onChange={e => handleTogglePref('sync_calendar', e.currentTarget.checked)} />
                        </Group>
                        <Group justify="space-between">
                            <div>
                                <Text size="sm" fw={500}>🎥 Reuniões Online Fixas</Text>
                                <Text size="xs" c="dimmed">Gerar link do Meet automaticamente</Text>
                            </div>
                            <Switch checked={integration?.preferences?.auto_meet_link ?? true} onChange={e => handleTogglePref('auto_meet_link', e.currentTarget.checked)} />
                        </Group>
                    </Stack>
                </>
            )}
        </Card>
    );
}

function ComingSoonCard({ name, icon, description }: { name: string; icon: React.ReactNode; description: string; }) {
    return (
        <Card shadow="sm" padding="lg" radius="md" withBorder style={{ opacity: 0.65 }}>
            <Group justify="space-between" align="center">
                <Group gap="md">
                    <ThemeIcon size={48} radius="md" variant="light" color="gray">{icon}</ThemeIcon>
                    <div>
                        <Group gap="xs">
                            <Text fw={700}>{name}</Text>
                            <Badge variant="light" color="gray" size="sm">Em breve</Badge>
                        </Group>
                        <Text size="sm" c="dimmed">{description}</Text>
                    </div>
                </Group>
                <Button variant="light" color="gray" size="sm" disabled>Conectar</Button>
            </Group>
        </Card>
    );
}

export function ConnectedAccountsBlock() {
    const { currentCompany, user } = useAuth();
    if (!currentCompany || !user) return null;

    return (
        <Stack gap="md">
            <div>
                <Title order={4} mb={4}>Contas Vinculadas</Title>
                <Text size="sm" c="dimmed">
                    Conecte suas contas para sincronizar dados em todas as ferramentas da Sincla (Agenda, RH, CRM).
                </Text>
            </div>
            
            <GoogleAccountCard tenantId={currentCompany.id} userId={user.id} />
            <ComingSoonCard name="Microsoft" icon={<MicrosoftIcon size={24} />} description="Outlook Calendar, Contacts e Teams" />
            <ComingSoonCard name="Apple" icon={<IconBrandApple size={24} />} description="iCloud Calendar e Contatos" />
            
            <Alert variant="light" color="blue" icon={<IconAlertCircle size={16} />}>
                <Text size="xs">
                    <strong>Privacidade e Segurança:</strong> A integração via Sincla Hub permite que você autorize o uso em todas as nossas ferramentas de uma só vez, centralizando o controle. Você pode revogar o acesso a qualquer momento.
                </Text>
            </Alert>
        </Stack>
    );
}
