/**
 * Aba / card: Links úteis da empresa (Hub)
 */
import { useEffect, useState } from 'react';
import {
    Stack, Text, TextInput, Button, Group, ActionIcon, Paper, Alert, Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconTrash, IconExternalLink, IconDeviceFloppy, IconGripVertical } from '@tabler/icons-react';
import {
    getCompanyUsefulLinks,
    saveCompanyUsefulLinks,
    type UsefulLink,
} from '../../../shared/services/usefulLinksService';

interface Props {
    companyId: string;
    canEdit: boolean;
}

function newEmptyLink(order: number): UsefulLink {
    return {
        id: crypto.randomUUID(),
        title: '',
        url: '',
        sort_order: order,
    };
}

export function UsefulLinksSettings({ companyId, canEdit }: Props) {
    const [links, setLinks] = useState<UsefulLink[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            try {
                const data = await getCompanyUsefulLinks(companyId);
                if (!cancelled) setLinks(data);
            } catch (err: any) {
                if (!cancelled) {
                    notifications.show({
                        title: 'Erro',
                        message: err?.message || 'Não foi possível carregar os links úteis',
                        color: 'red',
                    });
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [companyId]);

    const updateLink = (id: string, patch: Partial<UsefulLink>) => {
        setLinks((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
    };

    const removeLink = (id: string) => {
        setLinks((prev) => prev.filter((l) => l.id !== id).map((l, i) => ({ ...l, sort_order: i })));
    };

    const addLink = () => {
        setLinks((prev) => [...prev, newEmptyLink(prev.length)]);
    };

    const handleSave = async () => {
        setSaving(true);
        const result = await saveCompanyUsefulLinks(companyId, links);
        setSaving(false);
        if (!result.success) {
            notifications.show({
                title: 'Erro ao salvar',
                message: result.error || 'Não foi possível salvar os links',
                color: 'red',
            });
            return;
        }
        setLinks(result.links || []);
        notifications.show({
            title: 'Links salvos',
            message: 'Os links úteis aparecerão no menu lateral das ferramentas Sincla.',
            color: 'green',
        });
    };

    return (
        <Stack gap="md">
            <Alert color="blue" variant="light">
                Cadastre links externos (nome + URL). Eles aparecem no menu lateral do RH, EAD e demais
                ferramentas como <strong>Links úteis</strong> e sempre abrem em nova aba.
            </Alert>

            {loading ? (
                <Text size="sm" c="dimmed">Carregando…</Text>
            ) : (
                <Stack gap="sm">
                    {links.length === 0 && (
                        <Text size="sm" c="dimmed">Nenhum link cadastrado ainda.</Text>
                    )}
                    {links.map((link) => (
                        <Paper key={link.id} withBorder p="sm" radius="md">
                            <Group align="flex-start" wrap="nowrap" gap="xs">
                                <IconGripVertical size={16} color="var(--mantine-color-gray-5)" style={{ marginTop: 10 }} />
                                <Stack gap="xs" style={{ flex: 1 }}>
                                    <TextInput
                                        label="Nome"
                                        placeholder="Ex.: Portal do colaborador"
                                        value={link.title}
                                        onChange={(e) => updateLink(link.id, { title: e.currentTarget.value })}
                                        disabled={!canEdit}
                                        radius="md"
                                    />
                                    <TextInput
                                        label="Link"
                                        placeholder="https://..."
                                        value={link.url}
                                        onChange={(e) => updateLink(link.id, { url: e.currentTarget.value })}
                                        disabled={!canEdit}
                                        radius="md"
                                        rightSection={
                                            link.url ? (
                                                <Tooltip label="Abrir">
                                                    <ActionIcon
                                                        variant="subtle"
                                                        component="a"
                                                        href={/^https?:\/\//i.test(link.url) ? link.url : `https://${link.url}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                    >
                                                        <IconExternalLink size={14} />
                                                    </ActionIcon>
                                                </Tooltip>
                                            ) : null
                                        }
                                    />
                                </Stack>
                                {canEdit && (
                                    <ActionIcon
                                        color="red"
                                        variant="subtle"
                                        mt={28}
                                        onClick={() => removeLink(link.id)}
                                        aria-label="Remover link"
                                    >
                                        <IconTrash size={16} />
                                    </ActionIcon>
                                )}
                            </Group>
                        </Paper>
                    ))}
                </Stack>
            )}

            {canEdit && (
                <Group justify="space-between">
                    <Button variant="light" leftSection={<IconPlus size={16} />} onClick={addLink}>
                        Adicionar link
                    </Button>
                    <Button
                        leftSection={<IconDeviceFloppy size={16} />}
                        loading={saving}
                        onClick={handleSave}
                    >
                        Salvar links
                    </Button>
                </Group>
            )}
        </Stack>
    );
}
