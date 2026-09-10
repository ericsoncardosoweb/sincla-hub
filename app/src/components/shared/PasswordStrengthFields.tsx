/**
 * Campos de senha com checklist + gerar senha forte (padrão RH).
 */
import {
  Alert,
  Button,
  Group,
  PasswordInput,
  Stack,
  Text,
  ThemeIcon,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconCheck,
  IconKey,
  IconShield,
  IconX,
} from '@tabler/icons-react';
import {
  evaluatePassword,
  generateStrongPassword,
  PASSWORD_MIN_LENGTH,
} from '../../shared/utils/passwordRules';

export interface PasswordStrengthFieldsProps {
  password: string;
  confirmPassword: string;
  onPasswordChange: (value: string) => void;
  onConfirmChange: (value: string) => void;
  fieldPrefix?: string;
  passwordLabel?: string;
  confirmLabel?: string;
  showGenerateButton?: boolean;
  disabled?: boolean;
}

export function PasswordStrengthFields({
  password,
  confirmPassword,
  onPasswordChange,
  onConfirmChange,
  fieldPrefix = 'pwd',
  passwordLabel = 'Nova senha',
  confirmLabel = 'Confirmar nova senha',
  showGenerateButton = true,
  disabled = false,
}: PasswordStrengthFieldsProps) {
  const passwordEval = evaluatePassword(password);
  const confirmMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  const handleGenerate = () => {
    const gerada = generateStrongPassword(14);
    onPasswordChange(gerada);
    onConfirmChange(gerada);
    notifications.show({
      title: 'Senha forte gerada',
      message: 'Copie e guarde antes de fechar. Ela já preenche os dois campos.',
      color: 'blue',
      autoClose: 8000,
    });
  };

  return (
    <Stack gap="md">
      {showGenerateButton && (
        <Button
          variant="light"
          color="blue"
          fullWidth
          leftSection={<IconKey size={16} />}
          onClick={handleGenerate}
          disabled={disabled}
        >
          Gerar senha forte
        </Button>
      )}

      <Alert color="blue" variant="light" icon={<IconShield size={16} />}>
        <Text size="sm" fw={600} mb={6}>A senha precisa atender a todos os itens:</Text>
        <Stack gap={4}>
          {passwordEval.checks.map((item) => (
            <Group key={item.id} gap={8} wrap="nowrap">
              {password.length === 0 ? (
                <ThemeIcon size={18} radius="xl" variant="light" color="gray">
                  <IconX size={10} />
                </ThemeIcon>
              ) : item.ok ? (
                <ThemeIcon size={18} radius="xl" color="teal" variant="filled">
                  <IconCheck size={10} />
                </ThemeIcon>
              ) : (
                <ThemeIcon size={18} radius="xl" color="red" variant="light">
                  <IconX size={10} />
                </ThemeIcon>
              )}
              <Text
                size="sm"
                c={password.length === 0 ? 'dimmed' : item.ok ? 'teal.8' : 'red.7'}
                fw={item.ok && password.length > 0 ? 500 : 400}
              >
                {item.label}
              </Text>
            </Group>
          ))}
        </Stack>
        {password.length > 0 && (
          <Text size="xs" mt="sm" c={passwordEval.allOk ? 'teal' : 'dimmed'}>
            {passwordEval.allOk
              ? 'Pronto — todos os requisitos foram atendidos.'
              : `${passwordEval.passed} de ${passwordEval.total} requisitos ok`}
          </Text>
        )}
      </Alert>

      <PasswordInput
        label={passwordLabel}
        placeholder={`Mínimo ${PASSWORD_MIN_LENGTH} caracteres — ou use “Gerar senha forte”`}
        description="Evite palavras simples + 1 número (Acesso@1 é rejeitada pelo login)."
        value={password}
        onChange={(e) => onPasswordChange(e.currentTarget.value)}
        radius="md"
        autoComplete="new-password"
        name={`${fieldPrefix}-nova-senha`}
        data-lpignore="true"
        data-1p-ignore="true"
        disabled={disabled}
        error={
          password.length > 0 && !passwordEval.allOk
            ? 'Ainda faltam requisitos na lista acima'
            : undefined
        }
      />
      <PasswordInput
        label={confirmLabel}
        placeholder="Repita a senha"
        value={confirmPassword}
        onChange={(e) => onConfirmChange(e.currentTarget.value)}
        radius="md"
        autoComplete="new-password"
        name={`${fieldPrefix}-confirma-senha`}
        data-lpignore="true"
        data-1p-ignore="true"
        disabled={disabled}
        error={confirmMismatch ? 'As senhas não conferem' : undefined}
      />
    </Stack>
  );
}

export function isPasswordFormReady(password: string, confirmPassword: string): boolean {
  return evaluatePassword(password).allOk && password === confirmPassword && password.length > 0;
}
