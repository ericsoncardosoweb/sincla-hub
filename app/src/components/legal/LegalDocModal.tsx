import { useEffect, useState } from 'react';
import {
    Modal,
    ScrollArea,
    Loader,
    Center,
    Text,
    Button,
    Group,
    Box,
} from '@mantine/core';
import { IconCheck, IconFileText } from '@tabler/icons-react';
import { supabase } from '../../shared/lib/supabase';
import classes from './LegalDocModal.module.css';

interface LegalDocModalProps {
    opened: boolean;
    onClose: () => void;
    slug: string;
    /** Quando informado, exibe o botão "Li e aceito" que dispara este callback. */
    onAccept?: () => void;
}

interface LegalPageRow {
    title: string;
    content: string;
    updated_at: string;
    version: number;
}

const DEFAULT_VARS: Record<string, string> = {
    empresa_nome: 'Sincla Tecnologia Ltda',
    empresa_cnpj: '00.000.000/0000-00',
    empresa_endereco: 'São Paulo, SP - Brasil',
    empresa_whatsapp: '(11) 99999-9999',
    empresa_telefone: '(11) 3333-3333',
    empresa_email: 'contato@sincla.com.br',
    site_url: 'https://sincla.com.br',
    app_url: 'https://app.sincla.com.br',
};

function resolveVariables(html: string, settings: { key: string; value: string }[]): string {
    const map = new Map(settings.map((s) => [s.key, s.value]));
    return html.replace(/\{\{(\w+)\}\}/g, (_, key) => map.get(key) || DEFAULT_VARS[key] || `{{${key}}}`);
}

export function LegalDocModal({ opened, onClose, slug, onAccept }: LegalDocModalProps) {
    const [loading, setLoading] = useState(true);
    const [doc, setDoc] = useState<LegalPageRow | null>(null);
    const [html, setHtml] = useState('');
    const [error, setError] = useState(false);

    useEffect(() => {
        if (!opened || !slug) return;

        let cancelled = false;
        const load = async () => {
            setLoading(true);
            setError(false);
            try {
                if (!supabase) throw new Error('no supabase');
                const [pageRes, settingsRes] = await Promise.all([
                    supabase
                        .from('legal_pages')
                        .select('title, content, updated_at, version')
                        .eq('slug', slug)
                        .eq('is_published', true)
                        .single(),
                    supabase.from('platform_settings').select('key, value'),
                ]);

                if (cancelled) return;

                if (pageRes.error || !pageRes.data) {
                    setError(true);
                    return;
                }

                setDoc(pageRes.data as LegalPageRow);
                setHtml(resolveVariables((pageRes.data as LegalPageRow).content, settingsRes.data || []));
            } catch {
                if (!cancelled) setError(true);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        load();
        return () => {
            cancelled = true;
        };
    }, [opened, slug]);

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            size="lg"
            centered
            radius="lg"
            scrollAreaComponent={ScrollArea.Autosize}
            title={
                <Group gap="xs">
                    <IconFileText size={20} className={classes.titleIcon} />
                    <Text fw={700}>{doc?.title || 'Documento'}</Text>
                </Group>
            }
            classNames={{ content: classes.modalContent, header: classes.modalHeader, body: classes.modalBody }}
        >
            {loading ? (
                <Center py={80}>
                    <Loader />
                </Center>
            ) : error ? (
                <Center py={60}>
                    <Text c="dimmed" ta="center">
                        Não foi possível carregar o documento agora. Tente novamente em instantes.
                    </Text>
                </Center>
            ) : (
                <>
                    <ScrollArea.Autosize mah="55vh" type="auto" offsetScrollbars className={classes.scroll}>
                        <Box
                            className={classes.legalContent}
                            dangerouslySetInnerHTML={{ __html: html }}
                        />
                        {doc && (
                            <Text size="xs" c="dimmed" mt="xl">
                                Versão {doc.version} — Atualizado em{' '}
                                {new Date(doc.updated_at).toLocaleDateString('pt-BR', {
                                    day: '2-digit',
                                    month: 'long',
                                    year: 'numeric',
                                })}
                            </Text>
                        )}
                    </ScrollArea.Autosize>

                    <Group justify="flex-end" mt="lg" className={classes.footer}>
                        <Button variant="subtle" color="gray" onClick={onClose}>
                            Fechar
                        </Button>
                        {onAccept && (
                            <Button
                                leftSection={<IconCheck size={16} />}
                                onClick={() => {
                                    onAccept();
                                    onClose();
                                }}
                            >
                                Li e aceito
                            </Button>
                        )}
                    </Group>
                </>
            )}
        </Modal>
    );
}
