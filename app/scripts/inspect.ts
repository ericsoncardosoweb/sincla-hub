import { Client } from 'pg';

const projectId = 'igwjtvdanulrwntdyfbt';
const password = 'mMug4QfBXuzXq0vV';
const connectionString = `postgresql://postgres:${password}@db.${projectId}.supabase.co:5432/postgres`;

async function run() {
  const client = new Client({ connectionString });
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
