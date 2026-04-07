import { Client } from 'pg';

const projectId = 'igwjtvdanulrwntdyfbt';
const password = 'mMug4QfBXuzXq0vV';
const connectionString = `postgresql://postgres:${password}@db.${projectId}.supabase.co:5432/postgres`;

async function executeOptimizations() {
  const client = new Client({ connectionString });
  try {
    await client.connect();

    console.log('Initiating Hub Database Optimizations...');

    // 1. Otimizar indices unicos do Hub (contacts)
    // Garantir que nulls/vazios não colidam
    await client.query(`
      DROP INDEX IF EXISTS idx_contacts_unique_email;
      DROP INDEX IF EXISTS idx_contacts_unique_cpf;
      DROP INDEX IF EXISTS idx_contacts_unique_whatsapp;
      
      CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_unique_email
        ON company_contacts (company_id, email)
        WHERE email IS NOT NULL AND email != '';

      CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_unique_cpf
        ON company_contacts (company_id, cpf)
        WHERE cpf IS NOT NULL AND cpf != '';

      CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_unique_whatsapp
        ON company_contacts (company_id, whatsapp)
        WHERE whatsapp IS NOT NULL AND whatsapp != '';
    `);
    console.log('✔ Indices únicos corrigidos (company_contacts)');

    // 1.5 CRIAR SECURITY DEFINER FUNCTION PARA PREVENIR INFINITE RECURSION MÚLTIPLA
    await client.query(`
      CREATE OR REPLACE FUNCTION public.get_auth_user_company_ids(p_user_id UUID)
      RETURNS UUID[] AS $$
          SELECT COALESCE(
              array_agg(company_id),
              ARRAY[]::UUID[]
          )
          FROM public.company_members
          WHERE user_id = p_user_id;
      $$ LANGUAGE sql SECURITY DEFINER STABLE;

      CREATE OR REPLACE FUNCTION public.get_auth_admin_company_ids(p_user_id UUID)
      RETURNS UUID[] AS $$
          SELECT COALESCE(
              array_agg(company_id),
              ARRAY[]::UUID[]
          )
          FROM public.company_members
          WHERE user_id = p_user_id AND role IN ('owner', 'admin');
      $$ LANGUAGE sql SECURITY DEFINER STABLE;
      
      -- Helper for nested lookups in access policies
      CREATE OR REPLACE FUNCTION public.get_auth_company_member_ids(p_user_id UUID)
      RETURNS UUID[] AS $$
          SELECT COALESCE(
              array_agg(id),
              ARRAY[]::UUID[]
          )
          FROM public.company_members
          WHERE company_id = ANY(public.get_auth_user_company_ids(p_user_id))
          OR user_id = p_user_id;
      $$ LANGUAGE sql SECURITY DEFINER STABLE;
    `);
    console.log('✔ Helpers Security Definer instalados (Prevenção de 42P17)');

    // 2. Refazer o RLS de company_contacts de forma robusta e segura
    await client.query(`
      DROP POLICY IF EXISTS "company_contacts_insert" ON company_contacts;
      DROP POLICY IF EXISTS "company_contacts_select" ON company_contacts;
      DROP POLICY IF EXISTS "company_contacts_update" ON company_contacts;
      DROP POLICY IF EXISTS "company_contacts_delete" ON company_contacts;

      CREATE POLICY "company_contacts_select" ON company_contacts
        FOR SELECT
        USING (company_id = ANY(public.get_auth_user_company_ids(auth.uid())));

      CREATE POLICY "company_contacts_insert" ON company_contacts
        FOR INSERT
        WITH CHECK (company_id = ANY(public.get_auth_user_company_ids(auth.uid())));

      CREATE POLICY "company_contacts_update" ON company_contacts
        FOR UPDATE
        USING (company_id = ANY(public.get_auth_user_company_ids(auth.uid())));
        
      CREATE POLICY "company_contacts_delete" ON company_contacts
        FOR DELETE
        USING (company_id = ANY(public.get_auth_admin_company_ids(auth.uid())));
    `);
    console.log('✔ Políticas RLS seguras sem Recursividade (company_contacts)');

    // 3. Garantir a inserção de membros na company_members
    await client.query(`
      DROP POLICY IF EXISTS "Admins manage company members" ON company_members;
      DROP POLICY IF EXISTS "Users view company members" ON company_members;

      CREATE POLICY "Users view company members" ON company_members
        FOR SELECT
        USING (
          user_id = auth.uid() OR 
          company_id = ANY(public.get_auth_user_company_ids(auth.uid()))
        );

      CREATE POLICY "Admins manage company members" ON company_members
        FOR ALL
        USING (
          company_id = ANY(public.get_auth_admin_company_ids(auth.uid()))
        );
    `);
    console.log('✔ Políticas RLS seguras sem Recursividade (company_members)');

    // 4. member_product_access
    await client.query(`
      DROP POLICY IF EXISTS "Admins manage member product access" ON member_product_access;
      DROP POLICY IF EXISTS "Users view member access" ON member_product_access;
      
      CREATE POLICY "Users view member access" ON member_product_access
        FOR SELECT
        USING (
          company_member_id = ANY(public.get_auth_company_member_ids(auth.uid()))
        );

      CREATE POLICY "Admins manage member product access" ON member_product_access
        FOR ALL
        USING (
          company_member_id IN (
            SELECT id FROM company_members 
            WHERE company_id = ANY(public.get_auth_admin_company_ids(auth.uid()))
          )
        );
    `);
    console.log('✔ Políticas RLS otimizadas (member_product_access)');

    console.log('🚀 Hub Banco de Dados 100% Otimizado e Arredondado!');

  } catch (err) {
    console.error('Migration Error:', err);
  } finally {
    await client.end();
  }
}

executeOptimizations();
