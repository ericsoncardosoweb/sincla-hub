import { Card, Text, Group, Stack, ThemeIcon, Badge, Button, Paper, SimpleGrid } from '@mantine/core';
import { IconRocket, IconArrowRight, IconBuilding, IconUser } from '@tabler/icons-react';
import type { CompanyAccountType } from '../../../shared/lib/companyAccountType';
import { companyAccountTypeLabel } from '../../../shared/lib/companyAccountType';

export interface ToolCatalogItem {
    id: string;
    name: string;
    description: string | null;
    brand_color: string | null;
    icon: string;
    startingPlan: {
        name: string;
        price_monthly: number;
        features: string[];
    } | null;
}

interface Props {
    products: ToolCatalogItem[];
    accountType: CompanyAccountType;
    iconMap: Record<string, typeof IconRocket>;
    onSelectProduct: (productId: string) => void;
    ctaLabel?: string;
}

const fmt = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export function StartWithToolPanel({ products, accountType, iconMap, onSelectProduct, ctaLabel = 'Ver planos e contratar' }: Props) {
    const AccountIcon = accountType === 'pj' ? IconBuilding : IconUser;

    return (
        <Stack gap="lg">
            <Paper withBorder radius="md" p="lg" style={{ borderColor: 'var(--mantine-color-blue-3)', background: 'var(--mantine-color-blue-0)' }}>
                <Group gap="sm" wrap="nowrap" align="flex-start">
                    <ThemeIcon size="xl" radius="md" variant="light" color="blue">
                        <IconRocket size={22} />
                    </ThemeIcon>
                    <Stack gap={4}>
                        <Text fw={700} size="lg">Escolha sua primeira ferramenta</Text>
                        <Text size="sm" c="dimmed">
                            Comece contratando uma ferramenta Sincla. Depois você adiciona módulos extras e gerencia armazenamento e créditos de IA na aba Recursos.
                        </Text>
                        <Badge variant="light" color="blue" leftSection={<AccountIcon size={12} />} w="fit-content" mt={4}>
                            Planos para {companyAccountTypeLabel(accountType)}
                        </Badge>
                    </Stack>
                </Group>
            </Paper>

            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                {products.map((product) => {
                    const color = product.brand_color || '#0047CC';
                    const IconComp = iconMap[product.icon] || IconRocket;
                    const start = product.startingPlan;

                    return (
                        <Card key={product.id} withBorder radius="md" padding="md">
                            <Group align="flex-start" wrap="nowrap" gap="md">
                                <ThemeIcon size={44} radius="md" variant="light" style={{ backgroundColor: `${color}18`, color, flexShrink: 0 }}>
                                    <IconComp size={22} />
                                </ThemeIcon>
                                <Stack gap={6} style={{ flex: 1, minWidth: 0 }}>
                                    <Text fw={700}>{product.name}</Text>
                                    {product.description && (
                                        <Text size="sm" c="dimmed" lineClamp={3}>{product.description}</Text>
                                    )}
                                    {start && (
                                        <Group gap="xs">
                                            <Text size="xs" c="dimmed">A partir de</Text>
                                            <Text size="sm" fw={700}>
                                                {start.price_monthly > 0 ? `${fmt(start.price_monthly)}/mês` : 'Grátis ou sob consulta'}
                                            </Text>
                                            <Text size="xs" c="dimmed">· {start.name}</Text>
                                        </Group>
                                    )}
                                    {start?.features?.length ? (
                                        <Text size="xs" c="dimmed" lineClamp={2}>{start.features.slice(0, 3).join(' · ')}</Text>
                                    ) : null}
                                    <Button
                                        mt={4}
                                        variant="filled"
                                        style={{ backgroundColor: color }}
                                        rightSection={<IconArrowRight size={16} />}
                                        onClick={() => onSelectProduct(product.id)}
                                    >
                                        {ctaLabel}
                                    </Button>
                                </Stack>
                            </Group>
                        </Card>
                    );
                })}
            </SimpleGrid>

            {products.length === 0 && (
                <Text size="sm" c="dimmed" ta="center" py="xl">
                    Nenhuma ferramenta com planos disponíveis para {companyAccountTypeLabel(accountType).toLowerCase()}.
                </Text>
            )}
        </Stack>
    );
}
