import * as fs from 'fs';
import { createPgClient, SUPABASE_PROJECTS } from './lib/pgClient.js';

async function run() {
  const client = createPgClient(SUPABASE_PROJECTS.agenda);
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
