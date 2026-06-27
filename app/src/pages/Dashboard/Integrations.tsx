import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Container, Text, Card, Group, Badge, Stack, Skeleton,
    Table, Switch, ThemeIcon, SimpleGrid, Button, Divider,
} from '@mantine/core';
import {
    IconPlugConnected, IconRefresh, IconArrowsExchange,
    IconCheck, IconX, IconSparkles, IconBolt,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useAuth } from '../../shared/contexts';
import { supabase } from '../../shared/lib/supabase';
import { PageHeader, EmptyState } from '../../components/shared';

// ============================
// Types
// ============================

interface SyncSetting {
    id: string;
    company_id: string;
    product_id: string;
    sync_direction: string;
    sync_contacts: boolean;
    sync_crm: boolean;
    is_active: boolean;
    created_at: string;
    product: { name: string } | null;
}

// ============================
// Helpers
// ============================

const directionLabels: Record<string, string> = {
    bidirectional: 'Bidirecional',
    to_hub: 'Para o Hub',
    from_hub: 'Do Hub',
};

// ============================
// Component
// ============================

export function Integrations() {
    const navigate = useNavigate();
    const { currentCompany } = useAuth();
    const [syncSettings, setSyncSettings] = useState<SyncSetting[]>([]);
    const [loading, setLoading] = useState(true);

    // Motor de IA (gateway ai-generate)
    const [aiEnabled, setAiEnabled] = useState(true);
    const [aiSaving, setAiSaving] = useState(false);
    const [aiTesting, setAiTesting] = useState(false);

    useEffect(() => {
        if (currentCompany) {
            loadData();
            loadAiSettings();
        }
    }, [currentCompany]);

    const loadAiSettings = async () => {
        if (!currentCompany) return;
        try {
            const { data } = await supabase
                .from('tenant_ai_settings')
                .select('ai_enabled')
                .eq('company_id', currentCompany.id)
                .maybeSingle();
            // Sem linha => padrão habilitado
            setAiEnabled(data ? data.ai_enabled !== false : true);
        } catch {
            setAiEnabled(true);
        }
    };

    const toggleAiEnabled = async (value: boolean) => {
        if (!currentCompany) return;
        setAiSaving(true);
        setAiEnabled(value);
        try {
            const { error } = await supabase
                .from('tenant_ai_settings')
                .upsert(
                    { company_id: currentCompany.id, ai_enabled: value, provider: 'sincla' },
                    { onConflict: 'company_id' },
                );
            if (error) throw error;
            notifications.show({ title: 'Salvo', message: 'Preferência de IA atualizada', color: 'green' });
        } catch (error) {
            console.error('Error saving AI settings:', error);
            setAiEnabled(!value);
            notifications.show({ title: 'Erro', message: 'Falha ao salvar preferência de IA', color: 'red' });
        } finally {
            setAiSaving(false);
        }
    };

    const testAiConnection = async () => {
        if (!currentCompany) return;
        setAiTesting(true);
        try {
            const { data, error } = await supabase.functions.invoke('ai-generate', {
                body: {
                    company_id: currentCompany.id,
                    prompt: 'Responda apenas com a palavra: ok',
                    max_tokens: 5,
                    temperature: 0,
                    tier: 'light',
                },
            });
            if (error) throw error;
            if (data?.error) throw new Error(data.error);
            notifications.show({
                title: 'Conexão OK',
                message: `Motor de IA respondeu (${data?.model || 'openai'}).`,
                color: 'green',
            });
        } catch (error: any) {
            console.error('AI test error:', error);
            notifications.show({
                title: 'Falha no teste',
                message: error?.message || 'Não foi possível conectar ao motor de IA.',
                color: 'red',
            });
        } finally {
            setAiTesting(false);
        }
    };

    const loadData = async () => {
        if (!currentCompany) return;
        setLoading(true);
        try {
            const { data } = await supabase
                .from('sync_settings')
                .select(`
                    id, company_id, product_id, sync_direction,
                    sync_contacts, sync_crm, is_active, created_at,
                    product:products!product_id (name)
                `)
                .eq('company_id', currentCompany.id)
                .order('created_at', { ascending: false });

            const mapped = (data || []).map((s: any) => ({
                ...s,
                product: Array.isArray(s.product) ? s.product[0] : s.product,
            }));
            setSyncSettings(mapped);
        } catch (error) {
            console.error('Error loading sync settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleSetting = async (settingId: string, field: string, value: boolean) => {
        try {
            const { error } = await supabase
                .from('sync_settings')
                .update({ [field]: value })
                .eq('id', settingId);

            if (error) throw error;

            notifications.show({
                title: 'Sucesso',
                message: 'Configuração atualizada',
                color: 'green',
            });
            loadData();
        } catch (error) {
            console.error('Error toggling setting:', error);
            notifications.show({
                title: 'Erro',
                message: 'Falha ao atualizar configuração',
                color: 'red',
            });
        }
    };

    if (!currentCompany) {
        return (
            <Container size="xl" py="md">
                <PageHeader
                    title="Integrações"
                    subtitle="Configurações de sincronização de dados"
                    helpContent="As integrações permitem sincronizar dados entre os produtos Sincla e sua empresa."
                />
                <EmptyState
                    icon={<IconPlugConnected size={28} />}
                    title="Nenhuma empresa selecionada"
                    description="Selecione ou crie uma empresa para configurar suas integrações."
                    actionLabel="Ir para Empresas"
                    onAction={() => navigate('/painel/empresas')}
                />
            </Container>
        );
    }

    const activeCount = syncSettings.filter(s => s.is_active).length;

    return (
        <Container size="xl" py="md">
            <Stack gap="lg">
                <PageHeader
                    title="Integrações"
                    subtitle={`Configurações de sincronização de dados para ${currentCompany.name}`}
                    helpContent={
                        <>
                            <Text size="sm">As integrações permitem sincronizar dados entre os produtos Sincla e sua empresa. Aqui você pode:</Text>
                            <Text size="sm" component="ul" ml="md">
                                <li>Ativar/desativar sincronização de contatos</li>
                                <li>Ativar/desativar sincronização do CRM</li>
                                <li>Configurar a direção do sincronismo</li>
                            </Text>
                        </>
                    }
                />

                {/* KPIs */}
                <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="md">
                    <Card withBorder padding="md" radius="md">
                        <Group gap="xs">
                            <ThemeIcon size="md" radius="md" variant="light" color="blue">
                                <IconPlugConnected size={16} />
                            </ThemeIcon>
                            <Text size="xs" c="dimmed">Total Integrações</Text>
                        </Group>
                        <Text size="xl" fw={700} mt="xs">{syncSettings.length}</Text>
                    </Card>
                    <Card withBorder padding="md" radius="md">
                        <Group gap="xs">
                            <ThemeIcon size="md" radius="md" variant="light" color="green">
                                <IconCheck size={16} />
                            </ThemeIcon>
                            <Text size="xs" c="dimmed">Ativas</Text>
                        </Group>
                        <Text size="xl" fw={700} mt="xs" c="green">{activeCount}</Text>
                    </Card>
                    <Card withBorder padding="md" radius="md">
                        <Group gap="xs">
                            <ThemeIcon size="md" radius="md" variant="light" color="violet">
                                <IconArrowsExchange size={16} />
                            </ThemeIcon>
                            <Text size="xs" c="dimmed">Sync Contatos</Text>
                        </Group>
                        <Text size="xl" fw={700} mt="xs">
                            {syncSettings.filter(s => s.sync_contacts).length}
                        </Text>
                    </Card>
                </SimpleGrid>

                {/* Sync Settings Table */}
                {loading ? (
                    <Stack gap="sm">
                        {[1, 2].map(i => <Skeleton key={i} height={55} radius="md" />)}
                    </Stack>
                ) : syncSettings.length === 0 ? (
                    <EmptyState
                        icon={<IconPlugConnected size={28} />}
                        title="Nenhuma integração configurada"
                        description="As integrações são ativadas automaticamente ao assinar um produto. Contrate um produto para começar."
                    />
                ) : (
                    <Card shadow="sm" padding={0} radius="md" withBorder>
                        <Table striped highlightOnHover>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>Produto</Table.Th>
                                    <Table.Th>Direção</Table.Th>
                                    <Table.Th>Sync Contatos</Table.Th>
                                    <Table.Th>Sync CRM</Table.Th>
                                    <Table.Th>Status</Table.Th>
                                    <Table.Th>Ativo</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {syncSettings.map(setting => (
                                    <Table.Tr key={setting.id}>
                                        <Table.Td>
                                            <Group gap="xs">
                                                <IconRefresh size={14} />
                                                <Text size="sm" fw={500}>
                                                    {setting.product?.name || setting.product_id}
                                                </Text>
                                            </Group>
                                        </Table.Td>
                                        <Table.Td>
                                            <Badge variant="light" color="violet" size="sm">
                                                {directionLabels[setting.sync_direction] || setting.sync_direction}
                                            </Badge>
                                        </Table.Td>
                                        <Table.Td>
                                            <Switch
                                                checked={setting.sync_contacts}
                                                onChange={() => toggleSetting(setting.id, 'sync_contacts', !setting.sync_contacts)}
                                                size="sm"
                                            />
                                        </Table.Td>
                                        <Table.Td>
                                            <Switch
                                                checked={setting.sync_crm}
                                                onChange={() => toggleSetting(setting.id, 'sync_crm', !setting.sync_crm)}
                                                size="sm"
                                            />
                                        </Table.Td>
                                        <Table.Td>
                                            <Badge
                                                color={setting.is_active ? 'green' : 'red'}
                                                variant="light"
                                                size="sm"
                                                leftSection={setting.is_active ? <IconCheck size={10} /> : <IconX size={10} />}
                                            >
                                                {setting.is_active ? 'Ativo' : 'Inativo'}
                                            </Badge>
                                        </Table.Td>
                                        <Table.Td>
                                            <Switch
                                                checked={setting.is_active}
                                                onChange={() => toggleSetting(setting.id, 'is_active', !setting.is_active)}
                                                size="sm"
                                            />
                                        </Table.Td>
                                    </Table.Tr>
                                ))}
                            </Table.Tbody>
                        </Table>
                    </Card>
                )}

                {/* Motor de IA */}
                <Card shadow="sm" padding="lg" radius="md" withBorder>
                    <Group justify="space-between" align="flex-start" wrap="nowrap">
                        <Group gap="md" align="flex-start" wrap="nowrap">
                            <ThemeIcon size={40} radius="md" variant="light" color="violet">
                                <IconSparkles size={20} />
                            </ThemeIcon>
                            <div>
                                <Group gap="xs">
                                    <Text fw={600}>Motor de IA</Text>
                                    <Badge variant="light" color="violet" size="sm" leftSection={<IconBolt size={10} />}>
                                        Sincla · OpenAI
                                    </Badge>
                                </Group>
                                <Text size="sm" c="dimmed" mt={4}>
                                    Usado para gerar insights inteligentes sobre seus relatórios.
                                    Hoje roda no motor da Sincla (OpenAI). Ative ou desative quando quiser.
                                </Text>
                            </div>
                        </Group>
                        <Switch
                            checked={aiEnabled}
                            disabled={aiSaving}
                            onChange={(e) => toggleAiEnabled(e.currentTarget.checked)}
                            size="md"
                        />
                    </Group>

                    <Group mt="md">
                        <Button
                            variant="light"
                            color="violet"
                            size="xs"
                            loading={aiTesting}
                            disabled={!aiEnabled}
                            leftSection={<IconBolt size={14} />}
                            onClick={testAiConnection}
                        >
                            Testar conexão
                        </Button>
                    </Group>

                    <Divider my="md" />

                    <Group gap="md" align="flex-start" wrap="nowrap">
                        <ThemeIcon size={40} radius="md" variant="light" color="gray">
                            <IconSparkles size={20} />
                        </ThemeIcon>
                        <div>
                            <Group gap="xs">
                                <Text fw={500} c="dimmed">Traga sua própria chave (BYOK)</Text>
                                <Badge variant="light" color="gray" size="sm">Em breve</Badge>
                            </Group>
                            <Text size="sm" c="dimmed" mt={4}>
                                Em breve você poderá conectar sua própria conta de OpenAI, Google Gemini
                                ou Anthropic (Claude) para usar o seu próprio motor de IA.
                            </Text>
                        </div>
                    </Group>
                </Card>

                {/* Coming Soon */}
                <Card shadow="sm" padding="lg" radius="md" withBorder>
                    <Group gap="md">
                        <ThemeIcon size={40} radius="md" variant="light" color="blue">
                            <IconPlugConnected size={20} />
                        </ThemeIcon>
                        <div>
                            <Text fw={500}>Mais integrações em breve</Text>
                            <Text size="sm" c="dimmed">
                                Webhooks, API Keys e integrações com ferramentas externas estão sendo desenvolvidas.
                            </Text>
                        </div>
                    </Group>
                </Card>
            </Stack>
        </Container>
    );
}
