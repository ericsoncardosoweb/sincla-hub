import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { Container, Title, Text, Loader, Center, Stack, Alert } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { supabase } from '../../shared/lib/supabase';

interface LegalPageData {
    id: string;
    slug: string;
    title: string;
    content: string;
    version: number;
    published_at: string;
    updated_at: string;
}

interface PlatformSetting {
    key: string;
    value: string;
}

// Default variable values (fallback)
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

// Map slug aliases to canonical slugs
const SLUG_MAP: Record<string, string> = {
    'politica-privacidade': 'politica-privacidade',
    'termos-de-uso': 'termos-de-uso',
};

function resolveVariables(html: string, settings: PlatformSetting[]): string {
    let resolved = html;
    const settingsMap = new Map(settings.map(s => [s.key, s.value]));

    // Replace all {{key}} patterns
    resolved = resolved.replace(/\{\{(\w+)\}\}/g, (_, key) => {
        return settingsMap.get(key) || DEFAULT_VARS[key] || `{{${key}}}`;
    });

    return resolved;
}

export function LegalPage() {
    const { slug: paramSlug } = useParams<{ slug: string }>();
    const location = useLocation();

    // Extract slug from pathname for static routes, or use param for /legal/:slug
    const slug = paramSlug || location.pathname.replace(/^\//, '');

    const [page, setPage] = useState<LegalPageData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [resolvedContent, setResolvedContent] = useState('');

    useEffect(() => {
        const fetchPage = async () => {
            if (!slug) {
                setError('Página não encontrada');
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);

            try {
                const canonicalSlug = SLUG_MAP[slug] || slug;

                // Fetch page and settings in parallel
                const [pageRes, settingsRes] = await Promise.all([
                    supabase
                        .from('legal_pages')
                        .select('*')
                        .eq('slug', canonicalSlug)
                        .eq('is_published', true)
                        .single(),
                    supabase
                        .from('platform_settings')
                        .select('key, value'),
                ]);

                if (pageRes.error || !pageRes.data) {
                    setError('Documento não encontrado ou não publicado');
                    setLoading(false);
                    return;
                }

                setPage(pageRes.data);

                // Resolve variables with settings
                const settings = settingsRes.data || [];
                const html = resolveVariables(pageRes.data.content, settings);
                setResolvedContent(html);
            } catch (err: any) {
                console.error('Error fetching legal page:', err);
                setError('Erro ao carregar o documento');
            } finally {
                setLoading(false);
            }
        };

        fetchPage();
    }, [slug]);

    return (
        <div style={{ background: 'var(--bg-dark, #0a0a1a)', color: 'var(--text-primary, #e1e1e6)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <Header />
            <main style={{ flex: 1, paddingTop: '100px', paddingBottom: '60px' }}>
                <Container size="md">
                    {loading ? (
                        <Center py={100}>
                            <Loader size="lg" />
                        </Center>
                    ) : error ? (
                        <Center py={100}>
                            <Alert
                                icon={<IconAlertCircle size={16} />}
                                title="Documento não encontrado"
                                color="red"
                                variant="filled"
                            >
                                {error}
                            </Alert>
                        </Center>
                    ) : page ? (
                        <Stack gap="md">
                            <div
                                dangerouslySetInnerHTML={{ __html: resolvedContent }}
                                style={{
                                    lineHeight: 1.8,
                                    fontSize: '16px',
                                    color: 'rgba(255,255,255,0.85)',
                                }}
                                className="legal-content"
                            />
                            <Text size="xs" c="dimmed" ta="center" mt="xl">
                                Versão {page.version} — Última atualização: {new Date(page.updated_at).toLocaleDateString('pt-BR', {
                                    day: '2-digit',
                                    month: 'long',
                                    year: 'numeric',
                                })}
                            </Text>
                        </Stack>
                    ) : null}
                </Container>
            </main>
            <Footer />

            <style>{`
                .legal-content h1 {
                    font-size: 2rem;
                    font-weight: 700;
                    margin-bottom: 1rem;
                    color: white;
                }
                .legal-content h2 {
                    font-size: 1.4rem;
                    font-weight: 600;
                    margin-top: 2rem;
                    margin-bottom: 0.75rem;
                    color: white;
                }
                .legal-content h3 {
                    font-size: 1.1rem;
                    font-weight: 600;
                    margin-top: 1.5rem;
                    margin-bottom: 0.5rem;
                    color: white;
                }
                .legal-content p {
                    margin-bottom: 1rem;
                }
                .legal-content ul, .legal-content ol {
                    padding-left: 1.5rem;
                    margin-bottom: 1rem;
                }
                .legal-content li {
                    margin-bottom: 0.5rem;
                }
                .legal-content a {
                    color: #0087ff;
                    text-decoration: underline;
                }
                .legal-content a:hover {
                    color: #00c6ff;
                }
                .legal-content strong {
                    color: white;
                }
            `}</style>
        </div>
    );
}
