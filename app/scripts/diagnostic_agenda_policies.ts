import { Client } from 'pg';
import * as fs from 'fs';

const projectId = 'xupyvnyukhxdmfyrrozs';
const password = 'mMug4QfBXuzXq0vV';
const connectionString = `postgresql://postgres:${password}@db.${projectId}.supabase.co:5432/postgres`;

async function run() {
  const client = new Client({ connectionString });
  try {
    await client.connect();

    const resPol = await client.query(`
      SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
      FROM pg_policies 
      WHERE schemaname = 'public';
    `);

    fs.writeFileSync('diagnostic_agenda_policies.json', JSON.stringify({
       policies: resPol.rows,
    }, null, 2));

  } catch (err) {
    console.error('DB Error:', err);
  } finally {
    await client.end();
  }
}

run();
