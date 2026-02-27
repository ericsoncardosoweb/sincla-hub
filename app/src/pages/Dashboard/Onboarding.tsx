import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Container, Title, Text, Card, Group, Stack,
    TextInput, Button, Stepper, SimpleGrid,
    Badge, ColorInput, Textarea,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import {
    IconBuilding, IconPackage, IconPalette,
} from '@tabler/icons-react';
import { useAuth } from '../../shared/contexts';
import { supabase } from '../../shared/lib/supabase';
import { WelcomeModal } from './components/WelcomeModal';

// ============================
// Types
// ============================

interface Product {
    id: string;
    name: string;
    description: string | null;
    icon: string;
    is_active: boolean;
}

// ============================
// Component
// ============================

export function Onboarding() {
    const navigate = useNavigate();
    const { subscriber, companies, refreshCompanies, setCurrentCompany } = useAuth();

    const [active, setActive] = useState(0);
    const [creating, setCreating] = useState(false);
    const [savingPersonalization, setSavingPersonalization] = useState(false);
    const [products, setProducts] = useState<Product[]>([]);

    const [createdCompanyId, setCreatedCompanyId] = useState<string | null>(null);

    // Welcome Modal state
    const [showWelcome, setShowWelcome] = useState(false);

    const form = useForm({
        initialValues: {
            name: '',
            slug: '',
        },
        validate: {
            name: (v) => (v.trim().length < 2 ? 'Nome é obrigatório' : null),
            slug: (v) => (v.trim().length < 2 ? 'Slug é obrigatório' : null),
        },
    });

    const personalizationForm = useForm({
        initialValues: {
            cnpj: '',
            description: '',
            primary_color: '#0087ff',
        }
    });

    useEffect(() => {
        // Show welcome modal if not seen before
        const seenWelcome = localStorage.getItem('@sincla/welcome-seen');
        if (!seenWelcome) {
            setShowWelcome(true);
        }
    }, []);

    const handleWelcomeClose = () => {
        localStorage.setItem('@sincla/welcome-seen', 'true');
        setShowWelcome(false);
    };

    // Auto-generate slug from name
    useEffect(() => {
        const slug = form.values.name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
        form.setFieldValue('slug', slug);
    }, [form.values.name]);

    // Skip to step directly if user already has companies
    useEffect(() => {
        if (companies.length > 0 && !createdCompanyId) {
            setCreatedCompanyId(companies[0].id);
            setActive(2); // Skip directly to products assuming they already created/customized one
        }
    }, [companies, createdCompanyId]);

    // Load products for step 3
    useEffect(() => {
        const loadProducts = async () => {
            const { data } = await supabase
                .from('products')
                .select('id, name, description, icon, is_active')
                .eq('is_active', true)
                .order('name');
            setProducts(data || []);
        };
        loadProducts();
    }, []);

    const handleCreateCompany = async (values: typeof form.values) => {
        if (!subscriber) return;
        setCreating(true);
        try {
            // Create company
            const { data, error } = await supabase
                .from('companies')
                .insert({
                    subscriber_id: subscriber.id,
                    name: values.name,
                    slug: values.slug,
                    email: subscriber.email || null,
                    phone: subscriber.phone || null,
                })
                .select()
                .single();

            if (error) throw error;

            // Add owner as member
            await supabase.from('company_members').insert({
                company_id: data.id,
                user_id: subscriber.id,
                role: 'owner',
            });

            await refreshCompanies();
            setCurrentCompany(data.id);
            setCreatedCompanyId(data.id);

            notifications.show({
                title: 'Empresa criada!',
                message: `${values.name} foi criada com sucesso. Vamos personalizá-la.`,
                color: 'green',
            });

            setActive(1);
        } catch (error: any) {
            console.error('Error creating company:', error);
            notifications.show({
                title: 'Erro',
                message: error.message || 'Não foi possível criar a empresa',
                color: 'red',
            });
        } finally {
            setCreating(false);
        }
    };

    const handlePersonalizeCompany = async (values: typeof personalizationForm.values) => {
        if (!createdCompanyId) return;
        setSavingPersonalization(true);
        try {
            const { error } = await supabase
                .from('companies')
                .update({
                    cnpj: values.cnpj || null,
                    description: values.description || null,
                    primary_color: values.primary_color || '#0087ff',
                })
                .eq('id', createdCompanyId);

            if (error) throw error;

            await refreshCompanies();

            notifications.show({
                title: 'Personalização Salva',
                message: 'Os dados foram atualizados com sucesso.',
                color: 'green',
            });

            setActive(2);
        } catch (error: any) {
            console.error('Error updating company:', error);
            notifications.show({
                title: 'Erro',
                message: error.message || 'Não foi possível salvar os dados',
                color: 'red',
            });
        } finally {
            setSavingPersonalization(false);
        }
    };

    const handleActivateProduct = (product: Product) => {
        // Redireciona para assinaturas já com a intenção de ativar a ferramenta
        navigate(`/painel/assinaturas?produto=${product.id}`);
    };

    return (
        <Container size="md" py="xl">
            {/* Welcome Modal automatically triggered via state */}
            {showWelcome && (
                <WelcomeModal
                    opened={showWelcome}
                    onClose={handleWelcomeClose}
                    userName={subscriber?.name?.split(' ')[0] || 'Novo Usuário'}
                />
            )}

            <Stack gap="xl">
                {/* Header */}
                <Group justify="center">
                    <Stack align="center" gap="xs">
                        <Title order={2} ta="center">Configuração Inicial</Title>
                        <Text c="dimmed" ta="center" maw={500}>
                            Siga os passos para criar o perfil do seu negócio e ativar sua primeira ferramenta.
                        </Text>
                    </Stack>
                </Group>

                {/* Stepper */}
                <Stepper
                    active={active}
                    onStepClick={setActive}
                    allowNextStepsSelect={false}
                    size="md"
                >
                    {/* Step 1: Create Company */}
                    <Stepper.Step
                        label="Sua Empresa"
                        description="Cadastre sua empresa"
                        icon={<IconBuilding size={18} />}
                    >
                        <Card shadow="sm" padding="xl" radius="md" withBorder mt="lg">
                            <form onSubmit={form.onSubmit(handleCreateCompany)}>
                                <Stack gap="md">
                                    <Title order={3}>Qual o nome do seu negócio?</Title>
                                    <Text c="dimmed" size="sm">
                                        Esse nome identificará seu workspace. Fique tranquilo, você poderá editar depois.
                                    </Text>

                                    <TextInput
                                        label="Nome da Empresa"
                                        placeholder="Ex: Minha Empresa Mágica"
                                        required
                                        {...form.getInputProps('name')}
                                    />
                                    <TextInput
                                        label="Slug (Identificador)"
                                        placeholder="minha-empresa"
                                        description="Será usado em links exclusivos."
                                        required
                                        {...form.getInputProps('slug')}
                                    />

                                    <Group justify="flex-end" mt="md">
                                        <Button type="submit" loading={creating} size="md">
                                            Criar Empresa
                                        </Button>
                                    </Group>
                                </Stack>
                            </form>
                        </Card>
                    </Stepper.Step>

                    {/* Step 2: Personalize Company */}
                    <Stepper.Step
                        label="Personalizar"
                        description="Detalhes da marca"
                        icon={<IconPalette size={18} />}
                    >
                        <Card shadow="sm" padding="xl" radius="md" withBorder mt="lg">
                            <form onSubmit={personalizationForm.onSubmit(handlePersonalizeCompany)}>
                                <Stack gap="md">
                                    <Title order={3}>Personalize sua Marca</Title>
                                    <Text c="dimmed" size="sm">
                                        Insira um CNPJ e uma cor para dar a cara da sua empresa à plataforma.
                                    </Text>

                                    <TextInput
                                        label="CNPJ (Opcional)"
                                        placeholder="00.000.000/0000-00"
                                        {...personalizationForm.getInputProps('cnpj')}
                                    />

                                    <ColorInput
                                        label="Cor Principal"
                                        description="Defina a cor primária da sua marca para a interface."
                                        format="hex"
                                        swatches={['#0087ff', '#ff8c00', '#20c997', '#fab005', '#e64980', '#be4bdb', '#7950f2']}
                                        {...personalizationForm.getInputProps('primary_color')}
                                    />

                                    <Textarea
                                        label="Descrição do Negócio"
                                        placeholder="Descreva brevemente o que sua empresa faz (usado por nossos assistentes de IA para entender o contexto do negócio)."
                                        minRows={3}
                                        {...personalizationForm.getInputProps('description')}
                                    />

                                    <Group justify="space-between" mt="md">
                                        <Button variant="subtle" onClick={() => setActive(0)} disabled>
                                            ← Passo Anterior
                                        </Button>
                                        <Button type="submit" loading={savingPersonalization} size="md">
                                            Salvar e Continuar
                                        </Button>
                                    </Group>
                                </Stack>
                            </form>
                        </Card>
                    </Stepper.Step>

                    {/* Step 3: Explore Products */}
                    <Stepper.Step
                        label="Ferramenta"
                        description="Ative e começe"
                        icon={<IconPackage size={18} />}
                    >
                        <Card shadow="sm" padding="xl" radius="md" withBorder mt="lg">
                            <Stack gap="lg">
                                <div>
                                    <Title order={3}>Escolha sua Primeira Ferramenta</Title>
                                    <Text c="dimmed" size="sm">
                                        Seu perfil está pronto. Agora, ative a ferramenta que sua empresa mais necessita.
                                        Você poderá ativar as outras posteriormente pelo painel.
                                    </Text>
                                </div>

                                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                                    {products.map(product => (
                                        <Card key={product.id} withBorder padding="md" radius="md">
                                            <Group justify="space-between" mb="xs">
                                                <Text size="sm" fw={600}>{product.name}</Text>
                                                <Badge color="green" variant="light" size="sm">Disponível</Badge>
                                            </Group>
                                            <Text size="xs" c="dimmed" lineClamp={2} mb="md">
                                                {product.description || 'Sem descrição disponível'}
                                            </Text>
                                            <Button
                                                size="xs"
                                                variant="light"
                                                fullWidth
                                                onClick={() => handleActivateProduct(product)}
                                            >
                                                Ativar Ferramenta
                                            </Button>
                                        </Card>
                                    ))}
                                </SimpleGrid>

                                {products.length === 0 && (
                                    <Text ta="center" c="dimmed" py="md">
                                        Nenhum produto disponível no momento.
                                    </Text>
                                )}

                                <Group justify="space-between" mt="md">
                                    <Button variant="subtle" onClick={() => navigate('/painel')}>
                                        Pular (Ir para Dashboard)
                                    </Button>
                                </Group>
                            </Stack>
                        </Card>
                    </Stepper.Step>
                </Stepper>
            </Stack>
        </Container>
    );
}

