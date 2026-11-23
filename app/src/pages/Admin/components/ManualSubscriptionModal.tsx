import { useMemo, useState } from 'react';
import {
    ActionIcon, Alert, Badge, Button, Card, Chip, CopyButton, Divider, Group, Loader,
    Modal, NumberInput, Paper, SegmentedControl, Select, SimpleGrid, Stack, Text, TextInput,
    Title, Tooltip,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useMediaQuery } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { useQuery } from '@tanstack/react-query';
import {
    IconAlertCircle, IconCheck, IconCopy, IconMailForward, IconPlus, IconTrash, IconUserPlus,
} from '@tabler/icons-react';
import { supabase } from '../../../shared/lib/supabase';
import { formatCurrency, formatDocument, validateDocument } from '../../../shared/services/asaasService';
import {
    AI_TOKEN_SUGGESTIONS, STORAGE_SUGGESTIONS_GB, formatTokens, subscriptionInviteService,
    type BillingCycle,
} from '../../../shared/services/subscriptionInviteService';

interface PlanOption {
    id: string;
    product_id: string;
    name: string;
    price_monthly: number;
    price_yearly: number;
    limits: Record<string, unknown> | null;
}

interface ProductOption {
    id: string;
    name: string;
}

interface ItemForm {
    key: string;
    product_id: string | null;
    plan_id: string | null;
    ai_tokens: number | null;
    price_mode: 'plan' | 'custom';
    custom_price: number | null;
}

interface FormValues {
    contact_name: string;
    company_name: string;
    email: string;
    phone: string;
    cpf_cnpj: string;
    billing_cycle: BillingCycle;
    due_date: string;
    storage_gb: number | null;
    items: ItemForm[];
}

const MODAL_COMBOBOX_PROPS = { withinPortal: true, zIndex: 10000 } as const;

const newItem = (): ItemForm => ({
    key: crypto.randomUUID(),
    product_id: null,
    plan_id: null,
    ai_tokens: null,
    price_mode: 'plan',
    custom_price: null,
});

const isoDatePlusDays = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

const formatPhone = (value: string) => {
    const d = value.replace(/\D/g, '').slice(0, 11);
    if (d.length <= 2) return d;
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

const numberLimit = (limits: Record<string, unknown> | null, key: string): number | null => {
    const v = limits?.[key];
    return typeof v === 'number' && Number.isFinite(v) ? v : null;
};

const planListPrice = (plan: PlanOption | undefined, cycle: BillingCycle) => {
    if (!plan) return 0;
    if (cycle === 'yearly') return Number(plan.price_yearly) || Number(plan.price_monthly) * 12;
    return Number(plan.price_monthly) || 0;
};

interface ManualSubscriptionModalProps {
    opened: boolean;
    onClose: () => void;
    onCreated: () => void;
}

export function ManualSubscriptionModal({ opened, onClose, onCreated }: ManualSubscriptionModalProps) {
    const isMobile = useMediaQuery('(max-width: 48em)');
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<{ url: string; emailSent: boolean; email: string } | null>(null);

    const catalog = useQuery({
        queryKey: ['admin', 'manual-subscription-catalog'],
        enabled: opened,
        queryFn: async () => {
            const [{ data: products, error: prodErr }, { data: plans, error: planErr }] = await Promise.all([
                supabase.from('products').select('id, name').eq('is_active', true).order('name'),
                supabase
                    .from('product_plans')
                    .select('id, product_id, name, price_monthly, price_yearly, limits')
                    .eq('is_active', true)
                    .order('sort_order'),
            ]);
            if (prodErr) throw prodErr;
            if (planErr) throw planErr;
            const plansList = (plans || []) as PlanOption[];
            const productsWithPlans = ((products || []) as ProductOption[])
                .filter(p => plansList.some(pl => pl.product_id === p.id));
            return { products: productsWithPlans, plans: plansList };
        },
    });

    const form = useForm<FormValues>({
        initialValues: {
            contact_name: '',
            company_name: '',
            email: '',
            phone: '',
            cpf_cnpj: '',
            billing_cycle: 'monthly',
            due_date: isoDatePlusDays(7),
            storage_gb: null,
            items: [newItem()],
        },
        validate: {
            contact_name: (v) => (v.trim().length < 2 ? 'Informe o nome da pessoa' : null),
            company_name: (v) => (v.trim().length < 2 ? 'Informe o nome da empresa' : null),
            email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? null : 'E-mail inválido'),
            phone: (v) => {
                const d = v.replace(/\D/g, '');
                return d.length === 0 || d.length >= 10 ? null : 'Telefone incompleto';
            },
            cpf_cnpj: (v) => (validateDocument(v).valid ? null : 'CNPJ (ou CPF) inválido'),
            due_date: (v) => (!v ? 'Informe o vencimento' : v < isoDatePlusDays(0) ? 'O vencimento não pode ser no passado' : null),
            items: {
                product_id: (v) => (v ? null : 'Selecione o produto'),
                plan_id: (v) => (v ? null : 'Selecione o plano'),
                custom_price: (v, values, path) => {
                    const index = Number(path.split('.')[1]);
                    if (values.items[index]?.price_mode !== 'custom') return null;
                    return v == null || v < 0 ? 'Informe o valor' : null;
                },
            },
        },
    });

    const plans = catalog.data?.plans ?? [];
    const products = catalog.data?.products ?? [];
    const cycle = form.values.billing_cycle;

    const itemPrice = (item: ItemForm) => {
        const plan = plans.find(p => p.id === item.plan_id);
        if (item.price_mode === 'custom') return Number(item.custom_price) || 0;
        return planListPrice(plan, cycle);
    };

    const total = form.values.items.reduce((sum, item) => sum + itemPrice(item), 0);

    const defaultStorage = useMemo(() => form.values.items.reduce((sum, item) => {
        const plan = plans.find(p => p.id === item.plan_id);
        return sum + (numberLimit(plan?.limits ?? null, 'storage_gb') ?? 0);
    }, 0), [form.values.items, plans]);

    const usedProducts = form.values.items.map(i => i.product_id).filter(Boolean) as string[];

    const handleClose = () => {
        if (submitting) return;
        form.reset();
        form.setFieldValue('items', [newItem()]);
        setResult(null);
        onClose();
    };

    const submit = async (values: FormValues, sendEmail: boolean) => {
        if (total > 0 && total < 5) {
            notifications.show({ color: 'orange', title: 'Valor muito baixo', message: 'O Asaas exige cobrança mínima de R$ 5,00 (ou use R$ 0,00 para cortesia).' });
            return;
        }
        setSubmitting(true);
        try {
            const response = await subscriptionInviteService.create({
                contact_name: values.contact_name.trim(),
                company_name: values.company_name.trim(),
                email: values.email.trim().toLowerCase(),
                phone: values.phone,
                cpf_cnpj: values.cpf_cnpj,
                billing_cycle: values.billing_cycle,
                due_date: values.due_date,
                storage_gb: values.storage_gb,
                send_email: sendEmail,
                items: values.items.map(item => {
                    const plan = plans.find(p => p.id === item.plan_id);
                    const planTokens = numberLimit(plan?.limits ?? null, 'ai_tokens');
                    return {
                        product_id: item.product_id!,
                        plan_id: item.plan_id!,
                        ai_tokens: item.ai_tokens != null && item.ai_tokens !== planTokens ? item.ai_tokens : null,
                        price: item.price_mode === 'custom' ? Number(item.custom_price) || 0 : null,
                    };
                }),
            });
            setResult({ url: response.invite_url, emailSent: response.email_sent, email: values.email.trim() });
            onCreated();
            if (sendEmail && !response.email_sent) {
                notifications.show({
                    color: 'orange',
                    title: 'Convite criado, mas o e-mail falhou',
                    message: 'Copie o link e envie manualmente, ou use "Reenviar" na lista de convites.',
                });
            }
        } catch (error) {
            notifications.show({
                color: 'red',
                title: 'Não foi possível criar a assinatura',
                message: (error as Error).message,
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleSubmit = (sendEmail: boolean) => {
        const validation = form.validate();
        if (validation.hasErrors) return;
        void submit(form.values, sendEmail);
    };

    return (
        <Modal
            opened={opened}
            onClose={handleClose}
            fullScreen={isMobile}
            size="xl"
            title={
                <Group gap="xs">
                    <IconUserPlus size={20} color="var(--mantine-color-blue-6)" />
                    <Title order={4}>Nova assinatura manual</Title>
                </Group>
            }
        >
            {result ? (
                <Stack gap="md">
                    <Alert color="green" icon={<IconCheck size={16} />} title="Convite criado">
                        {result.emailSent
                            ? `O convite foi enviado para ${result.email}. A conta fica pendente até a pessoa aceitar; a cobrança só é gerada no aceite.`
                            : 'O convite foi criado sem envio de e-mail. Copie o link abaixo e envie para a pessoa.'}
                    </Alert>
                    <Group gap="xs" wrap="nowrap">
                        <TextInput value={result.url} readOnly style={{ flex: 1 }} />
                        <CopyButton value={result.url}>
                            {({ copied, copy }) => (
                                <Button variant="light" color={copied ? 'teal' : 'blue'} onClick={copy} leftSection={<IconCopy size={16} />}>
                                    {copied ? 'Copiado' : 'Copiar'}
                                </Button>
                            )}
                        </CopyButton>
                    </Group>
                    <Group justify="flex-end">
                        <Button onClick={handleClose}>Concluir</Button>
                    </Group>
                </Stack>
            ) : catalog.isLoading ? (
                <Group justify="center" py="xl"><Loader /></Group>
            ) : catalog.isError ? (
                <Alert color="red" icon={<IconAlertCircle size={16} />} title="Erro ao carregar produtos e planos">
                    <Group justify="space-between">
                        <Text size="sm">{(catalog.error as Error).message}</Text>
                        <Button size="xs" variant="light" onClick={() => catalog.refetch()}>Tentar novamente</Button>
                    </Group>
                </Alert>
            ) : products.length === 0 ? (
                <Alert color="orange" icon={<IconAlertCircle size={16} />}>
                    Nenhum produto ativo com planos cadastrados. Cadastre planos na aba Planos.
                </Alert>
            ) : (
                <Stack gap="md">
                    <Paper withBorder p="md" radius="md">
                        <Text fw={600} mb="sm">Cliente</Text>
                        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                            <TextInput label="Nome da pessoa" withAsterisk {...form.getInputProps('contact_name')} />
                            <TextInput label="Nome da empresa" withAsterisk {...form.getInputProps('company_name')} />
                            <TextInput label="E-mail" withAsterisk type="email" {...form.getInputProps('email')} />
                            <TextInput
                                label="Telefone"
                                placeholder="(00) 00000-0000"
                                {...form.getInputProps('phone')}
                                onChange={(e) => form.setFieldValue('phone', formatPhone(e.currentTarget.value))}
                            />
                            <TextInput
                                label="CNPJ"
                                description="Aceita CPF para pessoa física"
                                placeholder="00.000.000/0000-00"
                                withAsterisk
                                {...form.getInputProps('cpf_cnpj')}
                                onChange={(e) => form.setFieldValue('cpf_cnpj', formatDocument(e.currentTarget.value))}
                            />
                        </SimpleGrid>
                    </Paper>

                    <Paper withBorder p="md" radius="md">
                        <Group justify="space-between" mb="sm">
                            <Text fw={600}>Produtos e planos</Text>
                            <Button
                                size="xs"
                                variant="light"
                                leftSection={<IconPlus size={14} />}
                                disabled={form.values.items.length >= products.length}
                                onClick={() => form.insertListItem('items', newItem())}
                            >
                                Adicionar produto
                            </Button>
                        </Group>
                        <Stack gap="sm">
                            {form.values.items.map((item, index) => {
                                const plan = plans.find(p => p.id === item.plan_id);
                                const planTokens = numberLimit(plan?.limits ?? null, 'ai_tokens');
                                const listPrice = planListPrice(plan, cycle);
                                const productOptions = products
                                    .filter(p => p.id === item.product_id || !usedProducts.includes(p.id))
                                    .map(p => ({ value: p.id, label: p.name }));
                                const planOptions = plans
                                    .filter(p => p.product_id === item.product_id)
                                    .map(p => ({ value: p.id, label: `${p.name} — ${formatCurrency(planListPrice(p, cycle))}${cycle === 'yearly' ? '/ano' : '/mês'}` }));
                                const tokenChips = Array.from(new Set([...(planTokens ? [planTokens] : []), ...AI_TOKEN_SUGGESTIONS]))
                                    .sort((a, b) => a - b);

                                return (
                                    <Card key={item.key} withBorder radius="md" padding="sm">
                                        <Stack gap="sm">
                                            <Group align="flex-end" wrap="nowrap" gap="xs">
                                                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm" style={{ flex: 1 }}>
                                                    <Select
                                                        label="Produto"
                                                        withAsterisk
                                                        searchable
                                                        data={productOptions}
                                                        comboboxProps={MODAL_COMBOBOX_PROPS}
                                                        {...form.getInputProps(`items.${index}.product_id`)}
                                                        onChange={(value) => {
                                                            form.setFieldValue(`items.${index}.product_id`, value);
                                                            form.setFieldValue(`items.${index}.plan_id`, null);
                                                            form.setFieldValue(`items.${index}.ai_tokens`, null);
                                                        }}
                                                    />
                                                    <Select
                                                        label="Plano"
                                                        withAsterisk
                                                        disabled={!item.product_id}
                                                        data={planOptions}
                                                        comboboxProps={MODAL_COMBOBOX_PROPS}
                                                        {...form.getInputProps(`items.${index}.plan_id`)}
                                                        onChange={(value) => {
                                                            form.setFieldValue(`items.${index}.plan_id`, value);
                                                            const chosen = plans.find(p => p.id === value);
                                                            form.setFieldValue(`items.${index}.ai_tokens`, numberLimit(chosen?.limits ?? null, 'ai_tokens'));
                                                        }}
                                                    />
                                                </SimpleGrid>
                                                {form.values.items.length > 1 && (
                                                    <Tooltip label="Remover produto">
                                                        <ActionIcon color="red" variant="subtle" mb={4} onClick={() => form.removeListItem('items', index)}>
                                                            <IconTrash size={16} />
                                                        </ActionIcon>
                                                    </Tooltip>
                                                )}
                                            </Group>

                                            {plan && (
                                                <>
                                                    <div>
                                                        <NumberInput
                                                            label="Tokens de IA por mês"
                                                            description={planTokens != null ? `Padrão do plano: ${formatTokens(planTokens)}` : 'O plano não define tokens'}
                                                            min={0}
                                                            step={1_000_000}
                                                            thousandSeparator="."
                                                            decimalSeparator=","
                                                            allowDecimal={false}
                                                            value={item.ai_tokens ?? ''}
                                                            onChange={(v) => form.setFieldValue(`items.${index}.ai_tokens`, typeof v === 'number' ? v : null)}
                                                        />
                                                        <Chip.Group
                                                            value={item.ai_tokens != null ? String(item.ai_tokens) : null}
                                                            onChange={(v) => form.setFieldValue(`items.${index}.ai_tokens`, v ? Number(v) : null)}
                                                        >
                                                            <Group gap={6} mt={6}>
                                                                {tokenChips.map(n => (
                                                                    <Chip key={n} value={String(n)} size="xs" variant="light">
                                                                        {formatTokens(n)}{n === planTokens ? ' (plano)' : ''}
                                                                    </Chip>
                                                                ))}
                                                            </Group>
                                                        </Chip.Group>
                                                    </div>

                                                    <div>
                                                        <Text size="sm" fw={500} mb={4}>Valor</Text>
                                                        <SegmentedControl
                                                            size="xs"
                                                            data={[
                                                                { value: 'plan', label: `Valor do plano (${formatCurrency(listPrice)})` },
                                                                { value: 'custom', label: 'Valor personalizado' },
                                                            ]}
                                                            value={item.price_mode}
                                                            onChange={(v) => {
                                                                form.setFieldValue(`items.${index}.price_mode`, v as ItemForm['price_mode']);
                                                                if (v === 'custom' && item.custom_price == null) {
                                                                    form.setFieldValue(`items.${index}.custom_price`, listPrice);
                                                                }
                                                            }}
                                                            fullWidth={isMobile}
                                                        />
                                                        {item.price_mode === 'custom' && (
                                                            <NumberInput
                                                                mt="xs"
                                                                label={cycle === 'yearly' ? 'Valor por ano (R$)' : 'Valor por mês (R$)'}
                                                                min={0}
                                                                decimalScale={2}
                                                                fixedDecimalScale
                                                                thousandSeparator="."
                                                                decimalSeparator=","
                                                                prefix="R$ "
                                                                {...form.getInputProps(`items.${index}.custom_price`)}
                                                            />
                                                        )}
                                                    </div>
                                                </>
                                            )}
                                        </Stack>
                                    </Card>
                                );
                            })}
                        </Stack>
                    </Paper>

                    <Paper withBorder p="md" radius="md">
                        <Text fw={600} mb="sm">Cobrança e conta</Text>
                        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                            <div>
                                <Text size="sm" fw={500} mb={4}>Ciclo</Text>
                                <SegmentedControl
                                    fullWidth
                                    data={[
                                        { value: 'monthly', label: 'Mensal' },
                                        { value: 'yearly', label: 'Anual' },
                                    ]}
                                    {...form.getInputProps('billing_cycle')}
                                />
                            </div>
                            <TextInput
                                label="Primeiro vencimento"
                                type="date"
                                withAsterisk
                                min={isoDatePlusDays(0)}
                                {...form.getInputProps('due_date')}
                            />
                        </SimpleGrid>
                        <Divider my="sm" />
                        <NumberInput
                            label="Armazenamento inicial da conta (GB)"
                            description={`Vazio = soma dos planos (${defaultStorage.toLocaleString('pt-BR')} GB)`}
                            min={0}
                            allowDecimal={false}
                            value={form.values.storage_gb ?? ''}
                            onChange={(v) => form.setFieldValue('storage_gb', typeof v === 'number' ? v : null)}
                        />
                        <Chip.Group
                            value={form.values.storage_gb != null ? String(form.values.storage_gb) : null}
                            onChange={(v) => form.setFieldValue('storage_gb', v ? Number(v) : null)}
                        >
                            <Group gap={6} mt={6}>
                                {STORAGE_SUGGESTIONS_GB.map(gb => (
                                    <Chip key={gb} value={String(gb)} size="xs" variant="light">{gb} GB</Chip>
                                ))}
                            </Group>
                        </Chip.Group>
                    </Paper>

                    <Card withBorder radius="md" padding="md" bg="var(--mantine-color-blue-light)">
                        <Group justify="space-between">
                            <div>
                                <Text size="sm" c="dimmed">Total da cobrança</Text>
                                <Text size="xl" fw={700}>
                                    {formatCurrency(total)}
                                    <Text span size="sm" c="dimmed">{cycle === 'yearly' ? ' /ano' : ' /mês'}</Text>
                                </Text>
                            </div>
                            {total === 0 && <Badge color="violet" variant="light">Cortesia — sem cobrança</Badge>}
                        </Group>
                        <Text size="xs" c="dimmed" mt={6}>
                            Uma cobrança única no Asaas é gerada quando a pessoa aceitar o convite. Ela escolhe boleto, Pix ou cartão na fatura.
                        </Text>
                    </Card>

                    <Group justify="flex-end" gap="sm">
                        <Button variant="subtle" onClick={handleClose} disabled={submitting}>Cancelar</Button>
                        <Button variant="light" onClick={() => handleSubmit(false)} loading={submitting}>
                            Criar sem enviar
                        </Button>
                        <Button leftSection={<IconMailForward size={16} />} onClick={() => handleSubmit(true)} loading={submitting}>
                            Criar e enviar convite
                        </Button>
                    </Group>
                </Stack>
            )}
        </Modal>
    );
}
