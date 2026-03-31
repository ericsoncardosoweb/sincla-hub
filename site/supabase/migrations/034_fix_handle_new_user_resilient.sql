-- =====================================================
-- SINCLA HUB - MIGRATION 034
-- Fix: handle_new_user trigger resiliente
-- Data: 2026-03-31
-- =====================================================
-- Problema: O trigger handle_new_user falha com
-- "Database error creating new user" quando:
--   1. O subscriber já existe (duplicate key)
--   2. A tabela partners não existe ou tem schema diferente
--   3. Qualquer erro no INSERT mesmo para user novo
-- Fix: Envolver TODO o corpo em EXCEPTION WHEN OTHERS
-- e usar INSERT ... ON CONFLICT DO NOTHING
-- =====================================================

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
        -- Silenciar erros na lógica de afiliados
        v_partner_id := NULL;
    END;
    
    -- Criar subscriber com ON CONFLICT para não falhar se já existir
    BEGIN
        INSERT INTO public.subscribers (id, email, name, referred_by)
        VALUES (
            NEW.id,
            NEW.email,
            COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
            v_partner_id
        )
        ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            name = COALESCE(EXCLUDED.name, subscribers.name),
            updated_at = NOW();
    EXCEPTION WHEN OTHERS THEN
        -- Se mesmo com ON CONFLICT falhar (ex: outra constraint),
        -- logar mas não bloquear a criação do auth user
        RAISE WARNING '[handle_new_user] Falha ao criar subscriber para %: %', NEW.email, SQLERRM;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
