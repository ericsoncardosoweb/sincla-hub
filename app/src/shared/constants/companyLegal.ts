/** Dados cadastrais oficiais Sincla (JUCESP — Certidão de Inteiro Teor, set/2026). */
export const COMPANY_LEGAL = {
    razaoSocial: 'Sincla Tecnologia e Desenvolvimento Ltda',
    nomeFantasia: 'Sincla Tecnologia e Desenvolvimento',
    cnpj: '69.002.013/0001-04',
    nire: '35251054607',
    tipoJuridico: 'Limitada Unipessoal (M.E.)',
    endereco: 'São Paulo, SP - Brasil',
    email: 'contato@sincla.com.br',
    privacidadeEmail: 'privacidade@sincla.com.br',
    whatsapp: '(11) 97020-7076',
    telefone: '(11) 3333-3333',
    siteUrl: 'https://sincla.com.br',
    appUrl: 'https://app.sincla.com.br',
} as const;

/** Variáveis {{empresa_*}} usadas em legal_pages e modais. */
export const LEGAL_PLATFORM_VARS: Record<string, string> = {
    empresa_nome: COMPANY_LEGAL.razaoSocial,
    empresa_cnpj: COMPANY_LEGAL.cnpj,
    empresa_nire: COMPANY_LEGAL.nire,
    empresa_tipo_juridico: COMPANY_LEGAL.tipoJuridico,
    empresa_endereco: COMPANY_LEGAL.endereco,
    empresa_whatsapp: COMPANY_LEGAL.whatsapp,
    empresa_telefone: COMPANY_LEGAL.telefone,
    empresa_email: COMPANY_LEGAL.email,
    site_url: COMPANY_LEGAL.siteUrl,
    app_url: COMPANY_LEGAL.appUrl,
};
