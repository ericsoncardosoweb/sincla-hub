import { COMPANY_LEGAL } from '../../shared/constants/companyLegal';

/** Conteúdo estático de fallback quando legal_pages não estiver acessível (ex.: cadastro anônimo). */
export const LEGAL_FALLBACKS: Record<string, { title: string; content: string; version: number }> = {
    'termos-de-uso': {
        title: 'Termos de Uso',
        version: 1,
        content: `
<h1>Termos de Uso</h1>
<p><strong>Última atualização:</strong> Setembro de 2026</p>
<p>Ao acessar e utilizar os serviços da ${COMPANY_LEGAL.razaoSocial} ("Sincla"), inscrita no CNPJ nº ${COMPANY_LEGAL.cnpj}, você concorda com estes Termos de Uso. Leia atentamente antes de utilizar a plataforma.</p>

<h2>1. Aceitação dos Termos</h2>
<p>Ao criar uma conta ou utilizar qualquer serviço da Sincla, você declara ter lido, compreendido e aceito estes termos na íntegra. Se você não concordar, não utilize nossos serviços.</p>

<h2>2. Descrição dos Serviços</h2>
<p>A Sincla oferece um ecossistema de plataformas de gestão empresarial (Sincla Hub), incluindo ferramentas como Sincla RH, Sincla EAD, Sincla Agenda e demais produtos disponibilizados na plataforma.</p>

<h2>3. Cadastro e Conta</h2>
<ul>
<li>Fornecer informações verdadeiras, completas e atualizadas;</li>
<li>Manter a confidencialidade da sua senha;</li>
<li>Ser responsável por todas as atividades realizadas em sua conta;</li>
<li>Notificar imediatamente sobre uso não autorizado.</li>
</ul>

<h2>4. Uso Aceitável</h2>
<p>Você se compromete a não utilizar os serviços para fins ilegais, não tentar acessar dados de terceiros sem autorização, não transmitir malware e não reproduzir ou revender partes dos serviços sem autorização.</p>

<h2>5. Propriedade Intelectual</h2>
<p>Todo o conteúdo, design, código-fonte, marcas e logotipos da Sincla são de propriedade exclusiva da ${COMPANY_LEGAL.razaoSocial}.</p>

<h2>6. Planos e Pagamentos</h2>
<p>Preços, condições e cancelamentos estão descritos na contratação de cada plano. Reembolsos seguem a política aplicável ao produto contratado.</p>

<h2>7. Limitação de Responsabilidade</h2>
<p>A Sincla não se responsabiliza por danos indiretos, perda de dados causada por terceiros ou conteúdo inserido pelos usuários nas ferramentas contratadas.</p>

<h2>8. Rescisão</h2>
<p>Podemos suspender ou encerrar contas que violem estes termos. Você pode encerrar sua conta pelo painel de configurações.</p>

<h2>9. Legislação Aplicável</h2>
<p>Estes termos são regidos pela legislação brasileira. Foro: comarca de São Paulo/SP.</p>

<h2>10. Contato</h2>
<p>E-mail: <a href="mailto:${COMPANY_LEGAL.email}">${COMPANY_LEGAL.email}</a> · Site: <a href="${COMPANY_LEGAL.siteUrl}">sincla.com.br</a></p>
`,
    },
    'politica-privacidade': {
        title: 'Política de Privacidade',
        version: 1,
        content: `
<h1>Política de Privacidade</h1>
<p><strong>Última atualização:</strong> Setembro de 2026</p>
<p>Esta Política descreve como a ${COMPANY_LEGAL.razaoSocial}, inscrita no CNPJ nº ${COMPANY_LEGAL.cnpj}, trata dados pessoais no Sincla Hub e produtos associados, em conformidade com a LGPD (Lei nº 13.709/2018).</p>

<h2>1. Dados que coletamos</h2>
<p>Podemos coletar nome, e-mail, CPF, telefone, dados de empresa e registros de uso necessários para autenticação, cobrança e operação das ferramentas contratadas.</p>

<h2>2. Finalidades</h2>
<ul>
<li>Criar e gerenciar sua conta;</li>
<li>Prestar os serviços contratados;</li>
<li>Comunicações operacionais e de suporte;</li>
<li>Segurança, prevenção a fraudes e cumprimento legal.</li>
</ul>

<h2>3. Compartilhamento</h2>
<p>Compartilhamos dados apenas com provedores essenciais (hospedagem, pagamento, e-mail) e quando exigido por lei. Não vendemos dados pessoais.</p>

<h2>4. Seus direitos</h2>
<p>Você pode solicitar acesso, correção, portabilidade ou exclusão conforme a LGPD, pelo e-mail <a href="mailto:${COMPANY_LEGAL.privacidadeEmail}">${COMPANY_LEGAL.privacidadeEmail}</a>.</p>

<h2>5. Retenção e segurança</h2>
<p>Mantemos os dados pelo tempo necessário à prestação do serviço e aplicamos medidas técnicas e organizacionais de proteção.</p>

<h2>6. Contato</h2>
<p>Encarregado/DPO: <a href="mailto:${COMPANY_LEGAL.privacidadeEmail}">${COMPANY_LEGAL.privacidadeEmail}</a></p>
`,
    },
};
