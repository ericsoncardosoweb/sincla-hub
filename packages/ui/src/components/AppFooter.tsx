import { Container, Group, Text, ActionIcon, Anchor, Stack, Divider, SimpleGrid } from '@mantine/core';
import { IconBrandGithub, IconBrandLinkedin, IconBrandInstagram } from '@tabler/icons-react';

interface FooterLink {
    label: string;
    href: string;
}

interface FooterGroup {
    title: string;
    links: FooterLink[];
}

interface AppFooterProps {
    groups?: FooterGroup[];
}

const defaultGroups: FooterGroup[] = [
    {
        title: 'Produto',
        links: [
            { label: 'Sincla RH', href: '/rh' },
            { label: 'Sincla EAD', href: '/ead' },
            { label: 'Sincla Bolso', href: '/bolso' },
            { label: 'Sincla Leads', href: '/leads' },
        ],
    },
    {
        title: 'Empresa',
        links: [
            { label: 'Sobre nós', href: '/empresa' },
            { label: 'Carreiras', href: '/carreiras' },
            { label: 'Blog', href: '/blog' },
            { label: 'Contato', href: '/contato' },
        ],
    },
    {
        title: 'Recursos',
        links: [
            { label: 'Documentação', href: '/documentacao' },
            { label: 'Suporte', href: '/suporte' },
            { label: 'Comunidade', href: '/comunidade' },
            { label: 'Status', href: '/status' },
        ],
    },
];

/**
 * Footer padrão do ecossistema Sincla.
 * Pode ser customizado com grupos de links específicos por app.
 */
export function AppFooter({ groups = defaultGroups }: AppFooterProps) {
    const currentYear = new Date().getFullYear();

    return (
        <footer style={{
            backgroundColor: 'var(--sincla-bg-elevated)',
            borderTop: '1px solid var(--sincla-border)',
            padding: '48px 0 24px',
            marginTop: 'auto',
        }}>
            <Container size="xl">
                <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="xl">
                    {/* Brand */}
                    <Stack gap="sm">
                        <Text fw={700} size="lg" className="sincla-gradient-text">
                            Sincla
                        </Text>
                        <Text size="sm" c="dimmed" maw={250}>
                            Um hub. Todas as suas ferramentas. Centralize a gestão do seu negócio em um único ecossistema.
                        </Text>
                        <Group gap="xs" mt="xs">
                            <ActionIcon variant="subtle" color="gray" size="lg">
                                <IconBrandInstagram size={18} />
                            </ActionIcon>
                            <ActionIcon variant="subtle" color="gray" size="lg">
                                <IconBrandLinkedin size={18} />
                            </ActionIcon>
                            <ActionIcon variant="subtle" color="gray" size="lg">
                                <IconBrandGithub size={18} />
                            </ActionIcon>
                        </Group>
                    </Stack>

                    {/* Link Groups */}
                    {groups.map((group) => (
                        <Stack key={group.title} gap="xs">
                            <Text fw={600} size="sm" tt="uppercase" c="dimmed">
                                {group.title}
                            </Text>
                            {group.links.map((link) => (
                                <Anchor
                                    key={link.label}
                                    href={link.href}
                                    c="dimmed"
                                    size="sm"
                                    underline="hover"
                                >
                                    {link.label}
                                </Anchor>
                            ))}
                        </Stack>
                    ))}
                </SimpleGrid>

                <Divider my="xl" color="var(--sincla-border)" />

                <Group justify="space-between">
                    <Text size="xs" c="dimmed">
                        © {currentYear} Sincla. Todos os direitos reservados.
                    </Text>
                    <Group gap="md">
                        <Anchor href="/termos" size="xs" c="dimmed" underline="hover">
                            Termos de Uso
                        </Anchor>
                        <Anchor href="/privacidade" size="xs" c="dimmed" underline="hover">
                            Privacidade
                        </Anchor>
                    </Group>
                </Group>
            </Container>
        </footer>
    );
}
