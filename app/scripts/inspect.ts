import { createPgClient, SUPABASE_PROJECTS } from './lib/pgClient.js';

async function run() {
  const client = createPgClient(SUPABASE_PROJECTS.hub);
  try {
    await client.connect();
    
    // Check index definition
    const res = await client.query(`
      SELECT indexdef
      FROM pg_indexes
      WHERE tablename = 'company_contacts';
    `);

    console.log(res.rows);
  } catch (err) {
    console.error('DB Error:', err);
  } finally {
    await client.end();
  }
}

run();
