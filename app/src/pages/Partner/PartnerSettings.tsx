import { useEffect, useState } from 'react';
import {
    Container, Title, Text, Group, Button, Stack, Select,
    TextInput, Alert, Paper, Divider,
} from '@mantine/core';
import { IconDeviceFloppy, IconCheck, IconKey } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useAuth } from '../../shared/contexts';
import { supabase } from '../../shared/lib/supabase';

const PIX_KEY_OPTIONS = [
    { value: 'cpf', label: 'CPF' },
    { value: 'cnpj', label: 'CNPJ' },
    { value: 'email', label: 'E-mail' },
    { value: 'phone', label: 'Celular' },
    { value: 'random', label: 'Chave Aleatória' },
];

export function PartnerSettings() {
    const { subscriber } = useAuth();
    const [partnerId, setPartnerId] = useState<string | null>(null);
    const [pixKeyType, setPixKeyType] = useState<string | null>(null);
    const [pixKey, setPixKey] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [cnpj, setCnpj] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadSettings();
    }, [subscriber]);

    const loadSettings = async () => {
        if (!subscriber) return;
        setLoading(true);
        try {
            const { data: partner } = await supabase
                .from('partners')
                .select('id, pix_key_type, pix_key, company_name, cnpj')
                .eq('user_id', subscriber.id)
                .single();

            if (partner) {
                setPartnerId(partner.id);
                setPixKeyType(partner.pix_key_type);
                setPixKey(partner.pix_key || '');
                setCompanyName(partner.company_name || '');
                setCnpj(partner.cnpj || '');
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!partnerId) return;
        setSaving(true);
        try {
            const { error } = await supabase
                .from('partners')
                .update({
                    pix_key_type: pixKeyType,
                    pix_key: pixKey || null,
                    company_name: companyName || null,
                    cnpj: cnpj || null,
                })
                .eq('id', partnerId);

            if (error) throw error;

            notifications.show({
                title: 'Configurações salvas!',
                message: 'Seus dados de parceiro foram atualizados.',
                color: 'green',
                icon: <IconCheck size={18} />,
            });
        } catch (error) {
            console.error('Error saving settings:', error);
            notifications.show({
                title: 'Erro',
                message: 'Não foi possível salvar as configurações.',
                color: 'red',
            });
        } finally {
            setSaving(false);
        }
    };

    const getPixPlaceholder = () => {
        switch (pixKeyType) {
            case 'cpf': return '000.000.000-00';
            case 'cnpj': return '00.000.000/0000-00';
            case 'email': return 'seu@email.com';
            case 'phone': return '+55 11 99999-9999';
            case 'random': return 'Cole sua chave aleatória';
            default: return 'Selecione o tipo primeiro';
        }
    };

    if (loading) {
        return (
            <Container size="sm" py="md">
                <Text c="dimmed">Carregando...</Text>
            </Container>
        );
    }

    return (
        <Stack gap="lg">

            {/* PIX Settings */}
            <Paper shadow="sm" p="lg" radius="md" withBorder>
                <Group gap="xs" mb="md">
                    <IconKey size={20} />
                    <Title order={4}>Chave PIX</Title>
                </Group>

                {!pixKey && (
                    <Alert color="orange" variant="light" mb="md">
                        Configure sua chave PIX para poder solicitar saques.
                    </Alert>
                )}

                <Stack gap="md">
                    <Select
                        label="Tipo de Chave"
                        placeholder="Selecione o tipo"
                        data={PIX_KEY_OPTIONS}
                        value={pixKeyType}
                        onChange={setPixKeyType}
                    />
                    <TextInput
                        label="Chave PIX"
                        placeholder={getPixPlaceholder()}
                        value={pixKey}
                        onChange={(e) => setPixKey(e.currentTarget.value)}
                        disabled={!pixKeyType}
                    />
                </Stack>
            </Paper>

            {/* Commercial Info */}
            <Paper shadow="sm" p="lg" radius="md" withBorder>
                <Title order={4} mb="md">Dados Comerciais</Title>
                <Text size="sm" c="dimmed" mb="md">
                    Opcional. Usado para notas fiscais e contratos.
                </Text>

                <Stack gap="md">
                    <TextInput
                        label="Nome da Empresa / Razão Social"
                        placeholder="Sua empresa"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.currentTarget.value)}
                    />
                    <TextInput
                        label="CNPJ"
                        placeholder="00.000.000/0000-00"
                        value={cnpj}
                        onChange={(e) => setCnpj(e.currentTarget.value)}
                    />
                </Stack>
            </Paper>

            <Divider />

            <Button
                size="md"
                leftSection={<IconDeviceFloppy size={18} />}
                onClick={handleSave}
                loading={saving}
            >
                Salvar Configurações
            </Button>
        </Stack>
    );
}
