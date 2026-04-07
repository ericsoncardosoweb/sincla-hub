import { Client } from 'pg';
import * as fs from 'fs';

const projectId = 'xupyvnyukhxdmfyrrozs'; // Agenda
const password = 'mMug4QfBXuzXq0vV';
const connectionString = `postgresql://postgres:${password}@db.${projectId}.supabase.co:5432/postgres`;

async function addMissingIndexes() {
  const client = new Client({ connectionString });
  try {
    await client.connect();

    console.log('Iniciando Restauro de Segurança e Otimização do Agenda...');

    // 1. Fechando Falsos Positivos de RLS (Policies Erradas de Service Role em public)
    try {
      await client.query(`DROP POLICY IF EXISTS "service_role_full_access_microsoft_integrations" ON microsoft_integrations;`);
      console.log('✔ Brecha da Microsoft Integrations selada.');
    } catch(e) { /* ignored */ }
    
    try {
      await client.query(`DROP POLICY IF EXISTS "service_role_full_access_task_reminders" ON task_reminder_logs;`);
      console.log('✔ Brecha do Task Reminder Logs selada.');
    } catch(e) { /* ignored */ }

    // 2. Extraindo as 9 Dependencias Cegas 
    const diagnostic = JSON.parse(fs.readFileSync('diagnostic_agenda.json', 'utf8'));
    const missingIndexes = diagnostic.missing_indexes as {table_name: string, column_name: string}[];
    
    for (const info of missingIndexes) {
      if (info.table_name.startsWith('auth.') || info.table_name.startsWith('storage.')) {
         continue; // Only optimize public schema
      }

      const rawTable = info.table_name.replace(/[^a-zA-Z0-9_]/g, '');
      const rawCol = info.column_name.replace(/[^a-zA-Z0-9_]/g, '');
      const idxName = `idx_${rawTable}_${rawCol}`.substring(0, 63);

      const q = `CREATE INDEX CONCURRENTLY IF NOT EXISTS ${idxName} ON ${info.table_name}(${info.column_name});`;
      console.log(`Aplicando Índice de Agenda: ${idxName}`);
      try {
        await client.query(q);
      } catch(e) {
        console.error(`Erro ao criar index ${idxName}:`, e.message);
      }
    }

    console.log('🚀 Todas as Correções do Agenda foram finalizadas!');
  } catch (err) {
    console.error('Erro na otimização DB Agenda:', err);
  } finally {
    await client.end();
  }
}

addMissingIndexes();
