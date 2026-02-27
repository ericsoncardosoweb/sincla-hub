-- =====================================================
-- SINCLA HUB - MIGRATION 015
-- Corrige a trigger de handle_new_user para setar search_path
-- e evitar erros no Supabase Auth durante o cadastro
-- =====================================================

-- 1. CORRIGIR: handle_new_user (Adicionar SET search_path)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_partner_id UUID;
    v_affiliate_ref TEXT;
BEGIN
    -- Extrair código de afiliado do metadata (se presente)
    v_affiliate_ref := NEW.raw_user_meta_data->>'affiliate_ref';
    
    -- Resolver código de afiliado para partner_id
    IF v_affiliate_ref IS NOT NULL AND v_affiliate_ref != '' THEN
        SELECT id INTO v_partner_id
        FROM public.partners 
        WHERE affiliate_code = v_affiliate_ref 
          AND status = 'active';
    END IF;
    
    -- Criar subscriber com referred_by se encontrado
    INSERT INTO public.subscribers (id, email, name, referred_by)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        v_partner_id  -- NULL se não tiver código ou código inválido
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. CORRIGIR: prevent_self_referral (Adicionar SET search_path)
CREATE OR REPLACE FUNCTION public.prevent_self_referral()
RETURNS TRIGGER AS $$
DECLARE
    v_partner_user_id UUID;
BEGIN
    IF NEW.referred_by IS NOT NULL THEN
        -- Buscar o user_id do parceiro
        SELECT user_id INTO v_partner_user_id
        FROM public.partners WHERE id = NEW.referred_by;
        
        -- Bloquear se o subscriber é o próprio parceiro
        IF v_partner_user_id = NEW.id THEN
            RAISE EXCEPTION 'Parceiro não pode indicar a si mesmo';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;
