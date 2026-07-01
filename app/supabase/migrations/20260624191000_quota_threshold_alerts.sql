-- Alertas de consumo (80% / 100%) para storage, stream e banda.
-- Trigger BEFORE UPDATE em storage_quotas: ao cruzar um limiar, notifica os admins
-- ativos da empresa (in-app) e guarda o nível em alert_*_level para não repetir.
-- Ao cair abaixo do limiar, o nível é resetado (sem notificar) p/ permitir novo aviso.

CREATE OR REPLACE FUNCTION public.notify_quota_thresholds()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    pct int;
    lvl smallint;
BEGIN
    -- ─── STREAM (vídeos) ───
    IF COALESCE(NEW.stream_quota_bytes, 0) > 0 THEN
        pct := floor(NEW.stream_bytes::numeric / NEW.stream_quota_bytes * 100);
        lvl := CASE WHEN pct >= 100 THEN 100 WHEN pct >= 80 THEN 80 ELSE 0 END;
        IF lvl > COALESCE(NEW.alert_stream_level, 0) THEN
            INSERT INTO public.notifications (user_id, company_id, title, message, category, icon, color, source_tool, action_url, metadata)
            SELECT cm.user_id, NEW.company_id,
                   CASE WHEN lvl = 100 THEN 'Cota de vídeos esgotada' ELSE 'Cota de vídeos quase no limite' END,
                   CASE WHEN lvl = 100 THEN 'Seu armazenamento de vídeos atingiu 100% da cota. Amplie o espaço para continuar enviando.'
                        ELSE 'Seu armazenamento de vídeos passou de 80% da cota.' END,
                   'system', 'database',
                   CASE WHEN lvl = 100 THEN '#fa5252' ELSE '#fab005' END,
                   'hub', '/painel/consumo',
                   jsonb_build_object('type', 'stream_quota', 'level', lvl, 'percent', pct)
              FROM public.company_members cm
             WHERE cm.company_id = NEW.company_id AND cm.status = 'active' AND cm.role IN ('owner', 'admin');
            NEW.alert_stream_level := lvl;
        ELSIF lvl < COALESCE(NEW.alert_stream_level, 0) THEN
            NEW.alert_stream_level := lvl;
        END IF;
    END IF;

    -- ─── STORAGE (arquivos) ───
    IF COALESCE(NEW.storage_quota_bytes, 0) > 0 THEN
        pct := floor(NEW.storage_bytes::numeric / NEW.storage_quota_bytes * 100);
        lvl := CASE WHEN pct >= 100 THEN 100 WHEN pct >= 80 THEN 80 ELSE 0 END;
        IF lvl > COALESCE(NEW.alert_storage_level, 0) THEN
            INSERT INTO public.notifications (user_id, company_id, title, message, category, icon, color, source_tool, action_url, metadata)
            SELECT cm.user_id, NEW.company_id,
                   CASE WHEN lvl = 100 THEN 'Cota de arquivos esgotada' ELSE 'Cota de arquivos quase no limite' END,
                   CASE WHEN lvl = 100 THEN 'Seu armazenamento de arquivos atingiu 100% da cota.'
                        ELSE 'Seu armazenamento de arquivos passou de 80% da cota.' END,
                   'system', 'database',
                   CASE WHEN lvl = 100 THEN '#fa5252' ELSE '#fab005' END,
                   'hub', '/painel/consumo',
                   jsonb_build_object('type', 'storage_quota', 'level', lvl, 'percent', pct)
              FROM public.company_members cm
             WHERE cm.company_id = NEW.company_id AND cm.status = 'active' AND cm.role IN ('owner', 'admin');
            NEW.alert_storage_level := lvl;
        ELSIF lvl < COALESCE(NEW.alert_storage_level, 0) THEN
            NEW.alert_storage_level := lvl;
        END IF;
    END IF;

    -- ─── BANDA (entrega) ───
    IF COALESCE(NEW.bandwidth_quota_bytes, 0) > 0 THEN
        pct := floor(NEW.bandwidth_bytes::numeric / NEW.bandwidth_quota_bytes * 100);
        lvl := CASE WHEN pct >= 100 THEN 100 WHEN pct >= 80 THEN 80 ELSE 0 END;
        IF lvl > COALESCE(NEW.alert_bandwidth_level, 0) THEN
            INSERT INTO public.notifications (user_id, company_id, title, message, category, icon, color, source_tool, action_url, metadata)
            SELECT cm.user_id, NEW.company_id,
                   CASE WHEN lvl = 100 THEN 'Franquia de banda esgotada' ELSE 'Franquia de banda quase no limite' END,
                   CASE WHEN lvl = 100 THEN 'A franquia de banda de streaming do mês foi atingida. O excedente será cobrado conforme o plano.'
                        ELSE 'Sua banda de streaming passou de 80% da franquia do mês.' END,
                   'system', 'activity',
                   CASE WHEN lvl = 100 THEN '#fa5252' ELSE '#fab005' END,
                   'hub', '/painel/consumo',
                   jsonb_build_object('type', 'bandwidth_quota', 'level', lvl, 'percent', pct)
              FROM public.company_members cm
             WHERE cm.company_id = NEW.company_id AND cm.status = 'active' AND cm.role IN ('owner', 'admin');
            NEW.alert_bandwidth_level := lvl;
        ELSIF lvl < COALESCE(NEW.alert_bandwidth_level, 0) THEN
            NEW.alert_bandwidth_level := lvl;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_quota_thresholds ON public.storage_quotas;
CREATE TRIGGER trg_notify_quota_thresholds
    BEFORE UPDATE ON public.storage_quotas
    FOR EACH ROW EXECUTE FUNCTION public.notify_quota_thresholds();
