import { useEffect, useState } from 'react';
import {
    Title, Text, SimpleGrid, Card, Group, Badge, Button, Stack,
    ThemeIcon, CopyButton, ActionIcon, Tooltip, Skeleton, Paper, Divider,
    Alert, TextInput, Modal,
} from '@mantine/core';
import {
    IconHeartHandshake, IconUsers, IconCash, IconCalendar, IconCopy, IconCheck,
    IconLink, IconArrowRight, IconTrendingUp, IconClock,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../shared/contexts';
import { supabase } from '../../shared/lib/supabase';

interface PartnerStats {
    total_clients: number;
    active_clients: number;
    eligible_clients: number;
    total_revenue: number;
    available_balance: number;
    total_withdrawn: number;
    pending_withdrawal: number;
}

interface PartnerData {
    id: string;
    affiliate_code: string;
    commission_percent: number;
    status: string;
    pix_key: string | null;
    pix_key_type: string | null;
    accepted_terms_at: string | null;
}

export function PartnerDashboard() {
    const { subscriber } = useAuth();
    const navigate = useNavigate();
    const [partner, setPartner] = useState<PartnerData | null>(null);
    const [stats, setStats] = useState<PartnerStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [activating, setActivating] = useState(false);
    const [showActivateModal, setShowActivateModal] = useState(false);

    useEffect(() => {
        loadPartnerData();
    }, [subscriber]);

    const loadPartnerData = async () => {
        if (!subscriber) return;
        setLoading(true);
        try {
            const { data: partnerData } = await supabase
                .from('partners')
                .select('*')
                .eq('user_id', subscriber.id)
                .single();

            if (partnerData) {
                setPartner(partnerData);
                // Load stats
                const { data: statsData } = await supabase
                    .rpc('get_partner_stats', { p_partner_id: partnerData.id });
                if (statsData) setStats(statsData);
            }
        } catch (error) {
            console.error('Error loading partner data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleActivate = async () => {
        if (!subscriber) return;
        setActivating(true);
        try {
            // Generate affiliate code
            const { data: code } = await supabase
                .rpc('generate_affiliate_code', { partner_name: subscriber.name || subscriber.email || 'SINC' });

            const { data: newPartner, error } = await supabase
                .from('partners')
                .insert({
                    user_id: subscriber.id,
                    affiliate_code: code,
                    commission_percent: 10.00,
                    status: 'active',
                    type: 'consultant',
                    accepted_terms_at: new Date().toISOString(),
                })
                .select()
                .single();

            if (error) throw error;
            setPartner(newPartner);
            setShowActivateModal(false);
            loadPartnerData();
        } catch (error) {
            console.error('Error activating partner:', error);
        } finally {
            setActivating(false);
        }
    };

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

    const affiliateLink = partner?.affiliate_code
        ? `${window.location.origin}/cadastro?ref=${partner.affiliate_code}`
        : '';

    // Not a partner yet — show activation card
    if (!loading && !partner) {
        return (
            <Stack gap="lg">

                <Card shadow="sm" padding="xl" radius="md" withBorder>
                    <Stack align="center" gap="lg" py="xl">
                        <ThemeIcon size={80} radius="xl" variant="light" color="green">
                            <IconHeartHandshake size={40} />
                        </ThemeIcon>
                        <div style={{ textAlign: 'center' }}>
                            <Title order={3}>Torne-se um Parceiro Sincla</Title>
                            <Text c="dimmed" size="lg" mt="xs" maw={500}>
                                Ganhe <strong>10% de comissão recorrente</strong> sobre cada assinatura
                                ativa trazida pelo seu link de afiliado.
                            </Text>
                        </div>

                        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg" w="100%">
                            <Card padding="md" withBorder>
                                <Group gap="sm">
                                    <ThemeIcon variant="light" color="blue">
                                        <IconLink size={18} />
                                    </ThemeIcon>
                                    <div>
                                        <Text fw={600} size="sm">1. Compartilhe</Text>
                                        <Text size="xs" c="dimmed">Envie seu link de afiliado</Text>
                                    </div>
                                </Group>
                            </Card>
                            <Card padding="md" withBorder>
                                <Group gap="sm">
                                    <ThemeIcon variant="light" color="green">
                                        <IconUsers size={18} />
                                    </ThemeIcon>
                                    <div>
                                        <Text fw={600} size="sm">2. Clientes assinam</Text>
                                        <Text size="xs" c="dimmed">Eles contratam ferramentas</Text>
                                    </div>
                                </Group>
                            </Card>
                            <Card padding="md" withBorder>
                                <Group gap="sm">
                                    <ThemeIcon variant="light" color="orange">
                                        <IconCash size={18} />
                                    </ThemeIcon>
                                    <div>
                                        <Text fw={600} size="sm">3. Receba comissão</Text>
                                        <Text size="xs" c="dimmed">10% via PIX todo dia 25</Text>
                                    </div>
                                </Group>
                            </Card>
                        </SimpleGrid>

                        <Button size="lg" color="green" onClick={() => setShowActivateModal(true)}>
                            Ativar Conta de Parceiro
                        </Button>
                    </Stack>
                </Card>

                {/* Activation Modal */}
                <Modal
                    opened={showActivateModal}
                    onClose={() => setShowActivateModal(false)}
                    title="Ativar Programa de Parceiros"
                    centered
                >
                    <Stack gap="md">
                        <Alert color="blue" variant="light">
                            Ao ativar, você concorda com os termos do programa de parceiros Sincla
                            e receberá um link exclusivo de afiliado.
                        </Alert>
                        <Text size="sm">
                            <strong>Comissão:</strong> 10% sobre cada assinatura ativa trazida pelo seu link.
                        </Text>
                        <Text size="sm">
                            <strong>Elegibilidade:</strong> Somente assinaturas ativas há mais de 30 dias.
                        </Text>
                        <Text size="sm">
                            <strong>Saque:</strong> Todo dia 25 de cada mês, via PIX.
                        </Text>
                        <Button
                            fullWidth
                            color="green"
                            onClick={handleActivate}
                            loading={activating}
                        >
                            Concordo e Quero Ativar
                        </Button>
                    </Stack>
                </Modal>
            </Stack>
        );
    }

    // Partner dashboard
    return (
        <Stack gap="lg">
            <Group justify="space-between" align="center">
                <Text c="dimmed">
                    Comissão base: <strong>{partner?.commission_percent}%</strong> • Seu Código: <strong>{partner?.affiliate_code}</strong>
                </Text>
                <Badge color="green" size="lg" variant="light">Ativo</Badge>
            </Group>

            {/* Affiliate Link */}
            <Paper shadow="xs" p="md" radius="md" withBorder>
                <Text fw={600} size="sm" mb="xs">Seu Link de Afiliado</Text>
                <Group gap="xs">
                    <TextInput
                        value={affiliateLink}
                        readOnly
                        style={{ flex: 1 }}
                        styles={{ input: { fontFamily: 'monospace', fontSize: '13px' } }}
                    />
                    <CopyButton value={affiliateLink} timeout={2000}>
                        {({ copied, copy }) => (
                            <Tooltip label={copied ? 'Copiado!' : 'Copiar link'}>
                                <ActionIcon color={copied ? 'teal' : 'blue'} variant="filled" size="lg" onClick={copy}>
                                    {copied ? <IconCheck size={18} /> : <IconCopy size={18} />}
                                </ActionIcon>
                            </Tooltip>
                        )}
                    </CopyButton>
                </Group>
            </Paper>

            {/* Stats Cards */}
            {loading ? (
                <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} height={100} radius="md" />)}
                </SimpleGrid>
            ) : (
                <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
                    <Card shadow="sm" padding="md" radius="md" withBorder>
                        <Group gap="xs" mb="xs">
                            <ThemeIcon variant="light" color="blue" size="sm">
                                <IconUsers size={14} />
                            </ThemeIcon>
                            <Text size="xs" c="dimmed" tt="uppercase">Clientes Ativos</Text>
                        </Group>
                        <Text size="xl" fw={700}>{stats?.active_clients || 0}</Text>
                        <Text size="xs" c="dimmed">{stats?.eligible_clients || 0} elegíveis</Text>
                    </Card>

                    <Card shadow="sm" padding="md" radius="md" withBorder>
                        <Group gap="xs" mb="xs">
                            <ThemeIcon variant="light" color="green" size="sm">
                                <IconTrendingUp size={14} />
                            </ThemeIcon>
                            <Text size="xs" c="dimmed" tt="uppercase">Receita Total</Text>
                        </Group>
                        <Text size="xl" fw={700}>{formatCurrency(stats?.total_revenue || 0)}</Text>
                    </Card>

                    <Card shadow="sm" padding="md" radius="md" withBorder>
                        <Group gap="xs" mb="xs">
                            <ThemeIcon variant="light" color="orange" size="sm">
                                <IconCash size={14} />
                            </ThemeIcon>
                            <Text size="xs" c="dimmed" tt="uppercase">Saldo Disponível</Text>
                        </Group>
                        <Text size="xl" fw={700} c="green">{formatCurrency(stats?.available_balance || 0)}</Text>
                        {(stats?.pending_withdrawal || 0) > 0 && (
                            <Text size="xs" c="orange">{formatCurrency(stats!.pending_withdrawal)} pendente</Text>
                        )}
                    </Card>

                    <Card shadow="sm" padding="md" radius="md" withBorder>
                        <Group gap="xs" mb="xs">
                            <ThemeIcon variant="light" color="violet" size="sm">
                                <IconCalendar size={14} />
                            </ThemeIcon>
                            <Text size="xs" c="dimmed" tt="uppercase">Próximo Saque</Text>
                        </Group>
                        <Text size="xl" fw={700}>Dia 25</Text>
                        <Text size="xs" c="dimmed">
                            {new Date().getDate() === 25 ? '🟢 Hoje!' : `Faltam ${((25 - new Date().getDate() + 31) % 31) || 31} dias`}
                        </Text>
                    </Card>
                </SimpleGrid>
            )}

            {/* Quick Actions */}
            <Divider />
            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
                <Button
                    variant="light"
                    leftSection={<IconUsers size={18} />}
                    rightSection={<IconArrowRight size={14} />}
                    onClick={() => navigate('/painel/parceiro/clientes')}
                    fullWidth
                >
                    Ver Clientes
                </Button>
                <Button
                    variant="light"
                    color="green"
                    leftSection={<IconCash size={18} />}
                    rightSection={<IconArrowRight size={14} />}
                    onClick={() => navigate('/painel/parceiro/saques')}
                    fullWidth
                >
                    Saques
                </Button>
                <Button
                    variant="light"
                    color="gray"
                    leftSection={<IconClock size={18} />}
                    rightSection={<IconArrowRight size={14} />}
                    onClick={() => navigate('/painel/parceiro/configuracoes')}
                    fullWidth
                >
                    Configurações PIX
                </Button>
            </SimpleGrid>

            {/* No PIX warning */}
            {partner && !partner.pix_key && (
                <Alert color="orange" variant="light" title="Configure sua chave PIX">
                    Para solicitar saques, você precisa cadastrar uma chave PIX nas configurações.
                </Alert>
            )}
        </Stack>
    );
}
