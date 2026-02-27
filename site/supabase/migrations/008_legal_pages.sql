-- ========================================
-- 008: Páginas Legais (Políticas e Termos)
-- ========================================

CREATE TABLE IF NOT EXISTS legal_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  is_published boolean DEFAULT true,
  version integer DEFAULT 1,
  published_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE legal_pages ENABLE ROW LEVEL SECURITY;

-- Leitura pública (published only)
CREATE POLICY "legal_pages_public_read" ON legal_pages
  FOR SELECT USING (is_published = true);

-- Admin full access
CREATE POLICY "legal_pages_admin_full" ON legal_pages
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

-- ========================================
-- Tabela de configurações da plataforma
-- ========================================

CREATE TABLE IF NOT EXISTS platform_settings (
  key text PRIMARY KEY,
  value text NOT NULL DEFAULT '',
  description text,
  updated_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- Leitura pública
CREATE POLICY "platform_settings_public_read" ON platform_settings
  FOR SELECT USING (true);

-- Admin full access
CREATE POLICY "platform_settings_admin_full" ON platform_settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

-- ========================================
-- Seed: Configurações padrão da plataforma
-- ========================================

INSERT INTO platform_settings (key, value, description) VALUES
  ('empresa_nome', 'Sincla Tecnologia Ltda', 'Nome da empresa'),
  ('empresa_cnpj', '00.000.000/0000-00', 'CNPJ da empresa'),
  ('empresa_endereco', 'São Paulo, SP - Brasil', 'Endereço completo'),
  ('empresa_whatsapp', '(11) 99999-9999', 'WhatsApp de contato'),
  ('empresa_telefone', '(11) 3333-3333', 'Telefone comercial'),
  ('empresa_email', 'contato@sincla.com.br', 'Email de contato'),
  ('site_url', 'https://sincla.com.br', 'URL do site'),
  ('app_url', 'https://app.sincla.com.br', 'URL do painel')
ON CONFLICT (key) DO NOTHING;

-- ========================================
-- Seed: Documentos legais padrão
-- ========================================

INSERT INTO legal_pages (slug, title, content) VALUES
(
  'politica-privacidade',
  'Política de Privacidade',
  '<h1>Política de Privacidade</h1>
<p><strong>Última atualização:</strong> Fevereiro de 2026</p>
<p>A <strong>{{empresa_nome}}</strong>, inscrita no CNPJ sob o nº {{empresa_cnpj}}, com sede em {{empresa_endereco}} ("Sincla", "nós" ou "nosso"), valoriza a privacidade de seus usuários e está comprometida com a proteção dos dados pessoais, em conformidade com a Lei Geral de Proteção de Dados Pessoais (LGPD - Lei nº 13.709/2018).</p>

<h2>1. Dados que Coletamos</h2>
<p>Coletamos os seguintes tipos de dados pessoais:</p>
<ul>
  <li><strong>Dados de identificação:</strong> nome completo, e-mail, telefone, CPF/CNPJ</li>
  <li><strong>Dados de acesso:</strong> endereço IP, tipo de navegador, páginas visitadas, data e hora de acesso</li>
  <li><strong>Dados de uso:</strong> funcionalidades utilizadas, preferências, histórico de navegação na plataforma</li>
  <li><strong>Dados de pagamento:</strong> informações de cobrança processadas por gateways de pagamento terceirizados</li>
</ul>

<h2>2. Finalidade do Tratamento</h2>
<p>Utilizamos seus dados pessoais para:</p>
<ul>
  <li>Fornecer e manter nossos serviços (Sincla RH, EAD, Leads, Bolso, Agenda, Intranet)</li>
  <li>Gerenciar sua conta e assinaturas</li>
  <li>Processar pagamentos e emitir notas fiscais</li>
  <li>Enviar comunicações sobre o serviço (atualizações, manutenções, alertas de segurança)</li>
  <li>Personalizar sua experiência na plataforma</li>
  <li>Cumprir obrigações legais e regulatórias</li>
  <li>Melhorar nossos produtos e serviços</li>
</ul>

<h2>3. Base Legal</h2>
<p>O tratamento dos dados pessoais é realizado com base nas seguintes hipóteses legais previstas na LGPD:</p>
<ul>
  <li><strong>Consentimento:</strong> para envio de comunicações de marketing</li>
  <li><strong>Execução de contrato:</strong> para prestação dos serviços contratados</li>
  <li><strong>Legítimo interesse:</strong> para melhoria dos serviços e segurança da plataforma</li>
  <li><strong>Obrigação legal:</strong> para cumprimento de exigências fiscais e regulatórias</li>
</ul>

<h2>4. Compartilhamento de Dados</h2>
<p>Seus dados podem ser compartilhados com:</p>
<ul>
  <li><strong>Provedores de infraestrutura:</strong> Supabase (banco de dados), provedores de hospedagem</li>
  <li><strong>Gateways de pagamento:</strong> para processamento de transações financeiras</li>
  <li><strong>Autoridades públicas:</strong> quando exigido por lei ou ordem judicial</li>
</ul>
<p>Não vendemos ou alugamos seus dados pessoais a terceiros para fins comerciais.</p>

<h2>5. Segurança dos Dados</h2>
<p>Adotamos medidas técnicas e organizacionais para proteger seus dados:</p>
<ul>
  <li>Criptografia de dados em trânsito (TLS/SSL) e em repouso</li>
  <li>Controle de acesso baseado em funções (RBAC)</li>
  <li>Monitoramento contínuo de segurança</li>
  <li>Backups regulares</li>
  <li>Políticas internas de acesso restrito</li>
</ul>

<h2>6. Seus Direitos</h2>
<p>Conforme a LGPD, você tem direito a:</p>
<ul>
  <li>Confirmar a existência de tratamento de seus dados</li>
  <li>Acessar seus dados pessoais</li>
  <li>Corrigir dados incompletos, inexatos ou desatualizados</li>
  <li>Solicitar a anonimização, bloqueio ou eliminação de dados desnecessários</li>
  <li>Solicitar a portabilidade de seus dados</li>
  <li>Revogar o consentimento</li>
</ul>
<p>Para exercer esses direitos, entre em contato pelo e-mail {{empresa_email}} ou WhatsApp {{empresa_whatsapp}}.</p>

<h2>7. Cookies</h2>
<p>Utilizamos cookies e tecnologias similares para melhorar a experiência de navegação, analisar tráfego e personalizar conteúdo. Você pode gerenciar suas preferências de cookies através das configurações do seu navegador.</p>

<h2>8. Retenção de Dados</h2>
<p>Seus dados serão mantidos pelo período necessário para o cumprimento das finalidades para as quais foram coletados, incluindo obrigações legais, contratuais e regulatórias.</p>

<h2>9. Alterações nesta Política</h2>
<p>Reservamo-nos o direito de atualizar esta Política de Privacidade a qualquer momento. As alterações serão comunicadas através da plataforma ou por e-mail.</p>

<h2>10. Contato</h2>
<p>Em caso de dúvidas sobre esta política ou sobre o tratamento de seus dados pessoais, entre em contato:</p>
<ul>
  <li><strong>E-mail:</strong> {{empresa_email}}</li>
  <li><strong>Telefone:</strong> {{empresa_telefone}}</li>
  <li><strong>WhatsApp:</strong> {{empresa_whatsapp}}</li>
  <li><strong>Endereço:</strong> {{empresa_endereco}}</li>
</ul>'
),
(
  'termos-de-uso',
  'Termos de Uso',
  '<h1>Termos de Uso</h1>
<p><strong>Última atualização:</strong> Fevereiro de 2026</p>
<p>Estes Termos de Uso regulam o acesso e a utilização dos serviços oferecidos pela <strong>{{empresa_nome}}</strong>, inscrita no CNPJ sob o nº {{empresa_cnpj}}, com sede em {{empresa_endereco}}, por meio da plataforma <strong>Sincla Hub</strong> e seus produtos associados.</p>

<h2>1. Aceitação dos Termos</h2>
<p>Ao acessar ou utilizar qualquer serviço da Sincla, você concorda integralmente com estes Termos de Uso. Caso não concorde, não utilize nossos serviços.</p>

<h2>2. Definições</h2>
<ul>
  <li><strong>Plataforma:</strong> conjunto de aplicações SaaS disponibilizadas pela Sincla (Sincla RH, EAD, Leads, Bolso, Agenda, Intranet)</li>
  <li><strong>Assinante:</strong> pessoa física ou jurídica que contrata os serviços da plataforma</li>
  <li><strong>Usuário:</strong> qualquer pessoa que acessa a plataforma, incluindo membros de equipe do assinante</li>
  <li><strong>Empresa:</strong> unidade organizacional criada pelo assinante na plataforma</li>
</ul>

<h2>3. Cadastro e Conta</h2>
<ul>
  <li>O cadastro é pessoal e intransferível</li>
  <li>Você é responsável por manter a confidencialidade de suas credenciais de acesso</li>
  <li>Os dados fornecidos devem ser verdadeiros, completos e atualizados</li>
  <li>Cada assinante pode criar e gerenciar múltiplas empresas dentro da plataforma</li>
</ul>

<h2>4. Serviços e Funcionalidades</h2>
<p>A Sincla oferece um ecossistema de produtos SaaS que inclui, mas não se limita a:</p>
<ul>
  <li><strong>Sincla RH:</strong> gestão de pessoas, recrutamento, folha de pagamento</li>
  <li><strong>Sincla EAD:</strong> plataforma de treinamento e cursos online</li>
  <li><strong>Sincla Leads:</strong> captação e gestão de leads</li>
  <li><strong>Sincla Bolso:</strong> controle financeiro pessoal</li>
  <li><strong>Sincla Agenda:</strong> agendamentos inteligentes</li>
  <li><strong>Sincla Intranet:</strong> comunicação interna corporativa</li>
</ul>

<h2>5. Planos e Pagamentos</h2>
<ul>
  <li>Os serviços são oferecidos mediante assinatura mensal ou anual</li>
  <li>Os valores e condições de cada plano estão disponíveis na plataforma</li>
  <li>A cobrança é realizada automaticamente no método de pagamento cadastrado</li>
  <li>Em caso de inadimplência, o acesso poderá ser suspenso após notificação</li>
  <li>O assinante pode cancelar a assinatura a qualquer momento, mantendo o acesso até o final do período pago</li>
</ul>

<h2>6. Uso Aceitável</h2>
<p>Ao utilizar a plataforma, você se compromete a não:</p>
<ul>
  <li>Violar leis ou regulamentos aplicáveis</li>
  <li>Compartilhar conteúdo ilegal, difamatório ou ofensivo</li>
  <li>Tentar acessar áreas restritas ou dados de outros usuários</li>
  <li>Utilizar a plataforma para envio de spam ou comunicações não solicitadas</li>
  <li>Realizar engenharia reversa ou tentar extrair o código-fonte</li>
  <li>Sobrecarregar os servidores com requisições automatizadas abusivas</li>
</ul>

<h2>7. Propriedade Intelectual</h2>
<p>Todo o conteúdo da plataforma, incluindo logotipos, design, código-fonte, textos e imagens, é de propriedade exclusiva da {{empresa_nome}} ou de seus licenciadores, protegido pelas leis de propriedade intelectual.</p>

<h2>8. Responsabilidades</h2>
<ul>
  <li>A Sincla se compromete a manter a plataforma disponível e funcional, sem garantir disponibilidade ininterrupta</li>
  <li>Não nos responsabilizamos por danos decorrentes de uso inadequado da plataforma</li>
  <li>O assinante é responsável pelos dados inseridos na plataforma por seus usuários e equipe</li>
  <li>Manutenções programadas serão comunicadas com antecedência</li>
</ul>

<h2>9. Privacidade</h2>
<p>O tratamento de dados pessoais é regido pela nossa <a href="{{site_url}}/politica-privacidade">Política de Privacidade</a>, que é parte integrante destes Termos.</p>

<h2>10. Rescisão</h2>
<ul>
  <li>O assinante pode encerrar sua conta a qualquer momento</li>
  <li>A Sincla pode suspender ou encerrar contas que violem estes Termos</li>
  <li>Após o encerramento, os dados serão mantidos por 30 dias para eventual recuperação, após o que serão permanentemente excluídos</li>
</ul>

<h2>11. Alterações nos Termos</h2>
<p>Reservamo-nos o direito de modificar estes Termos a qualquer momento. As alterações entrarão em vigor após publicação na plataforma. O uso continuado após a alteração constitui aceitação dos novos termos.</p>

<h2>12. Foro e Legislação Aplicável</h2>
<p>Estes Termos são regidos pela legislação brasileira. Para dirimir quaisquer controvérsias, fica eleito o foro da comarca de São Paulo/SP, com exclusão de qualquer outro.</p>

<h2>13. Contato</h2>
<p>Em caso de dúvidas sobre estes Termos, entre em contato:</p>
<ul>
  <li><strong>E-mail:</strong> {{empresa_email}}</li>
  <li><strong>Telefone:</strong> {{empresa_telefone}}</li>
  <li><strong>WhatsApp:</strong> {{empresa_whatsapp}}</li>
  <li><strong>Site:</strong> {{site_url}}</li>
</ul>'
)
ON CONFLICT (slug) DO NOTHING;
