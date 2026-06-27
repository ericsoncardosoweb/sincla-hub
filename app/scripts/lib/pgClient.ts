import { Client } from 'pg';
import { requireEnv } from './loadEnv.js';

/** Project refs públicos do ecossistema Sincla */
export const SUPABASE_PROJECTS = {
  hub: 'igwjtvdanulrwntdyfbt',
  agenda: 'xupyvnyukhxdmfyrrozs',
  ead: 'gfgrifbpsfjugdmlyvjl',
  rh: 'fclqxinrkibiwhlhqfih',
  vagas: 'zsnjddocencekcupzxeh',
  bolso: 'yjyiryqaokmqjeblsqgl',
  crm: 'szpvltsqkmklesdorgly',
  lead: 'fnncbpfhuejjebfwyqoq',
} as const;

export type SupabaseProjectKey = keyof typeof SUPABASE_PROJECTS;

export function getConnectionString(projectRef: string): string {
  const password = requireEnv('SUPABASE_DB_PASSWORD');
  const encoded = encodeURIComponent(password);
  return `postgresql://postgres:${encoded}@db.${projectRef}.supabase.co:5432/postgres`;
}

export function createPgClient(projectRef: string): Client {
  return new Client({ connectionString: getConnectionString(projectRef) });
}
