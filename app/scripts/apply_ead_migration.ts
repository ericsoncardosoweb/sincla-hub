import fs from 'fs';
import path from 'path';
import { createPgClient, SUPABASE_PROJECTS } from './lib/pgClient.js';

const migrationPath = path.resolve(
  import.meta.dirname,
  '../../tools/ead/supabase/migrations/20260624180000_tenant_entitlements.sql',
);

async function main() {
  const sql = fs.readFileSync(migrationPath, 'utf8');
  const client = createPgClient(SUPABASE_PROJECTS.ead);
  await client.connect();
  try {
    await client.query(sql);
    const { rows } = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'tenants'
        AND column_name IN ('feature_flags', 'account_type', 'transaction_fee_percent', 'hub_addons')
      ORDER BY 1
    `);
    console.log('Columns present:', rows.map((r) => r.column_name).join(', '));
    if (rows.length !== 4) {
      process.exitCode = 1;
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
