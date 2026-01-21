import { Container, Title, Text, Stack, SimpleGrid, Card, Group, Box, Button, Accordion, TextInput, Textarea, ThemeIcon } from '@mantine/core';
import { IconHeadset, IconBook, IconUsers, IconMessageCircle, IconMail, IconArrowRight, IconChevronDown } from '@tabler/icons-react';
import classes from './Support.module.css';

const supportChannels = [
    {
        icon: IconBook,
        title: 'Base de Conhecimento',
        description: 'Tutoriais e guias organizados.',
        action: 'Acessar',
    },
    {
        icon: IconMessageCircle,
        title: 'Chat com Suporte',
        description: 'Atendimento em tempo real.',
        action: 'Iniciar Chat',
    },
    {
        icon: IconUsers,
        title: 'Consultores',
        description: 'Profissionais certificados.',
        action: 'Encontrar',
    },
    {
        icon: IconHeadset,
        title: 'Suporte Premium',
        description: 'Atendimento prioritário.',
        action: 'Agendar',
    },
];

const faqs = [
    {
        question: 'Como funciona o cadastro unificado?',
        answer: 'Ao se cadastrar no Sincla Hub, você tem acesso a todas as plataformas com um único login. Seus dados são sincronizados automaticamente.',
    },
    {
        question: 'Posso testar as plataformas gratuitamente?',
        answer: 'Sim! Todas as plataformas oferecem período de teste gratuito. Sem cartão de crédito.',
    },
    {
        question: 'Como funcionam os descontos para assinantes?',
        answer: 'Assinantes de qualquer produto Sincla têm 15% de desconto em outras plataformas. Colaboradores ganham 50% em ferramentas pessoais.',
    },
    {
        question: 'As plataformas são integradas entre si?',
        answer: 'Sim! O Sincla RH se integra com EAD para treinamentos e todas compartilham o mesmo ecossistema de autenticação.',
    },
];

export function Support() {
    return (
        <section className={classes.section} id="suporte">
            <Container size="xl">
                <Stack align="center" gap="md" mb={60}>
                    <Box className={classes.badge}>
                        <Text size="xs" fw={600} tt="uppercase" lts={0.5}>
                            Central de Suporte
                        </Text>
                    </Box>
                    <Title order={2} ta="center" className={classes.title}>
                        Estamos aqui para{' '}
                        <span className={classes.gradient}>ajudar</span>
                    </Title>
                    <Text className={classes.subtitle} ta="center" maw={500}>
                        Múltiplos canais de atendimento para garantir suporte quando precisar.
                    </Text>
                </Stack>

                {/* Support Channels */}
                <SimpleGrid
                    cols={{ base: 1, sm: 2, lg: 4 }}
                    spacing="lg"
                    mb={80}
                >
                    {supportChannels.map((channel) => (
                        <Card
                            key={channel.title}
                            className={classes.channelCard}
                        >
                            <ThemeIcon
                                size={50}
                                radius="xl"
                                variant="gradient"
                                gradient={{ from: '#0087ff', to: '#00c6ff', deg: 135 }}
                                mb="md"
                                className={classes.channelIcon}
                            >
                                <channel.icon size={24} />
                            </ThemeIcon>
                            <Text fw={700} size="lg" mb="xs" className={classes.channelTitle}>
                                {channel.title}
                            </Text>
                            <Text size="sm" className={classes.channelDescription} mb="lg">
                                {channel.description}
                            </Text>
                            <Button
                                variant="light"
                                color="blue"
                                fullWidth
                                rightSection={<IconArrowRight size={14} />}
                                className={classes.channelButton}
                            >
                                {channel.action}
                            </Button>
                        </Card>
                    ))}
                </SimpleGrid>

                {/* FAQ Section */}
                <Group wrap="wrap" align="flex-start" gap={60}>
                    <Box flex={1} miw={300}>
                        <Title order={3} mb="lg" className={classes.faqTitle}>
                            Perguntas Frequentes
                        </Title>
                        <Accordion
                            variant="separated"
                            className={classes.accordion}
                            chevron={<IconChevronDown size={20} />}
                        >
                            {faqs.map((faq, idx) => (
                                <Accordion.Item key={idx} value={`faq-${idx}`} className={classes.accordionItem}>
                                    <Accordion.Control className={classes.accordionControl}>
                                        {faq.question}
                                    </Accordion.Control>
                                    <Accordion.Panel className={classes.accordionPanel}>
                                        <Text size="sm" className={classes.accordionAnswer}>
                                            {faq.answer}
                                        </Text>
                                    </Accordion.Panel>
                                </Accordion.Item>
                            ))}
                        </Accordion>
                    </Box>

                    {/* Contact Form */}
                    <Card className={classes.contactCard} miw={350}>
                        <Group gap="sm" mb="lg">
                            <IconMail size={24} color="#0087ff" />
                            <Text fw={700} size="lg" className={classes.contactTitle}>
                                Envie uma mensagem
                            </Text>
                        </Group>
                        <Stack gap="md">
                            <TextInput
                                label="Nome"
                                placeholder="Seu nome"
                                classNames={{ input: classes.input, label: classes.inputLabel }}
                            />
                            <TextInput
                                label="E-mail"
                                placeholder="seu@email.com"
                                classNames={{ input: classes.input, label: classes.inputLabel }}
                            />
                            <Textarea
                                label="Mensagem"
                                placeholder="Como podemos ajudar?"
                                minRows={4}
                                classNames={{ input: classes.input, label: classes.inputLabel }}
                            />
                            <Button
                                variant="gradient"
                                gradient={{ from: '#0087ff', to: '#00c6ff', deg: 135 }}
                                fullWidth
                                mt="sm"
                                className={classes.submitButton}
                            >
                                Enviar Mensagem
                            </Button>
                        </Stack>
                    </Card>
                </Group>
            </Container>
        </section>
    );
}
