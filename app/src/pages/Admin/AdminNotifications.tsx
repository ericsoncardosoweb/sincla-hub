/**
 * AdminNotifications — Sincla Hub
 * Gestão de comunicados em massa e templates de notificação
 */
import { useState, useEffect, useCallback } from 'react';
import {
    Container, Title, Text, Group, Stack, Badge, Button,
    ActionIcon, Tabs, Modal, TextInput, Switch,
    Loader, Center, SimpleGrid, Box, Checkbox,
    Tooltip, Paper, Divider, Alert, FileInput, Image,
    Textarea, MultiSelect, ScrollArea,
} from '@mantine/core';
import { RichTextEditor } from '@mantine/tiptap';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TLink from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import Color from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import {
    IconBell, IconMail, IconBrandWhatsapp, IconDeviceMobile,
    IconEdit, IconSend, IconPlus, IconInfoCircle,
    IconUsers, IconTrash, IconSparkles, IconUpload, IconEye,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { supabase } from '../../shared/lib/supabase';
import { sendNotification } from '../../shared/services/notificationService';

// =============================================
// Types
// =============================================
interface NotificationTemplate {
    id: string;
    event_key: string;
    name: string;
    description: string | null;
    email_subject: string;
    email_body: string;
    email_enabled: boolean;
    whatsapp_message: string;
    whatsapp_enabled: boolean;
    in_app_title: string;
    in_app_message: string;
    in_app_icon: string;
    in_app_color: string;
    in_app_enabled: boolean;
    category: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

interface Broadcast {
    id: string;
    title: string;
    message: string;
    whatsapp_message: string | null;
    image_url: string | null;
    channels: string[];
    target_audience: string;
    status: string;
    sent_at: string | null;
    sent_count: number;
    failed_count: number;
    created_by: string;
    created_at: string;
    action_url: string | null;
    action_label: string | null;
}

interface ToolProduct {
    id: string;
    name: string;
    is_active: boolean;
}

// =============================================
// Utils: HTML → WhatsApp Formatting
// =============================================
function htmlToWhatsApp(html: string): string {
    let text = html;
    // Bold
    text = text.replace(/<strong>(.*?)<\/strong>/gi, '*$1*');
    text = text.replace(/<b>(.*?)<\/b>/gi, '*$1*');
    // Italic
    text = text.replace(/<em>(.*?)<\/em>/gi, '_$1_');
    text = text.replace(/<i>(.*?)<\/i>/gi, '_$1_');
    // Strikethrough
    text = text.replace(/<s>(.*?)<\/s>/gi, '~$1~');
    text = text.replace(/<del>(.*?)<\/del>/gi, '~$1~');
    // Underline — no WhatsApp equivalent, keep text
    text = text.replace(/<u>(.*?)<\/u>/gi, '$1');
    // Lists
    text = text.replace(/<li>(.*?)<\/li>/gi, '• $1\n');
    text = text.replace(/<\/?(ul|ol)>/gi, '');
    // Line breaks & paragraphs
    text = text.replace(/<br\s*\/?>/gi, '\n');
    text = text.replace(/<\/p><p>/gi, '\n\n');
    text = text.replace(/<p>/gi, '');
    text = text.replace(/<\/p>/gi, '\n');
    // Headers → bold
    text = text.replace(/<h[1-6]>(.*?)<\/h[1-6]>/gi, '*$1*\n');
    // Links
    text = text.replace(/<a[^>]*href="(.*?)"[^>]*>(.*?)<\/a>/gi, '$2 ($1)');
    // Remove remaining tags
    text = text.replace(/<[^>]+>/g, '');
    // Decode HTML entities
    text = text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"');
    // Clean up extra whitespace
    text = text.replace(/\n{3,}/g, '\n\n').trim();
    return text;
}

// =============================================
// Upload via Bunny CDN
// =============================================
async function uploadBroadcastImage(file: File): Promise<string | null> {
    try {
        const formData = new FormData();
        formData.append('file', file);
        const timestamp = Date.now();
        const ext = file.name.split('.').pop() || 'png';
        formData.append('path', `comunicados/${timestamp}.${ext}`);

        const { data: { session } } = await supabase.auth.getSession();
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

        const response = await fetch(`${supabaseUrl}/functions/v1/upload-asset`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body: formData,
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        return data.url;
    } catch (err: any) {
        console.error('Erro no upload:', err);
        notifications.show({ title: 'Erro no upload', message: err.message, color: 'red' });
        return null;
    }
}

// =============================================
// Component
// =============================================
export function AdminNotifications() {
    const [activeTab, setActiveTab] = useState<string | null>('broadcasts');
    const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
    const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
    const [toolProducts, setToolProducts] = useState<ToolProduct[]>([]);
    const [loading, setLoading] = useState(true);

    // Template Edit Modal
    const [editTemplate, setEditTemplate] = useState<NotificationTemplate | null>(null);
    const [editOpen, setEditOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    // Broadcast Modal
    const [broadcastOpen, setBroadcastOpen] = useState(false);
    const [editingBroadcast, setEditingBroadcast] = useState<Broadcast | null>(null);
    const [broadcastForm, setBroadcastForm] = useState({
        title: '',
        channels: ['email', 'in_app'] as string[],
        target_audience: [] as string[],
        action_url: '',
        action_label: '',
    });
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [broadcastSaving, setBroadcastSaving] = useState(false);
    const [aiOptimizing, setAiOptimizing] = useState(false);

    // Preview Modal
    const [previewBroadcast, setPreviewBroadcast] = useState<Broadcast | null>(null);
    const [previewOpen, setPreviewOpen] = useState(false);

    // =============================================
    // RichText Editor
    // =============================================
    const editor = useEditor({
        extensions: [
            StarterKit,
            Underline,
            TLink.configure({ openOnClick: false }),
            Placeholder.configure({ placeholder: 'Escreva o conteúdo do comunicado...' }),
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
            Highlight,
            Color,
            TextStyle,
        ],
        content: '',
    });

    // =============================================
    // Load Data
    // =============================================
    const loadTemplates = useCallback(async () => {
        const { data } = await supabase
            .from('notification_templates')
            .select('*')
            .order('created_at', { ascending: true });
        setTemplates(data || []);
    }, []);

    const loadBroadcasts = useCallback(async () => {
        const { data } = await supabase
            .from('notification_broadcasts')
            .select('*')
            .order('created_at', { ascending: false });
        setBroadcasts(data || []);
    }, []);

    const loadToolProducts = useCallback(async () => {
        try {
            const { data } = await supabase
                .from('products')
                .select('id, name, is_active')
                .order('name');
            setToolProducts(data || []);
        } catch {
            setToolProducts([]);
        }
    }, []);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            await Promise.all([loadTemplates(), loadBroadcasts(), loadToolProducts()]);
            setLoading(false);
        };
        load();
    }, [loadTemplates, loadBroadcasts, loadToolProducts]);

    // =============================================
    // Template Actions
    // =============================================
    const handleEditTemplate = (t: NotificationTemplate) => {
        setEditTemplate({ ...t });
        setEditOpen(true);
    };

    const handleSaveTemplate = async () => {
        if (!editTemplate) return;
        setSaving(true);
        try {
            const { error } = await supabase
                .from('notification_templates')
                .update({
                    email_subject: editTemplate.email_subject,
                    email_body: editTemplate.email_body,
                    email_enabled: editTemplate.email_enabled,
                    whatsapp_message: editTemplate.whatsapp_message,
                    whatsapp_enabled: editTemplate.whatsapp_enabled,
                    in_app_title: editTemplate.in_app_title,
                    in_app_message: editTemplate.in_app_message,
                    in_app_icon: editTemplate.in_app_icon,
                    in_app_color: editTemplate.in_app_color,
                    in_app_enabled: editTemplate.in_app_enabled,
                    is_active: editTemplate.is_active,
                })
                .eq('id', editTemplate.id);

            if (error) throw error;
            notifications.show({ title: 'Salvo!', message: 'Template atualizado.', color: 'green' });
            setEditOpen(false);
            loadTemplates();
        } catch (err: any) {
            notifications.show({ title: 'Erro', message: err.message, color: 'red' });
        } finally {
            setSaving(false);
        }
    };

    const handleToggleTemplate = async (t: NotificationTemplate) => {
        await supabase
            .from('notification_templates')
            .update({ is_active: !t.is_active })
            .eq('id', t.id);
        loadTemplates();
    };

    // =============================================
    // Broadcast Actions
    // =============================================
    const openBroadcastModal = (broadcast?: Broadcast) => {
        if (broadcast) {
            setEditingBroadcast(broadcast);
            setBroadcastForm({
                title: broadcast.title,
                channels: broadcast.channels,
                target_audience: broadcast.target_audience === 'all' ? [] : broadcast.target_audience.split(','),
                action_url: broadcast.action_url || '',
                action_label: broadcast.action_label || '',
            });
            setImagePreview(broadcast.image_url || null);
            editor?.commands.setContent(broadcast.message || '');
        } else {
            setEditingBroadcast(null);
            setBroadcastForm({
                title: '', channels: ['email', 'in_app'],
                target_audience: [], action_url: '', action_label: '',
            });
            setImagePreview(null);
            setImageFile(null);
            editor?.commands.setContent('');
        }
        setBroadcastOpen(true);
    };

    const handleSaveBroadcast = async (sendNow: boolean) => {
        const htmlContent = editor?.getHTML() || '';
        if (!broadcastForm.title || !htmlContent || htmlContent === '<p></p>') {
            notifications.show({ title: 'Erro', message: 'Título e mensagem são obrigatórios.', color: 'red' });
            return;
        }
        setBroadcastSaving(true);
        try {
            let imageUrl = imagePreview;

            // Upload new image if selected
            if (imageFile) {
                imageUrl = await uploadBroadcastImage(imageFile);
                if (!imageUrl) {
                    setBroadcastSaving(false);
                    return;
                }
            }

            // Auto-generate WhatsApp version from HTML
            const whatsappMessage = htmlToWhatsApp(htmlContent);

            const { data: { user } } = await supabase.auth.getUser();
            const targetAudience = broadcastForm.target_audience.length > 0
                ? broadcastForm.target_audience.join(',')
                : 'all';

            const payload = {
                title: broadcastForm.title,
                message: htmlContent,
                whatsapp_message: whatsappMessage,
                image_url: imageUrl || null,
                channels: broadcastForm.channels,
                target_audience: targetAudience,
                status: sendNow ? 'sending' : 'draft',
                action_url: broadcastForm.action_url || null,
                action_label: broadcastForm.action_label || null,
                created_by: user?.id,
            };

            let broadcastId: string;

            if (editingBroadcast) {
                const { error } = await supabase
                    .from('notification_broadcasts')
                    .update(payload)
                    .eq('id', editingBroadcast.id);
                if (error) throw error;
                broadcastId = editingBroadcast.id;
            } else {
                const { data, error } = await supabase
                    .from('notification_broadcasts')
                    .insert(payload)
                    .select('id')
                    .single();
                if (error) throw error;
                broadcastId = data.id;
            }

            if (sendNow) {
                await executeBroadcast(broadcastId, { ...payload, id: broadcastId } as any);
            }

            notifications.show({
                title: sendNow ? 'Enviando!' : 'Salvo!',
                message: sendNow ? 'Comunicado está sendo enviado.' : 'Comunicado salvo como rascunho.',
                color: 'green',
            });
            setBroadcastOpen(false);
            setImageFile(null);
            loadBroadcasts();
        } catch (err: any) {
            notifications.show({ title: 'Erro', message: err.message, color: 'red' });
        } finally {
            setBroadcastSaving(false);
        }
    };

    // Helper: delay aleatório para rate limiting do WhatsApp
    const randomDelay = (minMs: number, maxMs: number) =>
        new Promise(resolve => setTimeout(resolve, minMs + Math.random() * (maxMs - minMs)));

    const executeBroadcast = async (broadcastId: string, broadcast: Broadcast) => {
        try {
            const { data: subscribers } = await supabase
                .from('subscribers')
                .select('user_id, email')
                .eq('status', 'active');

            let sentCount = 0;
            let failedCount = 0;
            let whatsappCount = 0;

            for (const sub of subscribers || []) {
                try {
                    if (broadcast.channels.includes('in_app')) {
                        await sendNotification({
                            channel: 'in_app',
                            to: sub.user_id,
                            subject: broadcast.title,
                            message: broadcast.title,
                            category: 'system',
                            actionUrl: broadcast.action_url || undefined,
                        });
                    }
                    if (broadcast.channels.includes('email') && sub.email) {
                        await sendNotification({
                            channel: 'email',
                            to: sub.email,
                            subject: broadcast.title,
                            message: broadcast.message,
                            html: broadcast.message,
                            template: 'custom',
                            data: {
                                action_url: broadcast.action_url || 'https://app.sincla.com.br/painel',
                                action_label: broadcast.action_label || 'Acessar',
                            },
                        });
                    }
                    if (broadcast.channels.includes('whatsapp') && sub.email) {
                        // Rate limiting: max 10 por minuto, delay aleatório 6-12s
                        if (whatsappCount > 0 && whatsappCount % 10 === 0) {
                            await randomDelay(60000, 65000); // pausa de 1min a cada 10
                        } else if (whatsappCount > 0) {
                            await randomDelay(6000, 12000); // 6-12s entre cada envio
                        }
                        await sendNotification({
                            channel: 'whatsapp',
                            to: sub.email, // será resolvido pelo backend
                            subject: broadcast.title,
                            message: broadcast.whatsapp_message || broadcast.message,
                            category: 'system',
                        });
                        whatsappCount++;
                    }
                    sentCount++;
                } catch {
                    failedCount++;
                }
            }

            await supabase
                .from('notification_broadcasts')
                .update({
                    status: 'sent',
                    sent_at: new Date().toISOString(),
                    sent_count: sentCount,
                    failed_count: failedCount,
                })
                .eq('id', broadcastId);
        } catch {
            await supabase
                .from('notification_broadcasts')
                .update({ status: 'failed' })
                .eq('id', broadcastId);
        }
    };

    const handleSendBroadcast = async (broadcast: Broadcast) => {
        if (!window.confirm(`Enviar comunicado "${broadcast.title}" agora?`)) return;
        await supabase.from('notification_broadcasts').update({ status: 'sending' }).eq('id', broadcast.id);
        loadBroadcasts();
        await executeBroadcast(broadcast.id, broadcast);
        loadBroadcasts();
        notifications.show({ title: 'Enviado!', message: 'Comunicado enviado com sucesso.', color: 'green' });
    };

    const handleDeleteBroadcast = async (id: string) => {
        if (!window.confirm('Excluir este comunicado?')) return;
        await supabase.from('notification_broadcasts').delete().eq('id', id);
        loadBroadcasts();
    };

    // =============================================
    // AI Optimization
    // =============================================
    const handleAiOptimize = async () => {
        const content = editor?.getHTML() || '';
        if (!content || content === '<p></p>') {
            notifications.show({ title: 'Aviso', message: 'Escreva algo antes de otimizar.', color: 'yellow' });
            return;
        }
        setAiOptimizing(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

            const response = await fetch(`${supabaseUrl}/functions/v1/ai-optimize-text`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: content,
                    context: 'comunicado empresarial para clientes de plataforma SaaS',
                    instructions: 'Otimize o texto mantendo formatação HTML. Seja profissional, claro e persuasivo. Mantenha o tom da marca.',
                }),
            });

            if (response.ok) {
                const data = await response.json();
                if (data.optimized_text) {
                    editor?.commands.setContent(data.optimized_text);
                    notifications.show({ title: 'Otimizado!', message: 'Texto melhorado pela I.A.', color: 'green' });
                }
            } else {
                notifications.show({ title: 'Aviso', message: 'Serviço de I.A. indisponível no momento.', color: 'yellow' });
            }
        } catch {
            notifications.show({ title: 'Aviso', message: 'Serviço de I.A. indisponível.', color: 'yellow' });
        } finally {
            setAiOptimizing(false);
        }
    };

    // =============================================
    // Render Helpers
    // =============================================
    const categoryColors: Record<string, string> = {
        system: 'blue', billing: 'green', product: 'violet',
        alert: 'red', welcome: 'teal', security: 'orange',
    };

    const statusColors: Record<string, string> = {
        draft: 'gray', sending: 'yellow', sent: 'green', failed: 'red',
    };

    const statusLabels: Record<string, string> = {
        draft: 'Rascunho', sending: 'Enviando...', sent: 'Enviado', failed: 'Falha',
    };

    // Target audience options (formato flat para MultiSelect)
    const audienceOptions = [
        { value: 'all_active', label: '✅ Todos os clientes ativos' },
        { value: 'partners', label: '🤝 Parceiros' },
        ...toolProducts.map(t => ({ value: `tool:${t.id}`, label: `🔧 ${t.name}` })),
    ];

    if (loading) {
        return <Center h={400}><Loader size="lg" /></Center>;
    }

    return (
        <Container size="xl" py="md">
            <Group justify="space-between" mb="lg">
                <div>
                    <Title order={2}>Notificações</Title>
                    <Text c="dimmed" size="sm">
                        Envie comunicados e gerencie templates de eventos
                    </Text>
                </div>
            </Group>

            <Tabs value={activeTab} onChange={setActiveTab} radius="md">
                <Tabs.List mb="md">
                    <Tabs.Tab value="broadcasts" leftSection={<IconSend size={16} />}>
                        Comunicados
                    </Tabs.Tab>
                    <Tabs.Tab value="templates" leftSection={<IconBell size={16} />}>
                        Templates de Eventos
                    </Tabs.Tab>
                </Tabs.List>

                {/* ============================================= */}
                {/* TAB: Comunicados (primeiro) */}
                {/* ============================================= */}
                <Tabs.Panel value="broadcasts">
                    <Group justify="space-between" mb="md">
                        <Text size="sm" c="dimmed">
                            Envie comunicados para seus clientes por email, WhatsApp e/ou in-app.
                        </Text>
                        <Button
                            leftSection={<IconPlus size={16} />}
                            onClick={() => openBroadcastModal()}
                        >
                            Novo Comunicado
                        </Button>
                    </Group>

                    {broadcasts.length === 0 ? (
                        <Paper p="xl" ta="center" withBorder radius="md">
                            <IconSend size={40} color="var(--mantine-color-gray-4)" style={{ marginBottom: 8 }} />
                            <Text c="dimmed">Nenhum comunicado criado</Text>
                        </Paper>
                    ) : (
                        <Stack gap="sm">
                            {broadcasts.map(b => (
                                <Paper key={b.id} p="md" withBorder radius="md"
                                    style={{ cursor: b.status === 'sent' ? 'pointer' : undefined }}
                                    onClick={() => {
                                        if (b.status === 'sent') {
                                            setPreviewBroadcast(b);
                                            setPreviewOpen(true);
                                        }
                                    }}
                                >
                                    <Group justify="space-between" wrap="nowrap">
                                        <Group gap="sm" style={{ flex: 1, minWidth: 0 }} wrap="nowrap">
                                            {b.image_url && (
                                                <Image
                                                    src={b.image_url}
                                                    w={60} h={60}
                                                    radius="md"
                                                    fit="cover"
                                                    style={{ flexShrink: 0 }}
                                                />
                                            )}
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <Group gap={8}>
                                                    <Text fw={600} size="sm">{b.title}</Text>
                                                    <Badge size="xs" color={statusColors[b.status] || 'gray'}>
                                                        {statusLabels[b.status] || b.status}
                                                    </Badge>
                                                </Group>
                                                <Text size="xs" c="dimmed" lineClamp={1} mt={4}>
                                                    {b.message.replace(/<[^>]*>/g, '')}
                                                </Text>
                                                <Group gap="xs" mt={4}>
                                                    {b.channels.map(ch => (
                                                        <Badge key={ch} size="xs" variant="dot"
                                                            color={ch === 'email' ? 'blue' : ch === 'whatsapp' ? 'green' : 'violet'}
                                                        >
                                                            {ch === 'email' ? 'Email' : ch === 'whatsapp' ? 'WhatsApp' : 'In-App'}
                                                        </Badge>
                                                    ))}
                                                </Group>
                                            </div>
                                        </Group>
                                        <Group gap={6} wrap="nowrap">
                                            {b.status === 'draft' && (
                                                <>
                                                    <Tooltip label="Editar">
                                                        <ActionIcon variant="light" color="blue" onClick={() => openBroadcastModal(b)}>
                                                            <IconEdit size={16} />
                                                        </ActionIcon>
                                                    </Tooltip>
                                                    <Button
                                                        variant="light" color="green" size="compact-sm"
                                                        leftSection={<IconSend size={14} />}
                                                        onClick={() => handleSendBroadcast(b)}
                                                    >
                                                        Enviar
                                                    </Button>
                                                    <ActionIcon variant="subtle" color="red" onClick={() => handleDeleteBroadcast(b.id)}>
                                                        <IconTrash size={16} />
                                                    </ActionIcon>
                                                </>
                                            )}
                                            {b.status === 'sent' && (
                                                <Stack gap={2} align="flex-end">
                                                    <Group gap={4}>
                                                        <IconUsers size={13} color="var(--mantine-color-teal-6)" />
                                                        <Text size="xs" fw={500} c="teal">
                                                            {b.sent_count} enviado{b.sent_count !== 1 ? 's' : ''}
                                                        </Text>
                                                        {b.failed_count > 0 && (
                                                            <Text size="xs" c="red">({b.failed_count} falha{b.failed_count !== 1 ? 's' : ''})</Text>
                                                        )}
                                                    </Group>
                                                    <Text size="xs" c="dimmed">
                                                        {new Date(b.sent_at!).toLocaleDateString('pt-BR')}
                                                    </Text>
                                                    <Tooltip label="Ver preview">
                                                        <ActionIcon variant="light" color="gray" size="sm" onClick={(e) => {
                                                            e.stopPropagation();
                                                            setPreviewBroadcast(b);
                                                            setPreviewOpen(true);
                                                        }}>
                                                            <IconEye size={14} />
                                                        </ActionIcon>
                                                    </Tooltip>
                                                </Stack>
                                            )}
                                            {b.status === 'sending' && (
                                                <Group gap={4}>
                                                    <Loader size={14} />
                                                    <Text size="xs" c="yellow">Enviando...</Text>
                                                </Group>
                                            )}
                                        </Group>
                                    </Group>
                                </Paper>
                            ))}
                        </Stack>
                    )}
                </Tabs.Panel>

                {/* ============================================= */}
                {/* TAB: Templates de Eventos */}
                {/* ============================================= */}
                <Tabs.Panel value="templates">
                    <Alert icon={<IconInfoCircle size={16} />} color="blue" mb="md" variant="light" radius="md">
                        Edite os textos das notificações automáticas. Use <code>{'{{variavel}}'}</code> para dados dinâmicos.
                    </Alert>

                    <Stack gap="sm">
                        {templates.map(t => (
                            <Paper key={t.id} p="md" radius="md" withBorder
                                style={{ opacity: t.is_active ? 1 : 0.5 }}
                            >
                                <Group justify="space-between" wrap="nowrap">
                                    <Group gap="sm" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
                                        <Box
                                            style={{
                                                width: 40, height: 40, borderRadius: 10,
                                                background: `${t.in_app_color}15`,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                flexShrink: 0,
                                            }}
                                        >
                                            <IconBell size={18} color={t.in_app_color} />
                                        </Box>
                                        <div style={{ minWidth: 0 }}>
                                            <Group gap={6} wrap="nowrap">
                                                <Text fw={600} size="sm" truncate>{t.name}</Text>
                                                <Badge size="xs" variant="light" color={categoryColors[t.category] || 'gray'}>
                                                    {t.category}
                                                </Badge>
                                            </Group>
                                            <Text size="xs" c="dimmed" truncate>{t.description || t.event_key}</Text>
                                        </div>
                                    </Group>

                                    <Group gap={6} wrap="nowrap">
                                        <Tooltip label={t.email_enabled ? 'Email ativo' : 'Email desativado'}>
                                            <ActionIcon variant="subtle" size="sm" color={t.email_enabled ? 'blue' : 'gray'}>
                                                <IconMail size={14} />
                                            </ActionIcon>
                                        </Tooltip>
                                        <Tooltip label={t.whatsapp_enabled ? 'WhatsApp ativo' : 'WhatsApp desativado'}>
                                            <ActionIcon variant="subtle" size="sm" color={t.whatsapp_enabled ? 'green' : 'gray'}>
                                                <IconBrandWhatsapp size={14} />
                                            </ActionIcon>
                                        </Tooltip>
                                        <Tooltip label={t.in_app_enabled ? 'In-App ativo' : 'In-App desativado'}>
                                            <ActionIcon variant="subtle" size="sm" color={t.in_app_enabled ? 'violet' : 'gray'}>
                                                <IconDeviceMobile size={14} />
                                            </ActionIcon>
                                        </Tooltip>
                                        <Divider orientation="vertical" />
                                        <Switch checked={t.is_active} onChange={() => handleToggleTemplate(t)} size="xs" />
                                        <ActionIcon variant="light" color="blue" onClick={() => handleEditTemplate(t)}>
                                            <IconEdit size={16} />
                                        </ActionIcon>
                                    </Group>
                                </Group>
                            </Paper>
                        ))}
                    </Stack>
                </Tabs.Panel>
            </Tabs>

            {/* ============================================= */}
            {/* MODAL: Editar Template */}
            {/* ============================================= */}
            <Modal
                opened={editOpen}
                onClose={() => setEditOpen(false)}
                title={<Group gap={8}><IconEdit size={18} /><Text fw={600}>Editar: {editTemplate?.name}</Text></Group>}
                size="lg"
            >
                {editTemplate && (
                    <Stack gap="md">
                        <Text size="xs" c="dimmed">
                            Evento: <code>{editTemplate.event_key}</code> — Variáveis: <code>{'{{nome}}, {{empresa}}, {{plano}}, {{link}}, {{valor}}, {{data_vencimento}}'}</code>
                        </Text>

                        <Divider label="📧 Email" labelPosition="left" />
                        <Switch label="Email habilitado" checked={editTemplate.email_enabled}
                            onChange={(e) => setEditTemplate({ ...editTemplate, email_enabled: e.target.checked })} />
                        <TextInput label="Assunto" value={editTemplate.email_subject}
                            onChange={(e) => setEditTemplate({ ...editTemplate, email_subject: e.target.value })} />
                        <Textarea label="Corpo (HTML)" value={editTemplate.email_body}
                            onChange={(e) => setEditTemplate({ ...editTemplate, email_body: e.target.value })}
                            minRows={4} autosize />

                        <Divider label="💬 WhatsApp" labelPosition="left" />
                        <Switch label="WhatsApp habilitado" checked={editTemplate.whatsapp_enabled}
                            onChange={(e) => setEditTemplate({ ...editTemplate, whatsapp_enabled: e.target.checked })} />
                        <Textarea label="Mensagem" value={editTemplate.whatsapp_message}
                            onChange={(e) => setEditTemplate({ ...editTemplate, whatsapp_message: e.target.value })}
                            minRows={3} autosize />

                        <Divider label="🔔 In-App" labelPosition="left" />
                        <Switch label="In-App habilitado" checked={editTemplate.in_app_enabled}
                            onChange={(e) => setEditTemplate({ ...editTemplate, in_app_enabled: e.target.checked })} />
                        <SimpleGrid cols={2}>
                            <TextInput label="Título" value={editTemplate.in_app_title}
                                onChange={(e) => setEditTemplate({ ...editTemplate, in_app_title: e.target.value })} />
                            <TextInput label="Cor" value={editTemplate.in_app_color}
                                onChange={(e) => setEditTemplate({ ...editTemplate, in_app_color: e.target.value })} />
                        </SimpleGrid>
                        <Textarea label="Mensagem" value={editTemplate.in_app_message}
                            onChange={(e) => setEditTemplate({ ...editTemplate, in_app_message: e.target.value })} minRows={2} />

                        <Group justify="flex-end" mt="md">
                            <Button variant="default" onClick={() => setEditOpen(false)}>Cancelar</Button>
                            <Button onClick={handleSaveTemplate} loading={saving}>Salvar</Button>
                        </Group>
                    </Stack>
                )}
            </Modal>

            {/* ============================================= */}
            {/* MODAL: Novo / Editar Comunicado */}
            {/* ============================================= */}
            <Modal
                opened={broadcastOpen}
                onClose={() => setBroadcastOpen(false)}
                title={
                    <Group gap={8}>
                        <IconSend size={18} />
                        <Text fw={600}>{editingBroadcast ? 'Editar Comunicado' : 'Novo Comunicado'}</Text>
                    </Group>
                }
                size="xl"
                zIndex={1000}
                centered
                scrollAreaComponent={ScrollArea.Autosize}
                styles={{
                    body: { maxHeight: 'calc(100vh - 200px)', overflow: 'auto' },
                }}
            >
                <Stack gap="md">
                    <TextInput
                        label="Título"
                        placeholder="Título do comunicado"
                        value={broadcastForm.title}
                        onChange={(e) => setBroadcastForm({ ...broadcastForm, title: e.target.value })}
                        required
                    />

                    {/* RichText Editor */}
                    <div>
                        <Group justify="space-between" mb={4}>
                            <Text size="sm" fw={500}>Mensagem <Text span c="red">*</Text></Text>
                            <Button
                                variant="light"
                                size="compact-xs"
                                color="violet"
                                leftSection={<IconSparkles size={14} />}
                                onClick={handleAiOptimize}
                                loading={aiOptimizing}
                            >
                                Otimizar com I.A.
                            </Button>
                        </Group>
                        <RichTextEditor editor={editor} styles={{
                            root: { border: '1px solid var(--mantine-color-gray-3)', borderRadius: 'var(--mantine-radius-md)' },
                            content: { minHeight: 250, maxHeight: 300, overflowY: 'auto' as const },
                        }}>
                            <RichTextEditor.Toolbar sticky stickyOffset={60}>
                                <RichTextEditor.ControlsGroup>
                                    <RichTextEditor.Bold />
                                    <RichTextEditor.Italic />
                                    <RichTextEditor.Underline />
                                    <RichTextEditor.Strikethrough />
                                    <RichTextEditor.Highlight />
                                </RichTextEditor.ControlsGroup>
                                <RichTextEditor.ControlsGroup>
                                    <RichTextEditor.H2 />
                                    <RichTextEditor.H3 />
                                </RichTextEditor.ControlsGroup>
                                <RichTextEditor.ControlsGroup>
                                    <RichTextEditor.BulletList />
                                    <RichTextEditor.OrderedList />
                                </RichTextEditor.ControlsGroup>
                                <RichTextEditor.ControlsGroup>
                                    <RichTextEditor.Link />
                                    <RichTextEditor.Unlink />
                                </RichTextEditor.ControlsGroup>
                                <RichTextEditor.ControlsGroup>
                                    <RichTextEditor.AlignLeft />
                                    <RichTextEditor.AlignCenter />
                                </RichTextEditor.ControlsGroup>
                            </RichTextEditor.Toolbar>
                            <RichTextEditor.Content />
                        </RichTextEditor>
                        <Text size="xs" c="dimmed" mt={4}>
                            O email vai como HTML. O WhatsApp recebe automaticamente com *negrito*, _itálico_ e • listas.
                        </Text>
                    </div>

                    {/* Upload de Imagem */}
                    <div>
                        <Text size="sm" fw={500} mb={4}>Imagem (opcional)</Text>
                        <Group gap="md" align="flex-start">
                            <FileInput
                                placeholder="Selecionar imagem..."
                                accept="image/*"
                                leftSection={<IconUpload size={16} />}
                                value={imageFile}
                                onChange={(file) => {
                                    setImageFile(file);
                                    if (file) {
                                        setImagePreview(URL.createObjectURL(file));
                                    }
                                }}
                                style={{ flex: 1 }}
                                clearable
                            />
                            {imagePreview && (
                                <Image
                                    src={imagePreview}
                                    w={100} h={60}
                                    radius="md"
                                    fit="cover"
                                />
                            )}
                        </Group>
                    </div>

                    {/* Botão de Ação */}
                    <SimpleGrid cols={2}>
                        <TextInput
                            label="Link de Ação"
                            placeholder="https://..."
                            value={broadcastForm.action_url}
                            onChange={(e) => setBroadcastForm({ ...broadcastForm, action_url: e.target.value })}
                            description="Aplicado na imagem e no botão"
                        />
                        <TextInput
                            label="Texto do Botão"
                            placeholder="Ex: Saiba Mais"
                            value={broadcastForm.action_label}
                            onChange={(e) => setBroadcastForm({ ...broadcastForm, action_label: e.target.value })}
                            description="Exibido no botão de ação"
                        />
                    </SimpleGrid>

                    {/* Canais */}
                    <div>
                        <Text size="sm" fw={500} mb={4}>Canais de Envio</Text>
                        <Group gap="lg">
                            <Checkbox
                                label="📧 Email"
                                checked={broadcastForm.channels.includes('email')}
                                onChange={(e) => {
                                    const channels = e.target.checked
                                        ? [...broadcastForm.channels, 'email']
                                        : broadcastForm.channels.filter(c => c !== 'email');
                                    setBroadcastForm({ ...broadcastForm, channels });
                                }}
                            />
                            <Checkbox
                                label="💬 WhatsApp"
                                checked={broadcastForm.channels.includes('whatsapp')}
                                onChange={(e) => {
                                    const channels = e.target.checked
                                        ? [...broadcastForm.channels, 'whatsapp']
                                        : broadcastForm.channels.filter(c => c !== 'whatsapp');
                                    setBroadcastForm({ ...broadcastForm, channels });
                                }}
                            />
                            <Checkbox
                                label="🔔 In-App"
                                checked={broadcastForm.channels.includes('in_app')}
                                onChange={(e) => {
                                    const channels = e.target.checked
                                        ? [...broadcastForm.channels, 'in_app']
                                        : broadcastForm.channels.filter(c => c !== 'in_app');
                                    setBroadcastForm({ ...broadcastForm, channels });
                                }}
                            />
                        </Group>
                    </div>

                    {/* Público Alvo */}
                    <MultiSelect
                        label="Público Alvo"
                        description="Vazio = todos os clientes"
                        placeholder="Selecione filtros..."
                        data={audienceOptions}
                        value={broadcastForm.target_audience}
                        onChange={(val) => setBroadcastForm({ ...broadcastForm, target_audience: val })}
                        searchable
                        clearable
                    />

                    {/* Botões */}
                    <Group justify="flex-end" mt="md">
                        <Button variant="default" onClick={() => setBroadcastOpen(false)}>
                            Cancelar
                        </Button>
                        <Button
                            variant="light"
                            onClick={() => handleSaveBroadcast(false)}
                            loading={broadcastSaving}
                        >
                            Salvar como Rascunho
                        </Button>
                        <Button
                            leftSection={<IconSend size={16} />}
                            onClick={() => handleSaveBroadcast(true)}
                            loading={broadcastSaving}
                        >
                            Salvar e Enviar
                        </Button>
                    </Group>
                </Stack>
            </Modal>

            {/* ============================================= */}
            {/* MODAL: Preview do Comunicado Enviado */}
            {/* ============================================= */}
            <Modal
                opened={previewOpen}
                onClose={() => setPreviewOpen(false)}
                title={
                    <Group gap={8}>
                        <IconEye size={18} />
                        <Text fw={600}>Preview: {previewBroadcast?.title}</Text>
                    </Group>
                }
                size="lg"
                zIndex={1000}
                centered
            >
                {previewBroadcast && (
                    <Stack gap="md">
                        {/* Status e data */}
                        <Group justify="space-between">
                            <Badge color={statusColors[previewBroadcast.status]}>
                                {statusLabels[previewBroadcast.status]}
                            </Badge>
                            <Group gap="xs">
                                {previewBroadcast.sent_at && (
                                    <Text size="xs" c="dimmed">
                                        Enviado em {new Date(previewBroadcast.sent_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </Text>
                                )}
                            </Group>
                        </Group>

                        {/* Contagem */}
                        <Paper p="sm" withBorder radius="md" bg="gray.0">
                            <Group justify="center" gap="xl">
                                <Stack gap={2} align="center">
                                    <Text size="xl" fw={700} c="teal">{previewBroadcast.sent_count}</Text>
                                    <Text size="xs" c="dimmed">Enviados</Text>
                                </Stack>
                                {previewBroadcast.failed_count > 0 && (
                                    <Stack gap={2} align="center">
                                        <Text size="xl" fw={700} c="red">{previewBroadcast.failed_count}</Text>
                                        <Text size="xs" c="dimmed">Falhas</Text>
                                    </Stack>
                                )}
                                <Stack gap={2} align="center">
                                    <Group gap={4}>
                                        {previewBroadcast.channels.map(ch => (
                                            <Badge key={ch} size="xs" variant="dot"
                                                color={ch === 'email' ? 'blue' : ch === 'whatsapp' ? 'green' : 'violet'}
                                            >
                                                {ch === 'email' ? 'Email' : ch === 'whatsapp' ? 'WhatsApp' : 'In-App'}
                                            </Badge>
                                        ))}
                                    </Group>
                                    <Text size="xs" c="dimmed">Canais</Text>
                                </Stack>
                            </Group>
                        </Paper>

                        {/* Imagem */}
                        {previewBroadcast.image_url && (
                            <Image
                                src={previewBroadcast.image_url}
                                radius="md"
                                mah={200}
                                fit="cover"
                            />
                        )}

                        {/* Conteúdo HTML */}
                        <Paper p="md" withBorder radius="md">
                            <div
                                dangerouslySetInnerHTML={{ __html: previewBroadcast.message }}
                                style={{ fontSize: 14, lineHeight: 1.6 }}
                            />
                        </Paper>

                        {/* Link de ação */}
                        {previewBroadcast.action_url && (
                            <Group gap="xs">
                                <Text size="sm" fw={500}>🔗 Ação:</Text>
                                <Text size="sm" c="blue" component="a" href={previewBroadcast.action_url} target="_blank">
                                    {previewBroadcast.action_label || previewBroadcast.action_url}
                                </Text>
                            </Group>
                        )}

                        <Button variant="default" fullWidth onClick={() => setPreviewOpen(false)}>Fechar</Button>
                    </Stack>
                )}
            </Modal>
        </Container>
    );
}
