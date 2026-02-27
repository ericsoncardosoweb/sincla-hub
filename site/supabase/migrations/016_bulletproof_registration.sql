-- =====================================================
-- SINCLA HUB - MIGRATION 016
-- Cadastro à prova de balas e Desacoplamento de Afiliados
-- =====================================================

-- 1. TRIGGER BLINDADA (handle_new_user)
-- Se qualquer erro acontecer na busca do afiliado, ele é ignorado
-- e o usuário é criado normalmente sem travar o frontend.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_partner_id UUID;
    v_affiliate_ref TEXT;
BEGIN
    BEGIN
        -- Extrair código de afiliado do metadata
        v_affiliate_ref := NEW.raw_user_meta_data->>'affiliate_ref';
        
        -- Tentar resolver o partner_id
        IF v_affiliate_ref IS NOT NULL AND v_affiliate_ref != '' THEN
            SELECT id INTO v_partner_id
            FROM public.partners 
            WHERE affiliate_code = v_affiliate_ref 
              AND status = 'active';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        -- Silenciar erros na lógica de afiliados para não barrar o cadastro
        v_partner_id := NULL;
    END;
    
    -- Criar subscriber
    INSERT INTO public.subscribers (id, email, name, referred_by)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        v_partner_id
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- 2. FUNÇÃO MANUAL PARA VINCULAR AFILIADO DEPOIS DO CADASTRO (Opcional)
-- Permite que o frontend atualize o referred_by separadamente (se ainda for nulo)
CREATE OR REPLACE FUNCTION public.link_affiliate_code(p_code TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_partner_id UUID;
    v_subscriber_id UUID;
    v_current_ref UUID;
BEGIN
    -- Obter o usuário logado
    v_subscriber_id := auth.uid();
    IF v_subscriber_id IS NULL THEN
        RAISE EXCEPTION 'Não autenticado';
    END IF;

    -- Verificar se já tem afiliado
    SELECT referred_by INTO v_current_ref
    FROM public.subscribers WHERE id = v_subscriber_id;
    
    IF v_current_ref IS NOT NULL THEN
        RAISE EXCEPTION 'Este usuário já possui um afiliado vinculado.';
    END IF;

    -- Buscar o parceiro pelo código
    SELECT id INTO v_partner_id
    FROM public.partners
    WHERE affiliate_code = p_code
      AND status = 'active';

    IF v_partner_id IS NULL THEN
        RAISE EXCEPTION 'Código de afiliado inválido ou inativo.';
    END IF;

    -- Impede auto-indicação
    IF EXISTS (SELECT 1 FROM public.partners WHERE id = v_partner_id AND user_id = v_subscriber_id) THEN
        RAISE EXCEPTION 'Não é possível usar seu próprio código de afiliado.';
    END IF;

    -- Atualizar o subscriber
    UPDATE public.subscribers
    SET referred_by = v_partner_id
    WHERE id = v_subscriber_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
