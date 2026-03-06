-- =====================================================
-- SINCLA HUB - MIGRATION 021
-- Sistema de Notificações Centralizado
-- =====================================================
-- Suporte multi-canal: in-app, email, whatsapp
-- Base de serviço para ferramentas satélite (RH, EAD, etc.)
-- =====================================================

-- 0. Garantir que a função handle_updated_at existe
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. ENUM de tipo de notificação
DO $$ BEGIN
    CREATE TYPE notification_channel AS ENUM ('in_app', 'email', 'whatsapp');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE notification_category AS ENUM (
        'system',     -- Alertas do sistema
        'billing',    -- Pagamentos e faturas
        'product',    -- Novidades de produtos/ferramentas
        'alert',      -- Alertas importantes
        'welcome',    -- Boas-vindas
        'security'    -- Segurança (login, senha)
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE notification_status AS ENUM ('sent', 'failed', 'pending', 'queued');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Tabela de notificações in-app (visíveis no sino)
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    category notification_category DEFAULT 'system',
    icon TEXT,                 -- Nome do ícone Tabler (ex: 'IconCheck')
    color TEXT DEFAULT '#228be6',
    action_url TEXT,           -- Link para ação (ex: '/painel/assinaturas')
    
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    
    source_tool TEXT DEFAULT 'hub', -- hub, rh, ead, agenda, lead, bolso
    metadata JSONB DEFAULT '{}',    -- Dados adicionais flexíveis
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. Tabela de log de envios (auditoria de todos os canais)
CREATE TABLE IF NOT EXISTS public.notification_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    
    channel notification_channel NOT NULL,
    recipient TEXT NOT NULL,        -- Email, telefone ou user_id
    subject TEXT,
    message TEXT,
    
    status notification_status DEFAULT 'pending',
    error_message TEXT,
    
    source_tool TEXT DEFAULT 'hub',
    metadata JSONB DEFAULT '{}',    -- Resposta do provider, template usado, etc.
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4. Configurações de notificação por empresa (opt-in/opt-out)
CREATE TABLE IF NOT EXISTS public.notification_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID UNIQUE NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    
    email_enabled BOOLEAN DEFAULT true,
    whatsapp_enabled BOOLEAN DEFAULT true,
    in_app_enabled BOOLEAN DEFAULT true,
    
    -- SMTP customizado (opcional, fallback para credenciais do Hub)
    custom_smtp_host TEXT,
    custom_smtp_user TEXT,
    custom_smtp_password TEXT,
    custom_smtp_from TEXT,
    custom_smtp_from_name TEXT,
    
    -- WhatsApp customizado (opcional)
    custom_whatsapp_url TEXT,
    custom_whatsapp_token TEXT,
    custom_whatsapp_phone TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 5. Índices para performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_read
    ON public.notifications(user_id, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_company
    ON public.notifications(company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_logs_company
    ON public.notification_logs(company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_logs_channel
    ON public.notification_logs(channel, status);

-- 6. RLS 
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

-- Notifications: Usuário vê e atualiza apenas as suas
DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
CREATE POLICY "notifications_select_own" ON public.notifications
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own" ON public.notifications
    FOR UPDATE USING (user_id = auth.uid());

-- Insert via service_role (Edge Function) apenas
DROP POLICY IF EXISTS "notifications_insert_service" ON public.notifications;
CREATE POLICY "notifications_insert_service" ON public.notifications
    FOR INSERT WITH CHECK (true); -- Edge Function usa service_role

-- Notification logs: apenas admins
DROP POLICY IF EXISTS "notification_logs_admin" ON public.notification_logs;
CREATE POLICY "notification_logs_admin" ON public.notification_logs
    FOR ALL USING (is_admin_user());

-- Insert via service_role
DROP POLICY IF EXISTS "notification_logs_insert_service" ON public.notification_logs;
CREATE POLICY "notification_logs_insert_service" ON public.notification_logs
    FOR INSERT WITH CHECK (true);

-- Notification settings: empresa vê/edita as suas
DROP POLICY IF EXISTS "notification_settings_select" ON public.notification_settings;
CREATE POLICY "notification_settings_select" ON public.notification_settings
    FOR SELECT USING (
        company_id IN (
            SELECT c.id FROM companies c
            JOIN company_members cm ON cm.company_id = c.id
            WHERE cm.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "notification_settings_manage" ON public.notification_settings;
CREATE POLICY "notification_settings_manage" ON public.notification_settings
    FOR ALL USING (
        company_id IN (
            SELECT c.id FROM companies c
            JOIN company_members cm ON cm.company_id = c.id
            WHERE cm.user_id = auth.uid() AND cm.role IN ('owner', 'admin')
        )
    );

-- 7. Trigger updated_at para notification_settings
DROP TRIGGER IF EXISTS on_notification_settings_updated ON public.notification_settings;
CREATE TRIGGER on_notification_settings_updated
    BEFORE UPDATE ON public.notification_settings
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 8. Função RPC para marcar todas como lidas
CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS void AS $$
BEGIN
    UPDATE public.notifications
    SET is_read = true, read_at = NOW()
    WHERE user_id = auth.uid() AND is_read = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Função RPC para contar não-lidas
CREATE OR REPLACE FUNCTION get_unread_notification_count()
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM public.notifications
        WHERE user_id = auth.uid() AND is_read = false
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Enable Realtime para notificações (idempotente)
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN duplicate_object THEN
    -- Já está na publicação, ignorar
    NULL;
END;
$$;

-- =====================================================
-- 11. Templates de Notificação Editáveis (Admin)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.notification_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    event_key TEXT UNIQUE NOT NULL,   -- Chave única do evento (ex: 'new_subscription')
    name TEXT NOT NULL,               -- Nome legível (ex: 'Nova Assinatura')
    description TEXT,                 -- Descrição do evento
    
    -- Template de Email
    email_subject TEXT NOT NULL,
    email_body TEXT NOT NULL,          -- HTML com variáveis {{nome}}, {{empresa}}, etc.
    email_enabled BOOLEAN DEFAULT true,
    
    -- Template de WhatsApp
    whatsapp_message TEXT NOT NULL,    -- Texto com variáveis {{nome}}, {{empresa}}, etc.
    whatsapp_enabled BOOLEAN DEFAULT true,
    
    -- Template In-App
    in_app_title TEXT NOT NULL,
    in_app_message TEXT NOT NULL,
    in_app_icon TEXT DEFAULT 'IconBell',
    in_app_color TEXT DEFAULT '#228be6',
    in_app_enabled BOOLEAN DEFAULT true,
    
    -- Config
    category notification_category DEFAULT 'system',
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 12. Comunicados em Massa (Admin)
CREATE TABLE IF NOT EXISTS public.notification_broadcasts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    title TEXT NOT NULL,
    message TEXT NOT NULL,             -- Conteúdo do comunicado (HTML para email)
    whatsapp_message TEXT,             -- Versão texto para WhatsApp
    image_url TEXT,                    -- URL da imagem (opcional)
    
    channels TEXT[] DEFAULT ARRAY['email', 'in_app'], -- Canais de envio
    target_audience TEXT DEFAULT 'all', -- 'all', 'active', 'tool:xxx', 'partners', etc.
    
    action_url TEXT,                   -- Link do botão de ação (também envolve imagem)
    action_label TEXT,                 -- Texto do botão (ex: 'Saiba Mais')
    
    status TEXT DEFAULT 'draft',       -- draft, sending, sent, failed
    sent_at TIMESTAMPTZ,
    sent_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 13. RLS para templates e broadcasts
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_broadcasts ENABLE ROW LEVEL SECURITY;

-- Templates: apenas admins (leitura e escrita)
DROP POLICY IF EXISTS "notification_templates_admin" ON public.notification_templates;
CREATE POLICY "notification_templates_admin" ON public.notification_templates
    FOR ALL USING (is_admin_user());

-- Broadcasts: apenas admins
DROP POLICY IF EXISTS "notification_broadcasts_admin" ON public.notification_broadcasts;
CREATE POLICY "notification_broadcasts_admin" ON public.notification_broadcasts
    FOR ALL USING (is_admin_user());

-- 14. Triggers updated_at
DROP TRIGGER IF EXISTS on_notification_templates_updated ON public.notification_templates;
CREATE TRIGGER on_notification_templates_updated
    BEFORE UPDATE ON public.notification_templates
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS on_notification_broadcasts_updated ON public.notification_broadcasts;
CREATE TRIGGER on_notification_broadcasts_updated
    BEFORE UPDATE ON public.notification_broadcasts
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 15. Índices
CREATE INDEX IF NOT EXISTS idx_notification_templates_event 
    ON public.notification_templates(event_key);

CREATE INDEX IF NOT EXISTS idx_notification_broadcasts_status 
    ON public.notification_broadcasts(status, created_at DESC);

-- =====================================================
-- 16. Seed: Templates padrão para eventos do sistema
-- =====================================================
INSERT INTO public.notification_templates (event_key, name, description, category, email_subject, email_body, whatsapp_message, in_app_title, in_app_message, in_app_icon, in_app_color) VALUES

-- Nova Assinatura
('new_subscription', 'Nova Assinatura', 'Notificação quando uma nova assinatura é criada', 'billing',
 '🎉 Assinatura ativada - Sincla',
 '<p>Olá, {{nome}}!</p><p>Sua assinatura do plano <strong>{{plano}}</strong> foi ativada com sucesso para a empresa <strong>{{empresa}}</strong>.</p><p>Agora você tem acesso completo às ferramentas do seu plano. Explore e aproveite!</p>',
 '🎉 Olá, {{nome}}! Sua assinatura do plano *{{plano}}* foi ativada para a empresa *{{empresa}}*. Acesse: {{link}}',
 'Assinatura Ativada 🎉',
 'Sua assinatura do plano {{plano}} foi ativada com sucesso!',
 'IconCreditCard', '#10b981'),

-- Lembrete de Renovação (7 dias antes)
('subscription_renewal_reminder', 'Lembrete de Renovação', 'Aviso 7 dias antes do vencimento da assinatura', 'billing',
 '⏰ Sua assinatura renova em breve - Sincla',
 '<p>Olá, {{nome}}!</p><p>Sua assinatura do Sincla vence em <strong>{{dias}} dias</strong> ({{data_vencimento}}).</p><p>Valor: <strong>R$ {{valor}}</strong></p><p>Certifique-se de que seu método de pagamento está atualizado para evitar interrupções.</p>',
 '⏰ Olá, {{nome}}! Sua assinatura Sincla vence em {{dias}} dias ({{data_vencimento}}). Valor: R$ {{valor}}. Mantenha seu pagamento em dia!',
 'Renovação em {{dias}} dias ⏰',
 'Sua assinatura vence em {{data_vencimento}}. Valor: R$ {{valor}}',
 'IconClock', '#f59e0b'),

-- Assinatura Vencida
('subscription_expired', 'Assinatura Vencida', 'Aviso quando a assinatura vence', 'alert',
 '⚠️ Sua assinatura venceu - Sincla',
 '<p>Olá, {{nome}}!</p><p>Sua assinatura do Sincla <strong>venceu em {{data_vencimento}}</strong>.</p><p>Para continuar utilizando as ferramentas, renove sua assinatura o quanto antes.</p>',
 '⚠️ Olá, {{nome}}! Sua assinatura Sincla venceu em {{data_vencimento}}. Renove para continuar usando: {{link}}',
 'Assinatura Vencida ⚠️',
 'Sua assinatura venceu em {{data_vencimento}}. Renove para continuar.',
 'IconAlertTriangle', '#ef4444'),

-- Pagamento em Atraso
('subscription_overdue', 'Pagamento em Atraso', 'Aviso de pagamento em atraso', 'alert',
 '🔴 Pagamento em atraso - Sincla',
 '<p>Olá, {{nome}}!</p><p>Identificamos que o pagamento da sua assinatura está <strong>em atraso desde {{data_vencimento}}</strong>.</p><p>Regularize sua situação para evitar a suspensão dos serviços.</p>',
 '🔴 Olá, {{nome}}! Seu pagamento Sincla está em atraso desde {{data_vencimento}}. Regularize para evitar suspensão: {{link}}',
 'Pagamento em Atraso 🔴',
 'Pagamento em atraso desde {{data_vencimento}}.',
 'IconAlertTriangle', '#dc2626'),

-- Aviso de Bloqueio
('subscription_block_warning', 'Aviso de Bloqueio', 'Último aviso antes do bloqueio da conta', 'alert',
 '🚨 Último aviso: conta será bloqueada - Sincla',
 '<p>Olá, {{nome}}!</p><p>Este é o <strong>último aviso</strong> antes do bloqueio da sua conta.</p><p>Sua assinatura está vencida desde <strong>{{data_vencimento}}</strong> e será bloqueada em <strong>{{dias_bloqueio}} dias</strong>.</p><p>Regularize agora para não perder acesso às suas ferramentas e dados.</p>',
 '🚨 ÚLTIMO AVISO, {{nome}}! Sua conta Sincla será bloqueada em {{dias_bloqueio}} dias. Regularize agora: {{link}}',
 'Conta será Bloqueada 🚨',
 'Sua conta será bloqueada em {{dias_bloqueio}} dias. Regularize!',
 'IconLock', '#dc2626'),

-- Convite de Acesso
('user_invited', 'Convite de Acesso', 'Quando um usuário é convidado para acessar uma empresa', 'system',
 '🚀 Você foi convidado para {{empresa}} - Sincla',
 '<p>Olá!</p><p>Você recebeu um convite para acessar a empresa <strong>{{empresa}}</strong> no Sincla.</p><p>Clique no botão abaixo para aceitar o convite e começar a usar a plataforma.</p>',
 '🚀 Você foi convidado para acessar *{{empresa}}* no Sincla! Acesse: {{link}}',
 'Convite de Acesso 🚀',
 'Você foi convidado para acessar {{empresa}}.',
 'IconUserPlus', '#228be6'),

-- Novo Membro na Empresa
('new_team_member', 'Novo Membro na Equipe', 'Quando um novo usuário ganha acesso à empresa', 'system',
 'Novo membro na equipe - {{empresa}}',
 '<p>Olá, {{nome}}!</p><p>O usuário <strong>{{novo_membro}}</strong> agora tem acesso à empresa <strong>{{empresa}}</strong> com o perfil <strong>{{perfil}}</strong>.</p>',
 'ℹ️ Novo membro na equipe! *{{novo_membro}}* agora tem acesso à empresa *{{empresa}}* como {{perfil}}.',
 'Novo Membro na Equipe',
 '{{novo_membro}} agora tem acesso à {{empresa}} como {{perfil}}.',
 'IconUsers', '#228be6'),

-- Nova Empresa Cadastrada
('new_company', 'Nova Empresa Cadastrada', 'Quando uma nova empresa é registrada na plataforma', 'system',
 '🏢 Empresa cadastrada com sucesso - Sincla',
 '<p>Olá, {{nome}}!</p><p>A empresa <strong>{{empresa}}</strong> foi cadastrada com sucesso no Sincla.</p><p>Agora você pode configurar suas ferramentas e convidar sua equipe.</p>',
 '🏢 Empresa *{{empresa}}* cadastrada com sucesso no Sincla! Configure suas ferramentas: {{link}}',
 'Empresa Criada 🏢',
 'A empresa {{empresa}} foi cadastrada com sucesso!',
 'IconBuilding', '#10b981'),

-- Upgrade de Plano
('plan_upgrade', 'Upgrade de Plano', 'Quando o cliente faz upgrade do plano', 'billing',
 '⬆️ Upgrade realizado com sucesso - Sincla',
 '<p>Olá, {{nome}}!</p><p>Seu plano foi atualizado de <strong>{{plano_anterior}}</strong> para <strong>{{plano_novo}}</strong> com sucesso!</p><p>Agora você tem acesso a ainda mais recursos. Aproveite!</p>',
 '⬆️ Upgrade realizado! Seu plano agora é *{{plano_novo}}*. Aproveite os novos recursos!',
 'Upgrade Realizado ⬆️',
 'Seu plano foi atualizado para {{plano_novo}}!',
 'IconArrowUpCircle', '#10b981'),

-- Downgrade de Plano
('plan_downgrade', 'Downgrade de Plano', 'Quando o cliente faz downgrade do plano', 'billing',
 'Alteração de plano - Sincla',
 '<p>Olá, {{nome}}!</p><p>Seu plano foi alterado de <strong>{{plano_anterior}}</strong> para <strong>{{plano_novo}}</strong>.</p><p>A mudança entra em vigor no próximo ciclo de cobrança.</p>',
 'ℹ️ Seu plano foi alterado de *{{plano_anterior}}* para *{{plano_novo}}*. Válido a partir do próximo ciclo.',
 'Plano Alterado',
 'Seu plano foi alterado para {{plano_novo}}.',
 'IconArrowDownCircle', '#f59e0b')

ON CONFLICT (event_key) DO NOTHING;

-- =====================================================
-- Done! Notification system with templates ready.
-- =====================================================
