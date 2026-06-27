// Remoção dos vídeos órfãos do Bunny Stream (EAD).
// DRY-RUN por padrão. Para apagar de verdade: node ... --apply
// Segurança: revalida que o GUID NÃO está referenciado em lessons.video_url antes de apagar.
import fs from 'node:fs';

const APPLY = process.argv.includes('--apply');
const env = fs.readFileSync('tools/ead/.env', 'utf8');
const get = (k) => (env.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1]?.trim();
const EAD_URL = get('VITE_SUPABASE_URL');
const KEY = get('VITE_SUPABASE_SERVICE_ROLE_KEY');
const BUNNY_KEY = get('VITE_BUNNY_API_KEY');
const BUNNY_LIB = get('VITE_BUNNY_LIBRARY_ID');

// Lista revisada pelo usuário (11 órfãos de 2026-03-20)
const ORPHANS = [
  'af0173f6-594e-4166-81ae-2fc4e9110d23',
  'c6e71d4f-b0e1-4092-8d24-39d3f2bc08b7',
  '9b36cb6b-cbf1-4e2b-a1a4-96e9ca2e4ce0',
  '4eb8b47c-897c-4a0b-a6bb-56c78a0de99c',
  'a20ed3ee-6723-4c8b-a2b1-ff5c36e407d2',
  '8d57d4b2-b5f0-4b79-be4e-c37180fca0b4',
  'de586d96-a1d4-4a46-8067-5049bfaa6817',
  '00c545d7-6c05-4bf1-9e39-5b91de430eef',
  '5d73a30a-4d80-48cd-867f-2103be32f0d8',
  '79bef553-31cf-4607-bf53-5c81e67bf4d4',
  'c052cf9c-4e09-492d-958b-633d3f537666',
];

const h = { apikey: KEY, Authorization: `Bearer ${KEY}` };
const lessons = await (await fetch(`${EAD_URL}/rest/v1/lessons?select=video_url`, { headers: h })).json();
const referenced = new Set();
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/ig;
for (const l of lessons) { for (const m of (l.video_url || '').matchAll(UUID)) referenced.add(m[0].toLowerCase()); }

console.log(APPLY ? '*** MODO APPLY (vai apagar) ***' : '--- DRY-RUN (nada será apagado) ---');
let freed = 0, toDelete = [];
for (const guid of ORPHANS) {
  const r = await fetch(`https://video.bunnycdn.com/library/${BUNNY_LIB}/videos/${guid}`, { headers: { AccessKey: BUNNY_KEY } });
  if (!r.ok) { console.log(`SKIP ${guid} (não existe mais no Bunny: ${r.status})`); continue; }
  const v = await r.json();
  if (referenced.has(guid.toLowerCase())) { console.log(`PROTEGIDO ${guid} — agora referenciado por aula, NÃO apagar`); continue; }
  freed += v.storageSize || 0;
  toDelete.push(guid);
  console.log(`${APPLY ? 'APAGAR' : 'apagaria'} ${((v.storageSize || 0) / 1073741824).toFixed(3)} GB | ${guid} | ${v.title}`);
}
console.log(`\nTotal: ${toDelete.length} vídeos | ${(freed / 1073741824).toFixed(3)} GB`);

if (APPLY) {
  for (const guid of toDelete) {
    const r = await fetch(`https://video.bunnycdn.com/library/${BUNNY_LIB}/videos/${guid}`, { method: 'DELETE', headers: { AccessKey: BUNNY_KEY } });
    console.log(`DELETE ${guid} -> ${r.status}`);
  }
  console.log('Concluído.');
} else {
  console.log('Para apagar: node app/scripts/ead_orphans_delete.mjs --apply');
}
