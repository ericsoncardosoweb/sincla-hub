import { SimpleGrid, Card, Text, Group, Box, Button, TextInput, Textarea, Select, ThemeIcon } from '@mantine/core';
import { IconMail, IconPhone, IconMapPin, IconBrandLinkedin, IconBrandTwitter, IconSend } from '@tabler/icons-react';
import { PageTemplate } from '../../components/page-template';

const contactInfo = [
    {
        icon: IconMail,
        title: 'Email',
        value: 'contato@sincla.com.br',
        action: 'Enviar email',
    },
    {
        icon: IconPhone,
        title: 'Telefone',
        value: '+55 (11) 4000-1234',
        action: 'Ligar agora',
    },
    {
        icon: IconMapPin,
        title: 'Endereço',
        value: 'Av. Paulista, 1000 - São Paulo, SP',
        action: 'Ver no mapa',
    },
];

export function Contato() {
    return (
        <PageTemplate
            title="Fale com a Gente"
            subtitle="Estamos aqui para ajudar. Entre em contato conosco"
            breadcrumbs={[
                { label: 'Início', href: '/' },
                { label: 'Contato' },
            ]}
        >
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
                {/* Contact Form */}
                <Card
                    padding="xl"
                    radius="md"
                    style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                    }}
                >
                    <Text fw={600} size="lg" c="white" mb="md">
                        Envie sua mensagem
                    </Text>
                    <form>
                        <TextInput
                            label="Nome"
                            placeholder="Seu nome completo"
                            mb="md"
                            styles={{
                                input: {
                                    background: 'rgba(255, 255, 255, 0.04)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    color: 'white',
                                },
                            }}
                        />
                        <TextInput
                            label="Email"
                            placeholder="seu@email.com"
                            mb="md"
                            styles={{
                                input: {
                                    background: 'rgba(255, 255, 255, 0.04)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    color: 'white',
                                },
                            }}
                        />
                        <Select
                            label="Assunto"
                            placeholder="Selecione um assunto"
                            mb="md"
                            data={[
                                'Dúvidas sobre produtos',
                                'Suporte técnico',
                                'Parcerias',
                                'Imprensa',
                                'Outros',
                            ]}
                            styles={{
                                input: {
                                    background: 'rgba(255, 255, 255, 0.04)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    color: 'white',
                                },
                            }}
                        />
                        <Textarea
                            label="Mensagem"
                            placeholder="Como podemos ajudar?"
                            rows={4}
                            mb="md"
                            styles={{
                                input: {
                                    background: 'rgba(255, 255, 255, 0.04)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    color: 'white',
                                },
                            }}
                        />
                        <Button
                            fullWidth
                            variant="gradient"
                            gradient={{ from: '#0087ff', to: '#00c6ff' }}
                            leftSection={<IconSend size={16} />}
                        >
                            Enviar mensagem
                        </Button>
                    </form>
                </Card>

                {/* Contact Info */}
                <Box>
                    <Text fw={600} size="lg" c="white" mb="md">
                        Outras formas de contato
                    </Text>
                    {contactInfo.map((item, index) => (
                        <Card
                            key={index}
                            padding="lg"
                            radius="md"
                            mb="md"
                            style={{
                                background: 'rgba(255, 255, 255, 0.03)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                            }}
                        >
                            <Group>
                                <ThemeIcon
                                    size={50}
                                    radius="md"
                                    variant="light"
                                    color="blue"
                                >
                                    <item.icon size={24} />
                                </ThemeIcon>
                                <Box>
                                    <Text size="sm" c="dimmed">{item.title}</Text>
                                    <Text fw={500} c="white">{item.value}</Text>
                                </Box>
                            </Group>
                        </Card>
                    ))}

                    {/* Social */}
                    <Text fw={600} c="white" mt="xl" mb="md">
                        Redes Sociais
                    </Text>
                    <Group>
                        <Button variant="light" color="blue" leftSection={<IconBrandLinkedin size={18} />}>
                            LinkedIn
                        </Button>
                        <Button variant="light" color="blue" leftSection={<IconBrandTwitter size={18} />}>
                            Twitter
                        </Button>
                    </Group>
                </Box>
            </SimpleGrid>
        </PageTemplate>
    );
}
