-- Atualiza WhatsApp oficial Sincla em platform_settings e páginas legais

UPDATE public.platform_settings
SET value = '(11) 97020-7076',
    updated_at = NOW()
WHERE key = 'empresa_whatsapp';

UPDATE public.legal_pages
SET content = REPLACE(content, '(11) 99999-9999', '(11) 97020-7076'),
    updated_at = NOW()
WHERE content LIKE '%99999-9999%';
