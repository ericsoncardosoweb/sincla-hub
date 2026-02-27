-- =====================================================
-- MIGRATION 010: Tabela de Segmentos de Negócio
-- =====================================================
-- Segmentos pré-cadastrados para classificação de empresas.
-- Permite inteligência de negócio sobre perfil dos clientes.

CREATE TABLE IF NOT EXISTS business_segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    category VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_business_segments_category ON business_segments(category);
CREATE INDEX idx_business_segments_active ON business_segments(is_active);

-- RLS
ALTER TABLE business_segments ENABLE ROW LEVEL SECURITY;

-- Todos podem ler segmentos (tabela pública de referência)
CREATE POLICY "Anyone can read segments" ON business_segments
    FOR SELECT USING (true);

-- =====================================================
-- SEED: Segmentos de Negócio do Brasil
-- =====================================================

INSERT INTO business_segments (name, category, sort_order) VALUES
-- Tecnologia & Digital
('Tecnologia da Informação', 'Tecnologia & Digital', 1),
('Desenvolvimento de Software', 'Tecnologia & Digital', 2),
('Consultoria em TI', 'Tecnologia & Digital', 3),
('E-commerce', 'Tecnologia & Digital', 4),
('Marketing Digital', 'Tecnologia & Digital', 5),
('Startups', 'Tecnologia & Digital', 6),
('Inteligência Artificial', 'Tecnologia & Digital', 7),
('Cybersegurança', 'Tecnologia & Digital', 8),
('Telecom e Provedores de Internet', 'Tecnologia & Digital', 9),

-- Saúde
('Saúde e Bem-estar', 'Saúde', 10),
('Hospitais e Clínicas', 'Saúde', 11),
('Laboratórios', 'Saúde', 12),
('Farmácias', 'Saúde', 13),
('Odontologia', 'Saúde', 14),
('Psicologia', 'Saúde', 15),
('Nutrição', 'Saúde', 16),
('Medicina Veterinária', 'Saúde', 17),
('Fisioterapia', 'Saúde', 18),
('Órteses e Próteses', 'Saúde', 19),
('Home Care', 'Saúde', 20),

-- Varejo & Comércio
('Supermercados', 'Varejo & Comércio', 21),
('Minimercados e Mercearias', 'Varejo & Comércio', 22),
('Loja de Roupas e Moda', 'Varejo & Comércio', 23),
('Loja de Calçados', 'Varejo & Comércio', 24),
('Loja de Cosméticos', 'Varejo & Comércio', 25),
('Ótica', 'Varejo & Comércio', 26),
('Joalheria e Relojoaria', 'Varejo & Comércio', 27),
('Loja de Eletrônicos', 'Varejo & Comércio', 28),
('Loja de Móveis', 'Varejo & Comércio', 29),
('Loja de Materiais de Construção', 'Varejo & Comércio', 30),
('Pet Shop', 'Varejo & Comércio', 31),
('Papelaria', 'Varejo & Comércio', 32),
('Livraria', 'Varejo & Comércio', 33),
('Floricultura', 'Varejo & Comércio', 34),
('Atacado e Distribuição', 'Varejo & Comércio', 35),
('Conveniência', 'Varejo & Comércio', 36),
('Sex Shop', 'Varejo & Comércio', 37),
('Tabacaria', 'Varejo & Comércio', 38),
('Loja de Brinquedos', 'Varejo & Comércio', 39),

-- Alimentação
('Restaurantes', 'Alimentação', 40),
('Lanchonetes e Fast Food', 'Alimentação', 41),
('Delivery de Comida', 'Alimentação', 42),
('Padarias e Confeitarias', 'Alimentação', 43),
('Açougue', 'Alimentação', 44),
('Bar e Pub', 'Alimentação', 45),
('Cafeteria', 'Alimentação', 46),
('Sorveterias', 'Alimentação', 47),
('Food Truck', 'Alimentação', 48),
('Pizzaria', 'Alimentação', 49),
('Hamburgueria', 'Alimentação', 50),
('Marmitaria', 'Alimentação', 51),

-- Educação
('Educação e Ensino', 'Educação', 52),
('Escola Particular', 'Educação', 53),
('Cursos Profissionalizantes', 'Educação', 54),
('Auto Escola', 'Educação', 55),
('Idiomas', 'Educação', 56),
('EAD e Cursos Online', 'Educação', 57),
('Creches e Berçários', 'Educação', 58),
('Ensino Superior', 'Educação', 59),
('Coaching e Mentoria', 'Educação', 60),

-- Serviços Profissionais
('Advocacia e Jurídico', 'Serviços Profissionais', 61),
('Contabilidade', 'Serviços Profissionais', 62),
('Consultoria Empresarial', 'Serviços Profissionais', 63),
('Recursos Humanos', 'Serviços Profissionais', 64),
('Arquitetura e Design', 'Serviços Profissionais', 65),
('Engenharia', 'Serviços Profissionais', 66),
('Publicidade e Propaganda', 'Serviços Profissionais', 67),
('Fotografia e Vídeo', 'Serviços Profissionais', 68),
('Eventos e Festas', 'Serviços Profissionais', 69),
('Assessoria de Imprensa', 'Serviços Profissionais', 70),
('Tradução e Interpretação', 'Serviços Profissionais', 71),
('Cobrança e Recuperação de Crédito', 'Serviços Profissionais', 72),

-- Indústria
('Indústria Alimentícia', 'Indústria', 73),
('Indústria Têxtil', 'Indústria', 74),
('Indústria Metalúrgica', 'Indústria', 75),
('Indústria Química', 'Indústria', 76),
('Indústria Farmacêutica', 'Indústria', 77),
('Indústria Automotiva', 'Indústria', 78),
('Indústria de Embalagens', 'Indústria', 79),
('Indústria de Plásticos', 'Indústria', 80),
('Indústria Eletrônica', 'Indústria', 81),
('Indústria Moveleira', 'Indústria', 82),
('Indústria de Papel e Celulose', 'Indústria', 83),

-- Construção & Imobiliário
('Construção Civil', 'Construção & Imobiliário', 84),
('Imobiliárias', 'Construção & Imobiliário', 85),
('Incorporadora', 'Construção & Imobiliário', 86),
('Administração de Condomínios', 'Construção & Imobiliário', 87),
('Reformas e Manutenção', 'Construção & Imobiliário', 88),
('Paisagismo', 'Construção & Imobiliário', 89),

-- Financeiro
('Seguros', 'Financeiro', 90),
('Corretora de Valores', 'Financeiro', 91),
('Fintech', 'Financeiro', 92),
('Cooperativa de Crédito', 'Financeiro', 93),
('Consórcios', 'Financeiro', 94),
('Câmbio', 'Financeiro', 95),
('Factoring', 'Financeiro', 96),

-- Agro & Energia
('Agronegócio', 'Agro & Energia', 97),
('Pecuária', 'Agro & Energia', 98),
('Offshore e Petróleo', 'Agro & Energia', 99),
('Energia Solar', 'Agro & Energia', 100),
('Energia Eólica', 'Agro & Energia', 101),
('Mineração', 'Agro & Energia', 102),
('Pesca e Aquicultura', 'Agro & Energia', 103),
('Cooperativa Agrícola', 'Agro & Energia', 104),

-- Logística & Transporte
('Transportadora', 'Logística & Transporte', 105),
('Logística', 'Logística & Transporte', 106),
('Despachante', 'Logística & Transporte', 107),
('Motoboy e Entregas', 'Logística & Transporte', 108),
('Uber e Transporte por App', 'Logística & Transporte', 109),
('Locadora de Veículos', 'Logística & Transporte', 110),
('Armazenagem e Self Storage', 'Logística & Transporte', 111),

-- Beleza & Estética
('Salão de Beleza', 'Beleza & Estética', 112),
('Barbearia', 'Beleza & Estética', 113),
('Clínica de Estética', 'Beleza & Estética', 114),
('SPA', 'Beleza & Estética', 115),
('Tatuagem e Piercing', 'Beleza & Estética', 116),
('Micropigmentação', 'Beleza & Estética', 117),

-- Esporte & Lazer
('Academias', 'Esporte & Lazer', 118),
('Clube Esportivo', 'Esporte & Lazer', 119),
('Turismo e Viagens', 'Esporte & Lazer', 120),
('Hotelaria e Pousadas', 'Esporte & Lazer', 121),
('Parque de Diversões', 'Esporte & Lazer', 122),
('Casa de Festas', 'Esporte & Lazer', 123),
('Escape Room e Entretenimento', 'Esporte & Lazer', 124),

-- Serviços Gerais
('Limpeza e Conservação', 'Serviços Gerais', 125),
('Segurança Privada', 'Serviços Gerais', 126),
('Jardinagem', 'Serviços Gerais', 127),
('Lavanderias', 'Serviços Gerais', 128),
('Chaveiro', 'Serviços Gerais', 129),
('Assistência Técnica', 'Serviços Gerais', 130),
('Oficina Mecânica', 'Serviços Gerais', 131),
('Borracharia', 'Serviços Gerais', 132),
('Dedetização', 'Serviços Gerais', 133),
('Desentupidora', 'Serviços Gerais', 134),

-- Terceiro Setor
('ONG e Associações', 'Terceiro Setor', 135),
('Igrejas e Instituições Religiosas', 'Terceiro Setor', 136),
('Sindicatos', 'Terceiro Setor', 137),
('Fundações', 'Terceiro Setor', 138),

-- Governo & Público
('Órgão Público', 'Governo & Público', 139),
('Autarquia', 'Governo & Público', 140),
('Empresa Pública', 'Governo & Público', 141),

-- Outros
('Outros', 'Outros', 999)

ON CONFLICT (name) DO NOTHING;
