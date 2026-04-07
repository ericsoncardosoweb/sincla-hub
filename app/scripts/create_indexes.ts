import { Client } from 'pg';

const projectId = 'igwjtvdanulrwntdyfbt';
const password = 'mMug4QfBXuzXq0vV';
const connectionString = `postgresql://postgres:${password}@db.${projectId}.supabase.co:5432/postgres`;

async function addMissingIndexes() {
  const client = new Client({ connectionString });
  try {
    await client.connect();

    console.log('Iniciando otimização de Performance (Criando Índices FK)...');

    const indexQueries = [
      "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sync_settings_product_id ON sync_settings(product_id);",
      "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_company_members_invited_by ON company_members(invited_by);",
      "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_member_product_access_granted_by ON member_product_access(granted_by);",
      "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_plan_feature_values_feature_id ON plan_feature_values(feature_id);",
      "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_plan_id ON subscriptions(plan_id);",
      "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_partner_withdrawals_processed_by ON partner_withdrawals(processed_by);",
      "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notification_broadcasts_created_by ON notification_broadcasts(created_by);",
      "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_provision_logs_product_id ON provision_logs(product_id);",
      "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_provision_logs_subscriber_id ON provision_logs(subscriber_id);",
    ];

    for (const query of indexQueries) {
      console.log(`Aplicando: ${query}`);
      await client.query(query);
    }

    console.log('✔ Todos os índices vitais foram criados com sucesso!');
  } catch (err) {
    console.error('Erro na otimização DB:', err);
  } finally {
    await client.end();
  }
}

addMissingIndexes();
