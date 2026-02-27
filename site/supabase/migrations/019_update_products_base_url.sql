-- =====================================================
-- SINCLA HUB - MIGRATION 019
-- Atualiza Base URLs dos Produtos para Roteamento Local
-- =====================================================
-- Transição da arquitetura de Subdomínios Isolados para 
-- Proxying por Diretórios Subjacentes, visando o uso de 
-- SSO com Shadow Users através de caminhos relativos.
-- =====================================================

UPDATE products SET base_url = '/rh' WHERE id = 'rh';
UPDATE products SET base_url = '/ead' WHERE id = 'ead';
UPDATE products SET base_url = '/leads' WHERE id = 'leads';
UPDATE products SET base_url = '/agenda' WHERE id = 'agenda';
UPDATE products SET base_url = '/intranet' WHERE id = 'intranet';
