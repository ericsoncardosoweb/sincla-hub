# Contatos Centralizados

## Visão Geral

A tabela `company_contacts` é a **base centralizada e passiva** de contatos de cada empresa no Sincla Hub. Qualquer ferramenta do ecossistema (RH, CRM, EAD, etc.) envia e sincroniza contatos para esta tabela, mantendo uma visão unificada.

## Princípios

1. **Dados básicos apenas**: nome, email, telefone, WhatsApp, CPF, tipo e observações. Cada ferramenta possui seus próprios dados específicos.
2. **Sem duplicatas**: constraints de unicidade parcial por empresa (email, CPF, WhatsApp).
3. **Tipos customizáveis**: o campo `contact_type` é livre (VARCHAR). Tipos padrão: Contato, Lead, Cliente, Colaborador, Parceiro, Fornecedor. A empresa pode criar novos tipos via autocomplete.
4. **Rastreabilidade de origem**: campo `source` indica de onde veio o contato (manual, sincla-rh, sincla-crm, import, etc.).
5. **Multi-tenant via RLS**: isolamento por `company_id` com Row Level Security.

## Tabela: `company_contacts`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID PK | Identificador único |
| company_id | UUID FK | Empresa dona do contato |
| name | VARCHAR(255) | Nome (obrigatório) |
| email | VARCHAR(255) | Email (único por empresa) |
| phone | VARCHAR(20) | Telefone |
| whatsapp | VARCHAR(20) | WhatsApp (único por empresa) |
| cpf | VARCHAR(14) | CPF (único por empresa) |
| contact_type | VARCHAR(50) | Tipo do contato (customizável) |
| source | VARCHAR(50) | Origem: manual, sincla-rh, etc. |
| tags | JSONB | Tags livres |
| metadata | JSONB | Dados extras por ferramenta |
| notes | TEXT | Observações |
| status | VARCHAR(20) | active, inactive, blocked |

## Integração com Ferramentas

Cada ferramenta do ecossistema deve:
1. Ao criar um colaborador/lead/cliente, verificar se já existe em `company_contacts` (por email, CPF ou WhatsApp)
2. Se existir, usar o `id` existente e enriquecer com `metadata`
3. Se não existir, inserir com `source` indicando a ferramenta de origem

## Migration

Arquivo: `site/supabase/migrations/011_company_contacts.sql`

## Página no Dashboard

Rota: `/painel/contatos`  
Componente: `app/src/pages/Dashboard/Contacts.tsx`
