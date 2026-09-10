/**
 * Regras alinhadas ao que o Supabase Auth costuma aceitar.
 * Senhas curtas do tipo Palavra@1 passam em checklist “clássico”, mas o Auth
 * rejeita como “known to be weak” — por isso as regras abaixo são mais rígidas.
 */

export const PASSWORD_MIN_LENGTH = 8;

export interface PasswordRule {
  id: string;
  label: string;
  test: (password: string) => boolean;
}

const COMMON_WEAK = new Set([
  '12345678', '123456789', '1234567890', '01234567',
  'password', 'password1', 'password123', 'senha123', 'senha1234',
  'qwerty12', 'qwerty123', 'abc12345', 'abcd1234',
  '11111111', '00000000', '87654321', 'admin123', 'suporte1',
  'sincla12', 'sincla123', 'acesso@1', 'acesso123', 'acesso@12',
  'acesso@123', 'welcome1', 'welcome@1', 'empresa1', 'empresa@1',
]);

/** Palavras comuns em PT/EN que, sozinhas + símbolo/número, o Auth rejeita. */
const COMMON_WORDS = [
  'acesso', 'senha', 'password', 'admin', 'suporte', 'sincla', 'empresa',
  'usuario', 'user', 'login', 'teste', 'test', 'master', 'gestor', 'rh',
  'welcome', 'qwerty', 'abc', 'abcd', 'ipmulti', 'multisolucoes',
];

function looksLikeSequence(password: string): boolean {
  const p = password.toLowerCase();
  if (/^(.)\1+$/.test(p)) return true;
  const sequences = [
    '0123456789',
    '9876543210',
    'abcdefghijklmnopqrstuvwxyz',
    'qwertyuiop',
    'asdfghjkl',
  ];
  return sequences.some((seq) => {
    for (let i = 0; i <= seq.length - 4; i++) {
      const chunk = seq.slice(i, i + Math.min(password.length, 8));
      if (chunk.length >= 4 && p.includes(chunk)) return true;
    }
    return false;
  });
}

/** Ex.: Acesso@1, Senha#1, Welcome@12 — palavra comum + poucos dígitos. */
function looksLikeWordPlusTinySuffix(password: string): boolean {
  const lettersOnly = password.toLowerCase().replace(/[^a-zà-ÿ]/g, '');
  if (lettersOnly.length < 4) return false;
  const hasTinyNumericTail = /[@#$%&*]?\d{1,3}$/.test(password);
  if (!hasTinyNumericTail) return false;
  return COMMON_WORDS.some((w) => lettersOnly === w || lettersOnly.startsWith(w));
}

export const PASSWORD_RULES: PasswordRule[] = [
  {
    id: 'length',
    label: `Pelo menos ${PASSWORD_MIN_LENGTH} caracteres`,
    test: (p) => p.length >= PASSWORD_MIN_LENGTH,
  },
  {
    id: 'lower',
    label: 'Pelo menos 1 letra minúscula (a–z)',
    test: (p) => /[a-z]/.test(p),
  },
  {
    id: 'upper',
    label: 'Pelo menos 1 letra maiúscula (A–Z)',
    test: (p) => /[A-Z]/.test(p),
  },
  {
    id: 'digit',
    label: 'Pelo menos 1 número (0–9)',
    test: (p) => /[0-9]/.test(p),
  },
  {
    id: 'special',
    label: 'Pelo menos 1 símbolo (! @ # $ % & *)',
    test: (p) => /[!@#$%&*]/.test(p),
  },
  {
    id: 'not_common',
    label: 'Não use palavra comum + 1 dígito (ex.: Acesso@1)',
    test: (p) => {
      if (!p) return false;
      const lower = p.toLowerCase();
      if (COMMON_WEAK.has(lower)) return false;
      if (looksLikeSequence(p)) return false;
      if (looksLikeWordPlusTinySuffix(p)) return false;
      return true;
    },
  },
];

export function evaluatePassword(password: string) {
  const checks = PASSWORD_RULES.map((rule) => ({
    id: rule.id,
    label: rule.label,
    ok: rule.test(password),
  }));
  const allOk = checks.every((c) => c.ok);
  const passed = checks.filter((c) => c.ok).length;
  return { checks, allOk, passed, total: checks.length };
}

export function getPasswordFailureMessage(password: string): string | null {
  const { checks, allOk } = evaluatePassword(password);
  if (allOk) return null;
  const missing = checks.filter((c) => !c.ok).map((c) => c.label);
  if (missing.length === 1) return `A senha ainda precisa: ${missing[0].toLowerCase()}.`;
  return `A senha ainda não atende a todos os requisitos (${missing.length} pendentes).`;
}

/** Gera senha forte (padrão do admin-usuarios) — evita rejeição do Auth. */
export function generateStrongPassword(length = 14): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const special = '!@#$%&*';
  const all = upper + lower + digits + special;
  const pick = (chars: string) => chars[Math.floor(Math.random() * chars.length)];
  const required = [pick(upper), pick(lower), pick(digits), pick(special)];
  const rest = Array.from({ length: Math.max(0, length - required.length) }, () => pick(all));
  const merged = [...required, ...rest];
  for (let i = merged.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [merged[i], merged[j]] = [merged[j], merged[i]];
  }
  return merged.join('');
}

export function translatePasswordAuthError(message: string): string {
  const lower = (message || '').toLowerCase();
  if (
    lower.includes('known to be weak')
    || lower.includes('easy to guess')
    || lower.includes('pwned')
    || lower.includes('leaked')
    || lower.includes('fraca ou muito comum')
  ) {
    return 'O login rejeitou essa senha por ser comum/fácil de adivinhar (ex.: Acesso@1). Clique em “Gerar senha forte” ou use uma combinação mais longa.';
  }
  if (lower.includes('should be at least') || lower.includes('least 6') || lower.includes('least 8')) {
    return `A senha é muito curta. Use no mínimo ${PASSWORD_MIN_LENGTH} caracteres, com maiúscula, minúscula, número e símbolo.`;
  }
  if (lower.includes('password') || lower.includes('senha')) {
    return 'Não foi possível definir a senha. Use “Gerar senha forte” ou tente outra combinação.';
  }
  return message;
}
