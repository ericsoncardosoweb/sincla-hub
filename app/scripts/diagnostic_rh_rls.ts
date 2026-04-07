import { Client } from 'pg';
import * as fs from 'fs';

const projectId = 'fclqxinrkibiwhlhqfih'; // RH Project
const password = 'mMug4QfBXuzXq0vV';
const connectionString = `postgresql://postgres:${password}@db.${projectId}.supabase.co:5432/postgres`;

async function run() {
  const client = new Client({ connectionString });
  try {
    await client.connect();

    // 3. RLS Check (which tables have RLS disabled)
    const resRLS = await client.query(`
      SELECT relname
      FROM pg_class
      WHERE relrowsecurity = false
      AND relkind = 'r'
      AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
    `);

    fs.writeFileSync('diagnostic_rh_rls.json', JSON.stringify({
       rls_disabled: resRLS.rows
    }, null, 2));

  } catch (err) {
    console.error('DB Error:', err);
  } finally {
    await client.end();
  }
}

run();
