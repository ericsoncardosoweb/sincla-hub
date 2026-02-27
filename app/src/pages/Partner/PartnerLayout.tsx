import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Container, Title, Tabs, Group, Text, ThemeIcon, Box, Skeleton } from '@mantine/core';
import { IconHeartHandshake, IconDashboard, IconUsers, IconCash, IconSettings } from '@tabler/icons-react';
import { useAuth } from '../../shared/contexts';
import { supabase } from '../../shared/lib/supabase';

export function PartnerLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const { subscriber } = useAuth();
    const [isPartner, setIsPartner] = useState<boolean | null>(null);

    useEffect(() => {
        if (!subscriber) return;
        const checkPartner = async () => {
            const { data, error } = await supabase.from('partners').select('id, status').eq('user_id', subscriber.id).single();
            if (error || !data) setIsPartner(false);
            else setIsPartner(true);
        };
        checkPartner();
    }, [subscriber]);

    // Identifica aba ativa com base na URL
    const pathnameArray = location.pathname.split('/').filter(Boolean);
    const lastSegment = pathnameArray[pathnameArray.length - 1];
    const currentTab = lastSegment === 'parceiro' ? 'dashboard' : lastSegment;

    return (
        <Container size="xl" py="lg">
            <Group mb="xl" align="center" gap="sm">
                <ThemeIcon size={48} radius="md" variant="light" color="green">
                    <IconHeartHandshake size={28} />
                </ThemeIcon>
                <div>
                    <Title order={2}>Programa de Parceiros</Title>
                    <Text c="dimmed">Gerencie suas indicações, comissões e configurações da afiliação.</Text>
                </div>
            </Group>

            {isPartner === null ? (
                <Skeleton height={200} radius="md" />
            ) : isPartner === false && currentTab === 'dashboard' ? (
                // Se ainda não for parceiro, e estiver no index (painel de ativação principal), exibe sem abas.
                <Outlet />
            ) : (
                <>
                    <Tabs
                        value={currentTab}
                        onChange={(value) => navigate(value === 'dashboard' ? '' : `/painel/parceiro/${value}`)}
                        mb="xl"
                        variant="outline"
                        radius="md"
                    >
                        <Tabs.List>
                            <Tabs.Tab value="dashboard" leftSection={<IconDashboard size={16} />}>
                                Visão Geral
                            </Tabs.Tab>
                            <Tabs.Tab value="clientes" leftSection={<IconUsers size={16} />}>
                                Referências ativas
                            </Tabs.Tab>
                            <Tabs.Tab value="saques" leftSection={<IconCash size={16} />}>
                                Meus Saques
                            </Tabs.Tab>
                            <Tabs.Tab value="configuracoes" leftSection={<IconSettings size={16} />}>
                                Configurações
                            </Tabs.Tab>
                        </Tabs.List>
                    </Tabs>

                    <Box style={{ minHeight: 400 }}>
                        <Outlet />
                    </Box>
                </>
            )}
        </Container>
    );
}
