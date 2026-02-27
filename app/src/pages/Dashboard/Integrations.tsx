import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Container, Text, Card, Group, Badge, Stack, Skeleton,
    Table, Switch, ThemeIcon, SimpleGrid,
} from '@mantine/core';
import {
    IconPlugConnected, IconRefresh, IconArrowsExchange,
    IconCheck, IconX,
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

    useEffect(() => {
        if (currentCompany) loadData();
    }, [currentCompany]);

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
