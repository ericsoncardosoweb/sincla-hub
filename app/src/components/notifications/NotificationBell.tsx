/**
 * NotificationBell — Sincla Hub
 * Componente de sino de notificações com Realtime
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import {
    ActionIcon, Indicator, Popover, Stack, Group, Text, Box, Button,
    ScrollArea, Divider, Loader, UnstyledButton,
} from '@mantine/core';
import {
    IconBell, IconChecks, IconCreditCard,
    IconAlertTriangle, IconRocket, IconShieldCheck,
    IconInfoCircle, IconExternalLink,
} from '@tabler/icons-react';
import { supabase } from '../../shared/lib/supabase';
import { useAuth } from '../../shared/contexts';
import {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    type Notification,
} from '../../shared/services/notificationService';

const categoryIcons: Record<string, any> = {
    system: IconInfoCircle,
    billing: IconCreditCard,
    product: IconRocket,
    alert: IconAlertTriangle,
    welcome: IconRocket,
    security: IconShieldCheck,
};

function timeAgo(dateStr: string): string {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Agora';
    if (diffMin < 60) return `${diffMin}min`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h`;
    const diffDays = Math.floor(diffHr / 24);
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export function NotificationBell() {
    const { user } = useAuth();
    const [opened, setOpened] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const channelRef = useRef<any>(null);

    const loadData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const [notifs, count] = await Promise.all([
                getNotifications(30),
                getUnreadCount(),
            ]);
            setNotifications(notifs);
            setUnreadCount(count);
        } catch (err) {
            console.error('[NotificationBell] Erro ao carregar:', err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    // Initial load
    useEffect(() => {
        loadData();
    }, [loadData]);

    // Realtime subscription
    useEffect(() => {
        if (!user) return;

        channelRef.current = supabase
            .channel('notifications-realtime')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    const newNotif = payload.new as Notification;
                    setNotifications(prev => [newNotif, ...prev]);
                    setUnreadCount(prev => prev + 1);
                }
            )
            .subscribe();

        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
            }
        };
    }, [user]);

    const handleMarkRead = async (notif: Notification) => {
        if (notif.is_read) return;
        await markAsRead(notif.id);
        setNotifications(prev =>
            prev.map(n => n.id === notif.id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
    };

    const handleMarkAllRead = async () => {
        await markAllAsRead();
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() })));
        setUnreadCount(0);
    };

    const handleNotifClick = (notif: Notification) => {
        handleMarkRead(notif);
        if (notif.action_url) {
            if (notif.action_url.startsWith('http')) {
                window.open(notif.action_url, '_blank');
            } else {
                window.location.href = notif.action_url;
            }
        }
    };

    return (
        <Popover
            opened={opened}
            onChange={setOpened}
            width={380}
            position="bottom-end"
            shadow="lg"
            radius="md"
            offset={8}
        >
            <Popover.Target>
                <Indicator
                    label={unreadCount > 99 ? '99+' : unreadCount}
                    size={unreadCount > 0 ? 18 : 0}
                    color="red"
                    offset={4}
                    disabled={unreadCount === 0}
                    processing={unreadCount > 0}
                >
                    <ActionIcon
                        variant="subtle"
                        size="lg"
                        radius="md"
                        color="gray"
                        onClick={() => setOpened(!opened)}
                    >
                        <IconBell size={20} />
                    </ActionIcon>
                </Indicator>
            </Popover.Target>

            <Popover.Dropdown p={0} style={{ overflow: 'hidden' }}>
                {/* Header */}
                <Group justify="space-between" p="sm" pb={8}>
                    <Text fw={600} size="sm">Notificações</Text>
                    {unreadCount > 0 && (
                        <Button
                            variant="subtle"
                            size="compact-xs"
                            color="blue"
                            leftSection={<IconChecks size={14} />}
                            onClick={handleMarkAllRead}
                        >
                            Marcar todas como lidas
                        </Button>
                    )}
                </Group>
                <Divider />

                {/* List */}
                <ScrollArea.Autosize mah={400} type="scroll">
                    {loading && notifications.length === 0 ? (
                        <Box p="xl" ta="center">
                            <Loader size="sm" />
                        </Box>
                    ) : notifications.length === 0 ? (
                        <Box p="xl" ta="center">
                            <IconBell size={32} color="var(--mantine-color-gray-4)" style={{ marginBottom: 8 }} />
                            <Text size="sm" c="dimmed">Nenhuma notificação</Text>
                        </Box>
                    ) : (
                        <Stack gap={0}>
                            {notifications.map(notif => {
                                const Icon = categoryIcons[notif.category] || IconInfoCircle;
                                return (
                                    <UnstyledButton
                                        key={notif.id}
                                        onClick={() => handleNotifClick(notif)}
                                        style={{
                                            padding: '10px 14px',
                                            borderBottom: '1px solid var(--mantine-color-gray-1)',
                                            background: notif.is_read ? 'transparent' : 'var(--mantine-color-blue-0)',
                                            transition: 'background 0.15s',
                                        }}
                                        onMouseEnter={(e) => {
                                            (e.currentTarget as HTMLElement).style.background = 'var(--mantine-color-gray-0)';
                                        }}
                                        onMouseLeave={(e) => {
                                            (e.currentTarget as HTMLElement).style.background = notif.is_read ? 'transparent' : 'var(--mantine-color-blue-0)';
                                        }}
                                    >
                                        <Group gap={10} wrap="nowrap" align="flex-start">
                                            <Box
                                                style={{
                                                    width: 32, height: 32, borderRadius: 8,
                                                    background: `${notif.color || '#228be6'}15`,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    flexShrink: 0, marginTop: 2,
                                                }}
                                            >
                                                <Icon size={16} color={notif.color || '#228be6'} />
                                            </Box>
                                            <Box style={{ flex: 1, minWidth: 0 }}>
                                                <Group gap={6} justify="space-between" wrap="nowrap">
                                                    <Text size="xs" fw={notif.is_read ? 400 : 600} truncate c="dark">
                                                        {notif.title}
                                                    </Text>
                                                    <Text size="10px" c="dimmed" style={{ flexShrink: 0 }}>
                                                        {timeAgo(notif.created_at)}
                                                    </Text>
                                                </Group>
                                                <Text size="xs" c="dimmed" lineClamp={2} mt={2}>
                                                    {notif.message}
                                                </Text>
                                                {notif.action_url && (
                                                    <Group gap={4} mt={4}>
                                                        <Text size="10px" c="blue" fw={500}>
                                                            Ver detalhes
                                                        </Text>
                                                        <IconExternalLink size={10} color="var(--mantine-color-blue-6)" />
                                                    </Group>
                                                )}
                                            </Box>
                                            {!notif.is_read && (
                                                <Box
                                                    style={{
                                                        width: 8, height: 8, borderRadius: '50%',
                                                        background: 'var(--mantine-color-blue-6)',
                                                        flexShrink: 0, marginTop: 6,
                                                    }}
                                                />
                                            )}
                                        </Group>
                                    </UnstyledButton>
                                );
                            })}
                        </Stack>
                    )}
                </ScrollArea.Autosize>
            </Popover.Dropdown>
        </Popover>
    );
}
