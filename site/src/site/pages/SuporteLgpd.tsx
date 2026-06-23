import { Container, Title, Text, Box, SimpleGrid, Card, Group, Button, ThemeIcon, Stack, List, Badge, Accordion } from '@mantine/core';
import { 
    IconShieldLock, 
    IconUserCheck, 
    IconMail, 
    IconDatabase, 
    IconHistory, 
    IconArrowRight, 
    IconDeviceLaptop, 
    IconUsers, 
    IconChevronRight, 
    IconLock,
    IconFileSpreadsheet,
    IconCheck
} from '@tabler/icons-react';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { SignatureVisual } from '../components/signature-visual';

export function SuporteLgpd() {
    const SIGNUP_URL = 'https://app.sincla.com.br/cadastro';
    
    return (
        <div style={{ background: 'var(--bg-dark, #0a0a1a)', color: 'var(--text-primary, #e1e1e6)', minHeight: '100vh', display: 'flex', flexDirection: 'column', overflowX: 'hidden', position: 'relative' }}>
            {/* Assinatura Visual Sincla - Partículas de Fundo */}
            <SignatureVisual />

            {/* Header */}
            <Header />

            {/* Main Content */}
            <main style={{ flex: 1, paddingTop: '120px', paddingBottom: '80px', position: 'relative', zIndex: 2 }}>
                
                {/* 1. HERO SECTION */}
                <Container size="lg" mb={80}>
                    <Stack align="center" gap="xl" style={{ textAlign: 'center' }}>
                        <Badge variant="gradient" gradient={{ from: '#0087ff', to: '#00c6ff' }} size="lg" py="md" px="lg">
                            Conformidade e Transparência
                        </Badge>
                        <Title 
                            order={1} 
                            style={{ 
                                fontSize: 'calc(1.8rem + 2vw)', 
                                fontWeight: 800, 
                                lineHeight: 1.2,
                                color: 'white',
                                maxWidth: '900px'
                            }}
                        >
                            Sincla & LGPD: Segurança e Confiança para sua Empresa
                        </Title>
                        <Text 
                            size="xl" 
                            c="dimmed" 
                            style={{ maxWidth: '750px', lineHeight: 1.6 }}
                        >
                            Atuamos lado a lado com nossos clientes para fornecer tecnologia inovadora em total conformidade com a Lei Geral de Proteção de Dados (LGPD). Conheça nossos canais de suporte e nossa estrutura de governança.
                        </Text>
                        
                        <Group gap="md" mt="md" wrap="wrap" justify="center">
                            <Button 
                                component="a"
                                href={SIGNUP_URL}
                                size="lg"
                                radius="md"
                                variant="gradient"
                                gradient={{ from: '#0087ff', to: '#00c6ff' }}
                                rightSection={<IconArrowRight size={18} />}
                                style={{ boxShadow: '0 4px 15px rgba(0, 135, 255, 0.3)' }}
                            >
                                Começar no Sincla Hub
                            </Button>
                            <Button 
                                component="a"
                                href="mailto:privacidade@sincla.com.br"
                                size="lg"
                                radius="md"
                                variant="outline"
                                color="blue"
                                leftSection={<IconMail size={18} />}
                                styles={{
                                    root: {
                                        border: '1px solid rgba(0, 135, 255, 0.4)',
                                        background: 'rgba(0, 135, 255, 0.05)',
                                        color: 'white',
                                        '&:hover': {
                                            background: 'rgba(0, 135, 255, 0.12)'
                                        }
                                    }
                                }}
                            >
                                Falar com o DPO
                            </Button>
                        </Group>
                    </Stack>
                </Container>

                {/* 2. RESPONSABILIDADES SECTION */}
                <Box py={60} style={{ background: 'rgba(255, 255, 255, 0.02)', borderTop: '1px solid rgba(255, 255, 255, 0.05)', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <Container size="lg">
                        <Stack gap="xl">
                            <div style={{ textAlign: 'center' }}>
                                <Title order={2} style={{ color: 'white', fontSize: '2rem' }} mb="xs">
                                    Quem é quem no tratamento de dados?
                                </Title>
                                <Text size="md" c="dimmed" style={{ maxWidth: '600px', margin: '0 auto' }}>
                                    Entender os papéis sob a LGPD garante maior segurança jurídica e tranquilidade comercial para sua operação.
                                </Text>
                            </div>

                            <SimpleGrid cols={{ base: 1, md: 2 }} spacing={30} mt="lg">
                                {/* Operadora */}
                                <Card 
                                    padding="xl" 
                                    radius="md" 
                                    style={{ 
                                        background: 'rgba(255, 255, 255, 0.03)', 
                                        border: '1px solid rgba(255, 255, 255, 0.08)',
                                        height: '100%'
                                    }}
                                >
                                    <Group mb="md" justify="space-between">
                                        <Badge color="blue" variant="light" size="lg">A Sincla como Operadora</Badge>
                                        <ThemeIcon size={40} radius="md" color="blue" variant="light">
                                            <IconDeviceLaptop size={22} />
                                        </ThemeIcon>
                                    </Group>
                                    <Text fw={600} size="lg" c="white" mb="sm">
                                        Processamento de Dados sob Comando
                                    </Text>
                                    <Text size="sm" c="dimmed" style={{ lineHeight: 1.6 }} mb="md">
                                        Nas soluções corporativas como o <strong>Sincla RH</strong>, a empresa assinante é a <strong>Controladora</strong> dos dados pessoais (responsável por admitir membros da equipe, obter bases legais de colaboradores e decidir sobre exclusões). A Sincla atua estritamente como <strong>Operadora</strong>, processando as informações com alta tecnologia e segurança para viabilizar as rotinas de recursos humanos e avaliações solicitadas pela sua empresa.
                                    </Text>
                                    <List spacing="xs" size="sm" c="dimmed" icon={<IconCheck size={14} color="#0087ff" />}>
                                        <List.Item>Garantia de segurança da infraestrutura de dados.</List.Item>
                                        <List.Item>Execução de exclusões e relatórios a comando do cliente.</List.Item>
                                        <List.Item>Armazenamento isolado por empresa (Multi-Tenant).</List.Item>
                                    </List>
                                </Card>

                                {/* Controladora */}
                                <Card 
                                    padding="xl" 
                                    radius="md" 
                                    style={{ 
                                        background: 'rgba(255, 255, 255, 0.03)', 
                                        border: '1px solid rgba(255, 255, 255, 0.08)',
                                        height: '100%'
                                    }}
                                >
                                    <Group mb="md" justify="space-between">
                                        <Badge color="cyan" variant="light" size="lg">A Sincla como Controladora</Badge>
                                        <ThemeIcon size={40} radius="md" color="cyan" variant="light">
                                            <IconUsers size={22} />
                                        </ThemeIcon>
                                    </Group>
                                    <Text fw={600} size="lg" c="white" mb="sm">
                                        Dados Cadastrais e Relações Diretas
                                    </Text>
                                    <Text size="sm" c="dimmed" style={{ lineHeight: 1.6 }} mb="md">
                                        A Sincla assume a posição de <strong>Controladora</strong> para dados cadastrais e financeiros de contato comercial de seus clientes diretos, além dos dados de perfis e currículos que os próprios candidatos ou alunos inserem voluntariamente no <strong>Sincla Hub</strong>, <strong>Sincla Recrutamento</strong> ou <strong>Sincla EAD</strong>. Nesses casos, fornecemos o controle completo ao próprio usuário titular para gerenciar e apagar suas informações de forma direta.
                                    </Text>
                                    <List spacing="xs" size="sm" c="dimmed" icon={<IconCheck size={14} color="#00c6ff" />}>
                                        <List.Item>Consentimento e autonomia do candidato no Hub.</List.Item>
                                        <List.Item>Exclusão direta e instantânea de currículos pelo usuário.</List.Item>
                                        <List.Item>Transparência total nos termos de uso de cada módulo.</List.Item>
                                    </List>
                                </Card>
                              </SimpleGrid>
                        </Stack>
                    </Container>
                </Box>

                {/* 3. CANAIS DE SUPORTE */}
                <Container size="lg" py={60}>
                    <Stack gap="xl">
                        <div style={{ textAlign: 'center' }}>
                            <Title order={2} style={{ color: 'white', fontSize: '2rem' }} mb="xs">
                                Canais de Atendimento e Suporte LGPD
                            </Title>
                            <Text size="md" c="dimmed" style={{ maxWidth: '600px', margin: '0 auto' }}>
                                Estrutura dedicada para gerenciar as requisições de titulares de dados e apoiar o time de conformidade de nossos parceiros comerciais.
                            </Text>
                        </div>

                        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg" mt="lg">
                            {/* Canal Encarregado */}
                            <Card 
                                padding="lg" 
                                radius="md" 
                                style={{ 
                                    background: 'rgba(255, 255, 255, 0.02)', 
                                    border: '1px solid rgba(255, 255, 255, 0.06)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between'
                                }}
                            >
                                <div>
                                    <ThemeIcon size={46} radius="md" color="blue" variant="light" mb="md">
                                        <IconShieldLock size={24} />
                                    </ThemeIcon>
                                    <Text fw={650} c="white" size="lg" mb="xs">Encarregado (DPO)</Text>
                                    <Text size="sm" c="dimmed" style={{ lineHeight: 1.5 }} mb="lg">
                                        Canal exclusivo monitorado pelo Encarregado de Proteção de Dados (DPO) geral para atender auditorias, relatórios de impacto, e requisições formais de privacidade.
                                    </Text>
                                </div>
                                <Button 
                                    component="a"
                                    href="mailto:privacidade@sincla.com.br"
                                    variant="light" 
                                    color="blue" 
                                    fullWidth
                                    rightSection={<IconChevronRight size={14} />}
                                >
                                    privacidade@sincla.com.br
                                </Button>
                            </Card>

                            {/* Canal Clientes Corporativos */}
                            <Card 
                                padding="lg" 
                                radius="md" 
                                style={{ 
                                    background: 'rgba(255, 255, 255, 0.02)', 
                                    border: '1px solid rgba(255, 255, 255, 0.06)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between'
                                }}
                            >
                                <div>
                                    <ThemeIcon size={46} radius="md" color="teal" variant="light" mb="md">
                                        <IconDeviceLaptop size={24} />
                                    </ThemeIcon>
                                    <Text fw={650} c="white" size="lg" mb="xs">Suporte para Clientes (RH)</Text>
                                    <Text size="sm" c="dimmed" style={{ lineHeight: 1.5 }} mb="lg">
                                        Para administradores do sistema que precisam de assistência na exportação complexa de relatórios ou ações administrativas em massa nos dados dos colaboradores.
                                    </Text>
                                </div>
                                <Button 
                                    component="a"
                                    href="/ticket-suporte"
                                    variant="light" 
                                    color="teal" 
                                    fullWidth
                                    rightSection={<IconChevronRight size={14} />}
                                >
                                    Abrir Ticket Administrativo
                                </Button>
                            </Card>

                            {/* Canal Usuários Finais */}
                            <Card 
                                padding="lg" 
                                radius="md" 
                                style={{ 
                                    background: 'rgba(255, 255, 255, 0.02)', 
                                    border: '1px solid rgba(255, 255, 255, 0.06)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between'
                                }}
                            >
                                <div>
                                    <ThemeIcon size={46} radius="md" color="violet" variant="light" mb="md">
                                        <IconUserCheck size={24} />
                                    </ThemeIcon>
                                    <Text fw={650} c="white" size="lg" mb="xs">Autonomia do Titular</Text>
                                    <Text size="sm" c="dimmed" style={{ lineHeight: 1.5 }} mb="lg">
                                        Candidatos e alunos do ecossistema Sincla contam com canais automatizados dentro do próprio perfil do Sincla Hub para exclusão, alteração ou exportação de seus dados pessoais.
                                    </Text>
                                </div>
                                <Button 
                                    component="a"
                                    href="https://app.sincla.com.br/login"
                                    variant="light" 
                                    color="violet" 
                                    fullWidth
                                    rightSection={<IconChevronRight size={14} />}
                                >
                                    Acessar o Painel do Hub
                                </Button>
                            </Card>
                        </SimpleGrid>
                    </Stack>
                </Container>

                {/* 4. RECURSOS DE CONFORMIDADE */}
                <Box py={60} style={{ background: 'rgba(255, 255, 255, 0.01)', borderTop: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <Container size="lg">
                        <Stack gap="xl">
                            <div style={{ textAlign: 'center' }}>
                                <Badge color="blue" size="md" mb="xs">Recursos do Produto</Badge>
                                <Title order={2} style={{ color: 'white', fontSize: '2rem' }} mb="xs">
                                    Funcionalidades de Privacidade Inclusas
                                </Title>
                                <Text size="md" c="dimmed" style={{ maxWidth: '600px', margin: '0 auto' }}>
                                    Nossas plataformas são desenvolvidas com o conceito de Privacy by Design. Entregamos ferramentas completas para a conformidade do seu negócio.
                                </Text>
                            </div>

                            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xl" mt="lg">
                                {/* Esquecimento */}
                                <Group align="flex-start" gap="md" wrap="nowrap">
                                    <ThemeIcon size={42} radius="md" color="blue" variant="light" style={{ flexShrink: 0 }}>
                                        <IconLock size={20} />
                                    </ThemeIcon>
                                    <Box>
                                        <Text fw={600} c="white" size="md" mb={4}>Direito ao Esquecimento Facilitado</Text>
                                        <Text size="sm" c="dimmed" style={{ lineHeight: 1.6 }}>
                                            Ferramenta para administradores da empresa anonimizarem ou excluírem cadastros de colaboradores desligados, eliminando riscos de passivos trabalhistas associados a dados legados.
                                        </Text>
                                    </Box>
                                </Group>

                                {/* Exportabilidade */}
                                <Group align="flex-start" gap="md" wrap="nowrap">
                                    <ThemeIcon size={42} radius="md" color="cyan" variant="light" style={{ flexShrink: 0 }}>
                                        <IconFileSpreadsheet size={20} />
                                    </ThemeIcon>
                                    <Box>
                                        <Text fw={600} c="white" size="md" mb={4}>Exportabilidade e Portabilidade</Text>
                                        <Text size="sm" c="dimmed" style={{ lineHeight: 1.6 }}>
                                            Se um colaborador solicitar os dados que a empresa possui dele no Sincla RH, você gera em um clique relatórios completos em formato estruturado pronto para envio.
                                        </Text>
                                    </Box>
                                </Group>

                                {/* Criptografia */}
                                <Group align="flex-start" gap="md" wrap="nowrap">
                                    <ThemeIcon size={42} radius="md" color="teal" variant="light" style={{ flexShrink: 0 }}>
                                        <IconDatabase size={20} />
                                    </ThemeIcon>
                                    <Box>
                                        <Text fw={600} c="white" size="md" mb={4}>Criptografia em Repouso e Trânsito</Text>
                                        <Text size="sm" c="dimmed" style={{ lineHeight: 1.6 }}>
                                            Todos os dados trafegam de ponta a ponta sob protocolo HTTPS/TLS e são persistidos criptografados (AES-256) em bancos de dados isolados, seguindo os maiores padrões internacionais.
                                        </Text>
                                    </Box>
                                </Group>

                                {/* Logs */}
                                <Group align="flex-start" gap="md" wrap="nowrap">
                                    <ThemeIcon size={42} radius="md" color="violet" variant="light" style={{ flexShrink: 0 }}>
                                        <IconHistory size={20} />
                                    </ThemeIcon>
                                    <Box>
                                        <Text fw={600} c="white" size="md" mb={4}>Trilha de Auditoria (Logs)</Text>
                                        <Text size="sm" c="dimmed" style={{ lineHeight: 1.6 }}>
                                            Registramos as ações dos administradores, tais como acessos e exclusões de informações sensíveis, permitindo que a empresa emita relatórios de auditoria exigidos pela ANPD.
                                        </Text>
                                    </Box>
                                </Group>
                            </SimpleGrid>
                        </Stack>
                    </Container>
                </Box>

                {/* 5. FAQ SECTON */}
                <Container size="md" py={60}>
                    <Stack gap="xl">
                        <div style={{ textAlign: 'center' }}>
                            <Title order={2} style={{ color: 'white', fontSize: '1.8rem' }} mb="xs">
                                Dúvidas Frequentes sobre a LGPD na Sincla
                            </Title>
                            <Text size="sm" c="dimmed">
                                Esclarecimentos rápidos para apoiar sua equipe jurídica e de conformidade.
                            </Text>
                        </div>

                        <Accordion 
                            variant="separated" 
                            styles={{
                                item: {
                                    background: 'rgba(255, 255, 255, 0.02)',
                                    border: '1px solid rgba(255, 255, 255, 0.06)',
                                    borderRadius: '8px',
                                    marginBottom: '10px'
                                },
                                control: {
                                    color: 'white',
                                    fontWeight: 600,
                                    fontSize: '15px',
                                    padding: '16px',
                                    '&:hover': {
                                        background: 'rgba(255, 255, 255, 0.04)'
                                    }
                                },
                                panel: {
                                    color: 'rgba(255, 255, 255, 0.7)',
                                    lineHeight: 1.6,
                                    fontSize: '14px',
                                    padding: '0 16px 16px 16px'
                                }
                            }}
                        >
                            <Accordion.Item value="rh-dados">
                                <Accordion.Control>Como o Sincla RH lida com os dados do colaborador?</Accordion.Control>
                                <Accordion.Panel>
                                    O colaborador fornece seus dados diretamente para a empresa empregadora (sua assinante). A empresa atua como controladora e é responsável pela base legal do tratamento. A Sincla disponibiliza a infraestrutura tecnológica segura de armazenamento e as ferramentas de acesso para que o RH da empresa administre as informações.
                                </Accordion.Panel>
                            </Accordion.Item>

                            <Accordion.Item value="exclusao-curriculos">
                                <Accordion.Control>Como funciona a exclusão de currículos e cadastros?</Accordion.Control>
                                <Accordion.Panel>
                                    Nos módulos de Recrutamento (Vagas) e EAD (Cursos), o titular de dados possui autonomia total. Ele pode solicitar a alteração ou a remoção definitiva do seu currículo e histórico a qualquer momento, diretamente por meio do painel do usuário no Sincla Hub, respeitando os direitos estabelecidos pela LGPD.
                                </Accordion.Panel>
                            </Accordion.Item>

                            <Accordion.Item value="seguranca-infra">
                                <Accordion.Control>Onde os dados ficam armazenados?</Accordion.Control>
                                <Accordion.Panel>
                                    Os dados são hospedados em infraestrutura de nuvem segura (utilizando parceiros globais de referência como a Supabase/AWS) com backups automatizados, redundância de sistemas, controle rígido de acesso lógico, criptografia em trânsito e em repouso.
                                </Accordion.Panel>
                            </Accordion.Item>

                            <Accordion.Item value="relatorio-impacto">
                                <Accordion.Control>Vocês fornecem apoio para a elaboração de RIPD?</Accordion.Control>
                                <Accordion.Panel>
                                    Sim. O nosso time jurídico e o DPO apoiam empresas clientes no fornecimento das informações de arquitetura de dados e de segurança necessárias para a elaboração do Relatório de Impacto à Proteção de Dados Pessoais (RIPD).
                                </Accordion.Panel>
                            </Accordion.Item>
                        </Accordion>
                    </Stack>
                </Container>

                {/* 6. CTA FINAL BANNER */}
                <Container size="lg" mt={40}>
                    <Card
                        padding="xl"
                        radius="md"
                        style={{
                            background: 'linear-gradient(135deg, rgba(0, 135, 255, 0.15) 0%, rgba(0, 198, 255, 0.08) 100%)',
                            border: '1px solid rgba(0, 135, 255, 0.3)',
                            boxShadow: '0 8px 32px rgba(0, 135, 255, 0.15)',
                            paddingTop: '60px',
                            paddingBottom: '60px',
                            textAlign: 'center'
                        }}
                    >
                        <Stack gap="md" align="center">
                            <ThemeIcon size={56} radius="xl" color="blue" variant="light">
                                <IconShieldLock size={32} />
                            </ThemeIcon>
                            <Title order={2} style={{ color: 'white', fontSize: '2rem' }}>
                                Garanta a conformidade do seu RH e a segurança da sua empresa
                            </Title>
                            <Text size="md" c="dimmed" style={{ maxWidth: '650px', lineHeight: 1.6 }} mb="md">
                                Junte-se a mais de 5.000 clientes satisfeitos que contam com a Sincla para gerenciar suas equipes de forma automatizada, transparente e em total conformidade com a LGPD.
                            </Text>
                            <Button
                                component="a"
                                href={SIGNUP_URL}
                                size="lg"
                                radius="md"
                                variant="gradient"
                                gradient={{ from: '#0087ff', to: '#00c6ff' }}
                                rightSection={<IconArrowRight size={18} />}
                                style={{ boxShadow: '0 4px 15px rgba(0, 135, 255, 0.2)' }}
                            >
                                Cadastrar-se no Sincla Hub
                            </Button>
                        </Stack>
                    </Card>
                </Container>

            </main>

            {/* Footer */}
            <Footer />
        </div>
    );
}
