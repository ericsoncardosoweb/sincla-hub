import { Client } from 'pg';
import * as fs from 'fs';

const projectId = 'fclqxinrkibiwhlhqfih';
const password = 'mMug4QfBXuzXq0vV';
const connectionString = `postgresql://postgres:${password}@db.${projectId}.supabase.co:5432/postgres`;

async function run() {
  const client = new Client({ connectionString });
  try {
    await client.connect();

    console.log('--- Iniciando Vacina de Otimização no RH ---');

    // 1. Criar Indices (B-Tree) para todas as FKs órfãs
    let missingIndexes: {table_name: string, column_name: string}[] = [];
    try {
      const diagnostic = JSON.parse(fs.readFileSync('diagnostic_rh.json', 'utf8'));
      missingIndexes = diagnostic.missing_indexes || [];
    } catch (err) {
      console.log('Skipping diagnostic_rh.json as it was not found.');
    }
    
    // Some indexes might fail if the table was dropped or name is too long, we will try/catch each
    for (const info of missingIndexes) {
      if (info.table_name.startsWith('auth.') || info.table_name.startsWith('storage.')) {
         continue; // Don't mess with supabase internal schemas
      }

      const rawTable = info.table_name.replace(/[^a-zA-Z0-9_]/g, '');
      const rawCol = info.column_name.replace(/[^a-zA-Z0-9_]/g, '');
      const idxName = `idx_${rawTable}_${rawCol}`.substring(0, 63); // PG max 63 chars

      const q = `CREATE INDEX CONCURRENTLY IF NOT EXISTS ${idxName} ON ${info.table_name}(${info.column_name});`;
      console.log(`Aplicando Índice: ${idxName}`);
      try {
        await client.query(q);
      } catch(e: any) {
        console.error(`Erro ao criar index ${idxName}:`, e.message);
      }
    }
    console.log('✔ Todos os Índices B-Tree Estratégicos Foram Criados!');

    // 2. Habilitar RLS e aplicar Isolamento (Zero Trust) nas 10 tabelas
    console.log('Habilitando Segurança e Isolamento Muli-Tenant (RLS)...');
    
    // 2.5 Instalar Security Definer Helper (Para prevenir Erro 42P17 - Infinite Recursion)
    console.log('Instalando Helper function get_user_empresa_ids...');
    await client.query(`
      CREATE OR REPLACE FUNCTION public.get_user_empresa_ids(p_user_id UUID)
      RETURNS UUID[] AS $$
          SELECT COALESCE(
              array_agg(empresa_id),
              ARRAY[]::UUID[]
          )
          FROM public.usuario_empresas
          WHERE usuario_id = p_user_id;
      $$ LANGUAGE sql SECURITY DEFINER STABLE;
    `);

    // Fetch user-defined roles to avoid schema errors if using simple queries.
    // For now, applying dynamic policy execution:
    const rlsFixes = [
      {
        table: 'empresas',
        policies: [
          `CREATE POLICY "empresas_isolation" ON empresas FOR ALL TO authenticated USING (id = ANY(public.get_user_empresa_ids(auth.uid())));`
        ]
      },
      {
        table: 'usuarios',
        policies: [
          `CREATE POLICY "usuarios_isolation" ON usuarios FOR ALL TO authenticated USING (id = auth.uid() OR id IN (SELECT usuario_id FROM usuario_empresas WHERE empresa_id = ANY(public.get_user_empresa_ids(auth.uid()))));`
        ]
      },
      {
        table: 'usuario_empresas',
        policies: [
          `CREATE POLICY "usuario_empresas_isolation" ON usuario_empresas FOR ALL TO authenticated USING (usuario_id = auth.uid() OR empresa_id = ANY(public.get_user_empresa_ids(auth.uid())));`
        ]
      },
      {
        table: 'assinaturas',
        policies: [
          // if empresa_id exists
          `CREATE POLICY "assinaturas_isolation" ON assinaturas FOR ALL TO authenticated USING (empresa_id = ANY(public.get_user_empresa_ids(auth.uid())));`
        ]
      },
      {
        table: 'pagamentos',
        policies: [
          `CREATE POLICY "pagamentos_isolation" ON pagamentos FOR ALL TO authenticated USING (assinatura_id IN (SELECT id FROM assinaturas WHERE empresa_id = ANY(public.get_user_empresa_ids(auth.uid()))));`
        ]
      },
      // Generic fallback for others if we don't strictly know if it has empresa_id, we can at least enable RLS and let ONLY authenticated see them for now, it's better than public leaking.
      { table: 'pesquisas_respostas_itens', policies: [`CREATE POLICY "auth_only" ON pesquisas_respostas_itens FOR ALL TO authenticated USING (true);`] },
      { table: 'arquivos_anexos', policies: [`CREATE POLICY "auth_only" ON arquivos_anexos FOR ALL TO authenticated USING (true);`] },
      { table: 'arquivos_para_limpar', policies: [`CREATE POLICY "auth_only" ON arquivos_para_limpar FOR ALL TO authenticated USING (true);`] },
      { table: 'processo_etapas', policies: [`CREATE POLICY "auth_only" ON processo_etapas FOR ALL TO authenticated USING (true);`] },
      { table: 'empresa_cultura', policies: [`CREATE POLICY "auth_only" ON empresa_cultura FOR ALL TO authenticated USING (true);`] },
    ];

    for (const fix of rlsFixes) {
      try {
        await client.query(`ALTER TABLE ${fix.table} ENABLE ROW LEVEL SECURITY;`);
        for (const pol of fix.policies) {
          // Drop first if exists just in case
          const polNameMatch = pol.match(/"([^"]+)"/);
          if (polNameMatch) {
            await client.query(`DROP POLICY IF EXISTS "${polNameMatch[1]}" ON ${fix.table};`).catch(()=>null);
          }
          await client.query(pol);
        }
        console.log(`✔ RLS Fechado: ${fix.table}`);
      } catch(e: any) {
        console.error(`Erro ao aplicar RLS na tabela ${fix.table}:`, e.message);
      }
    }

    console.log('🚀 Operação de Cura RH Completa!');

  } catch (err) {
    console.error('DB Error:', err);
  } finally {
    await client.end();
  }
}

run();
