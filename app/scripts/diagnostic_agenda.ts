import * as fs from 'fs';
import { createPgClient, SUPABASE_PROJECTS } from './lib/pgClient.js';

async function run() {
  const client = createPgClient(SUPABASE_PROJECTS.agenda);
  try {
    await client.connect();

    // 1. Get all triggers
    const resTriggers = await client.query(`
      SELECT event_object_table, trigger_name, event_manipulation, action_statement
      FROM information_schema.triggers
      WHERE trigger_schema = 'public';
    `);

    // 2. Look for missing foreign key indexes
    const resFK = await client.query(`
      SELECT
        c.conrelid::regclass AS table_name,
        a.attname AS column_name
      FROM pg_constraint c
      JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
      WHERE c.contype = 'f' 
      AND NOT EXISTS (
        SELECT 1 FROM pg_index i
        WHERE i.indrelid = c.conrelid
        AND i.indkey[0] = a.attnum
      );
    `);

    // 3. RLS Check (which tables have RLS disabled)
    const resRLS = await client.query(`
      SELECT relname
      FROM pg_class
      WHERE relrowsecurity = false
      AND relkind = 'r'
      AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
    `);

    fs.writeFileSync('diagnostic_agenda.json', JSON.stringify({
       triggers: resTriggers.rows,
       missing_indexes: resFK.rows,
       rls_disabled: resRLS.rows
    }, null, 2));

  } catch (err) {
    console.error('DB Error:', err);
  } finally {
    await client.end();
  }
}

run();
