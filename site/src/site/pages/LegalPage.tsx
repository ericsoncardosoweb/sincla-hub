import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { Container, Text, Loader, Center, Stack } from '@mantine/core';

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
    'politicas-de-privacidade': 'politica-privacidade',
    'termos-de-uso': 'termos-de-uso',
    'politicas-de-compra': 'politicas-de-compra',
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

// Conteúdo estático fallback (quando o banco não retorna dados)
const FALLBACK_CONTENT: Record<string, { title: string; content: string }> = {
    'politica-privacidade': {
        title: 'Política de Privacidade',
        content: `
<h1>Política de Privacidade</h1>
<p><strong>Última atualização:</strong> Março de 2026</p>
<p>A Sincla Tecnologia Ltda ("Sincla", "nós", "nosso") valoriza a privacidade dos seus usuários. Esta Política de Privacidade descreve como coletamos, usamos, armazenamos e protegemos suas informações pessoais ao utilizar nossos serviços e plataformas.</p>

<h2>1. Informações que Coletamos</h2>
<p>Coletamos as seguintes categorias de informações:</p>
<ul>
<li><strong>Dados de cadastro:</strong> nome, e-mail, telefone, CPF/CNPJ e dados da empresa.</li>
<li><strong>Dados de uso:</strong> páginas visitadas, funcionalidades utilizadas, horários de acesso e endereço IP.</li>
<li><strong>Dados de pagamento:</strong> processados por gateways de pagamento parceiros, não armazenamos dados de cartão.</li>
<li><strong>Cookies e tecnologias similares:</strong> para melhorar a experiência de navegação e personalização.</li>
</ul>

<h2>2. Como Usamos suas Informações</h2>
<p>Utilizamos suas informações para:</p>
<ul>
<li>Fornecer, manter e melhorar nossos serviços;</li>
<li>Processar transações e enviar notificações relacionadas;</li>
<li>Personalizar sua experiência na plataforma;</li>
<li>Enviar comunicações sobre atualizações, promoções e novidades (com opção de cancelamento);</li>
<li>Cumprir obrigações legais e regulatórias;</li>
<li>Prevenir fraudes e garantir a segurança da plataforma.</li>
</ul>

<h2>3. Compartilhamento de Dados</h2>
<p>Não vendemos suas informações pessoais. Podemos compartilhar dados com:</p>
<ul>
<li><strong>Prestadores de serviço:</strong> empresas que nos auxiliam na operação (hospedagem, processamento de pagamentos, envio de e-mails);</li>
<li><strong>Obrigações legais:</strong> quando exigido por lei, ordem judicial ou autoridade competente;</li>
<li><strong>Proteção de direitos:</strong> para proteger os direitos, propriedade ou segurança da Sincla e seus usuários.</li>
</ul>

<h2>4. Armazenamento e Segurança</h2>
<p>Seus dados são armazenados em servidores seguros com criptografia. Adotamos medidas técnicas e organizacionais para proteger suas informações contra acesso não autorizado, alteração, divulgação ou destruição.</p>

<h2>5. Seus Direitos (LGPD)</h2>
<p>De acordo com a Lei Geral de Proteção de Dados (LGPD), você tem direito a:</p>
<ul>
<li>Confirmar a existência de tratamento de dados;</li>
<li>Acessar, corrigir ou excluir seus dados pessoais;</li>
<li>Solicitar a portabilidade dos seus dados;</li>
<li>Revogar o consentimento a qualquer momento;</li>
<li>Solicitar informações sobre compartilhamento com terceiros.</li>
</ul>
<p>Para exercer seus direitos, entre em contato pelo e-mail: <a href="mailto:privacidade@sincla.com.br">privacidade@sincla.com.br</a></p>

<h2>6. Cookies</h2>
<p>Utilizamos cookies para melhorar a navegação, lembrar preferências e analisar o uso da plataforma. Você pode gerenciar cookies nas configurações do seu navegador.</p>

<h2>7. Retenção de Dados</h2>
<p>Mantemos seus dados pelo tempo necessário para cumprir as finalidades descritas nesta política, ou conforme exigido por lei. Dados de contas inativas podem ser excluídos após 24 meses.</p>

<h2>8. Alterações nesta Política</h2>
<p>Podemos atualizar esta política periodicamente. Notificaremos sobre alterações significativas por e-mail ou através da plataforma. O uso continuado dos serviços após as alterações constitui aceitação da política atualizada.</p>

<h2>9. Contato</h2>
<p>Para dúvidas sobre esta Política de Privacidade:</p>
<ul>
<li><strong>E-mail:</strong> <a href="mailto:privacidade@sincla.com.br">privacidade@sincla.com.br</a></li>
<li><strong>Site:</strong> <a href="https://sincla.com.br">sincla.com.br</a></li>
</ul>
`
    },
    'termos-de-uso': {
        title: 'Termos de Uso',
        content: `
<h1>Termos de Uso</h1>
<p><strong>Última atualização:</strong> Março de 2026</p>
<p>Ao acessar e utilizar os serviços da Sincla Tecnologia Ltda ("Sincla"), você concorda com estes Termos de Uso. Leia atentamente antes de utilizar a plataforma.</p>

<h2>1. Aceitação dos Termos</h2>
<p>Ao criar uma conta ou utilizar qualquer serviço da Sincla, você declara ter lido, compreendido e aceito estes termos na íntegra. Se você não concordar, não utilize nossos serviços.</p>

<h2>2. Descrição dos Serviços</h2>
<p>A Sincla oferece um ecossistema de plataformas de gestão empresarial, incluindo:</p>
<ul>
<li><strong>Sincla RH:</strong> gestão de pessoas e recursos humanos;</li>
<li><strong>Sincla Recrutamento:</strong> atração, seleção e contratação inteligente de talentos com inteligência artificial;</li>
<li><strong>Sincla EAD:</strong> treinamentos, capacitação de equipes e cursos online corporativos;</li>
<li>Outros produtos que venham a ser disponibilizados.</li>
</ul>

<h2>3. Cadastro e Conta</h2>
<p>Para utilizar nossos serviços, você deve:</p>
<ul>
<li>Fornecer informações verdadeiras, completas e atualizadas;</li>
<li>Manter a confidencialidade da sua senha;</li>
<li>Ser responsável por todas as atividades realizadas em sua conta;</li>
<li>Notificar imediatamente sobre uso não autorizado.</li>
</ul>

<h2>4. Uso Aceitável</h2>
<p>Você se compromete a não:</p>
<ul>
<li>Utilizar os serviços para fins ilegais ou não autorizados;</li>
<li>Tentar acessar sistemas ou dados de outros usuários sem autorização;</li>
<li>Transmitir vírus, malware ou código malicioso;</li>
<li>Sobrecarregar ou interferir na infraestrutura dos serviços;</li>
<li>Reproduzir, duplicar ou revender qualquer parte dos serviços sem autorização.</li>
</ul>

<h2>5. Propriedade Intelectual</h2>
<p>Todo o conteúdo, design, código-fonte, marcas e logotipos da Sincla são de propriedade exclusiva da Sincla Tecnologia Ltda, protegidos por leis de propriedade intelectual. O uso dos serviços não confere nenhum direito de propriedade sobre o conteúdo da plataforma.</p>

<h2>6. Planos e Pagamentos</h2>
<ul>
<li>Os preços e condições estão disponíveis na página de planos;</li>
<li>O pagamento é processado por gateways parceiros;</li>
<li>O cancelamento pode ser feito a qualquer momento pelo painel;</li>
<li>Reembolsos seguem a política de cada plano contratado.</li>
</ul>

<h2>7. Disponibilidade</h2>
<p>Nos esforçamos para manter os serviços disponíveis 24/7, mas não garantimos funcionamento ininterrupto. Manutenções programadas serão comunicadas com antecedência.</p>

<h2>8. Limitação de Responsabilidade</h2>
<p>A Sincla não se responsabiliza por:</p>
<ul>
<li>Danos indiretos, incidentais ou consequenciais;</li>
<li>Perda de dados causada por falhas de terceiros;</li>
<li>Interrupções causadas por eventos fora do nosso controle;</li>
<li>Conteúdo gerado ou inserido pelos usuários.</li>
</ul>

<h2>9. Rescisão</h2>
<p>Podemos suspender ou encerrar sua conta se houver violação destes termos. Você pode encerrar sua conta a qualquer momento pelo painel de configurações.</p>

<h2>10. Legislação Aplicável</h2>
<p>Estes termos são regidos pela legislação brasileira. O foro da comarca de São Paulo/SP é eleito para dirimir quaisquer litígios.</p>

<h2>11. Contato</h2>
<p>Para dúvidas sobre estes Termos de Uso:</p>
<ul>
<li><strong>E-mail:</strong> <a href="mailto:contato@sincla.com.br">contato@sincla.com.br</a></li>
<li><strong>Site:</strong> <a href="https://sincla.com.br">sincla.com.br</a></li>
</ul>
`
    },
    'politicas-de-compra': {
        title: 'Políticas de Compra',
        content: `
<h1>Políticas de Compra e Reembolso</h1>
<p><strong>Última atualização:</strong> Março de 2026</p>
<p>A Sincla Tecnologia Ltda ("Sincla") valoriza a transparência em suas relações comerciais. Esta política descreve as condições de compra, assinatura e reembolso dos nossos serviços.</p>

<h2>1. Planos e Assinaturas</h2>
<p>A Sincla oferece planos de assinatura mensal e anual para acesso às suas plataformas. Os valores, recursos e condições de cada plano estão descritos na página de preços e no momento da contratação.</p>

<h2>2. Direito de Arrependimento e Reembolso</h2>
<p>Em conformidade com o Código de Defesa do Consumidor (Art. 49), você tem direito ao reembolso integral nos seguintes termos:</p>
<ul>
<li><strong>Primeiros 7 (sete) dias:</strong> Após a contratação de uma <strong>nova assinatura</strong>, você pode solicitar o cancelamento e reembolso integral dentro de 7 dias corridos, sem necessidade de justificativa.</li>
<li><strong>Renovações automáticas:</strong> As renovações de assinaturas (mensais ou anuais) <strong>não dão direito a reembolso</strong>, pois o usuário já teve acesso e utilizou o serviço durante o período anterior. O cancelamento de renovações toma efeito no próximo ciclo de cobrança.</li>
</ul>

<h2>3. Como Solicitar Reembolso</h2>
<p>Para solicitar seu reembolso dentro do prazo de 7 dias:</p>
<ul>
<li>Acesse seu painel em <a href="https://app.sincla.com.br">app.sincla.com.br</a> e cancele a assinatura; ou</li>
<li>Envie um e-mail para <a href="mailto:financeiro@sincla.com.br">financeiro@sincla.com.br</a> com o assunto "Solicitação de Reembolso" informando seu nome e e-mail cadastrado.</li>
</ul>
<p>O reembolso será processado em até <strong>10 dias úteis</strong> após a confirmação, utilizando o mesmo método de pagamento original.</p>

<h2>4. Cancelamento de Assinatura</h2>
<p>Você pode cancelar sua assinatura a qualquer momento pelo painel de configurações. Ao cancelar:</p>
<ul>
<li>Seu acesso permanece ativo até o final do período já pago;</li>
<li>Não haverá cobranças futuras após o cancelamento;</li>
<li>Seus dados serão mantidos por 90 dias para eventual reativação.</li>
</ul>

<h2>5. Formas de Pagamento</h2>
<p>Aceitamos as seguintes formas de pagamento:</p>
<ul>
<li>Cartão de crédito (Visa, Mastercard, Elo, Amex);</li>
<li>Boleto bancário;</li>
<li>PIX.</li>
</ul>
<p>Os pagamentos são processados por gateways de pagamento parceiros com certificação PCI-DSS. A Sincla não armazena dados de cartão de crédito.</p>

<h2>6. Alteração de Plano</h2>
<p>Você pode fazer upgrade ou downgrade do seu plano a qualquer momento. O valor será ajustado proporcionalmente (pro-rata) no próximo ciclo de cobrança.</p>

<h2>7. Canais de Contato</h2>
<p>Para dúvidas sobre compras, assinaturas ou reembolsos, entre em contato:</p>
<ul>
<li><strong>E-mail financeiro:</strong> <a href="mailto:financeiro@sincla.com.br">financeiro@sincla.com.br</a></li>
<li><strong>E-mail geral:</strong> <a href="mailto:contato@sincla.com.br">contato@sincla.com.br</a></li>
<li><strong>WhatsApp:</strong> (11) 99999-9999</li>
<li><strong>Site:</strong> <a href="https://sincla.com.br/suporte">sincla.com.br/suporte</a></li>
</ul>
`
    }
};

export function LegalPage() {
    const { slug: paramSlug } = useParams<{ slug: string }>();
    const location = useLocation();

    // Extract slug from pathname for static routes, or use param for /legal/:slug
    const slug = paramSlug || location.pathname.replace(/^\//, '');
    const canonicalSlug = SLUG_MAP[slug] || slug;

    const [page, setPage] = useState<LegalPageData | null>(null);
    const [loading, setLoading] = useState(true);
    const [resolvedContent, setResolvedContent] = useState('');

    useEffect(() => {
        const fetchPage = async () => {
            if (!slug) {
                // Usa fallback se disponível
                useFallback();
                return;
            }

            setLoading(true);

            try {
                if (!supabase) {
                    useFallback();
                    return;
                }

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
                    useFallback();
                    return;
                }

                setPage(pageRes.data);
                const settings = settingsRes.data || [];
                const html = resolveVariables(pageRes.data.content, settings);
                setResolvedContent(html);
            } catch (err: any) {
                console.error('Error fetching legal page:', err);
                useFallback();
            } finally {
                setLoading(false);
            }
        };

        const useFallback = () => {
            const fallback = FALLBACK_CONTENT[canonicalSlug];
            if (fallback) {
                setPage({ id: 'static', slug: canonicalSlug, title: fallback.title, content: fallback.content, version: 1, published_at: new Date().toISOString(), updated_at: '2026-03-01T00:00:00Z' });
                setResolvedContent(resolveVariables(fallback.content, []));
            }
            setLoading(false);
        };

        fetchPage();
    }, [slug, canonicalSlug]);

    return (
        <div style={{ background: 'var(--bg-dark, #0a0a1a)', color: 'var(--text-primary, #e1e1e6)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <Header />
            <main style={{ flex: 1, paddingTop: '100px', paddingBottom: '60px' }}>
                <Container size="md">
                    {loading ? (
                        <Center py={100}>
                            <Loader size="lg" />
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
