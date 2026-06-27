// Levantamento (SOMENTE LEITURA) para backfill de stream storage do EAD no Hub.
// Mapeia vídeos do Bunny -> lesson.video_url -> módulo -> curso -> tenant (=company_id Hub).
// Lê tools/ead/.env. Não escreve nada.
import fs from 'node:fs';

const env = fs.readFileSync('tools/ead/.env', 'utf8');
const get = (k) => (env.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1]?.trim();
const EAD_URL = get('VITE_SUPABASE_URL');
const KEY = get('VITE_SUPABASE_SERVICE_ROLE_KEY');
const BUNNY_KEY = get('VITE_BUNNY_API_KEY');
const BUNNY_LIB = get('VITE_BUNNY_LIBRARY_ID');

const h = { apikey: KEY, Authorization: `Bearer ${KEY}` };
const restAll = async (path) => {
  const r = await fetch(`${EAD_URL}/rest/v1/${path}`, { headers: h });
  if (!r.ok) { console.error('EAD REST erro', path, r.status, await r.text()); process.exit(1); }
  return r.json();
};

// 1) Bunny: guid -> storageSize
const bunny = new Map();
{
  let page = 1, total = 0, fetched = 0;
  while (true) {
    const r = await fetch(
      `https://video.bunnycdn.com/library/${BUNNY_LIB}/videos?page=${page}&itemsPerPage=100&orderBy=date`,
      { headers: { AccessKey: BUNNY_KEY } });
    const d = await r.json();
    total = d.totalItems;
    for (const v of (d.items || [])) bunny.set(v.guid, v.storageSize || 0);
    fetched += (d.items || []).length;
    if (fetched >= total || (d.items || []).length === 0) break;
    page++;
  }
}

// 2) EAD: lessons + modules + courses + videos(tabela)
const lessons = await restAll('lessons?select=id,module_id,title,video_url,video_provider');
const modules = await restAll('modules?select=id,course_id');
const courses = await restAll('courses?select=id,tenant_id');
const videosTbl = await restAll('videos?select=tenant_id,external_id,file_size_bytes,title');

const moduleToCourse = new Map(modules.map((m) => [m.id, m.course_id]));
const courseToTenant = new Map(courses.map((c) => [c.id, c.tenant_id]));

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const guidToTenant = new Map();

// 2a) via tabela videos (se houver)
for (const v of videosTbl) {
  if (v.external_id && bunny.has(v.external_id) && v.tenant_id && !guidToTenant.has(v.external_id))
    guidToTenant.set(v.external_id, v.tenant_id);
}
// 2b) via lessons.video_url
for (const l of lessons) {
  if (!l.video_url) continue;
  const m = l.video_url.match(UUID);
  if (!m) continue;
  const guid = m[0];
  if (!bunny.has(guid)) continue;
  const tenant = courseToTenant.get(moduleToCourse.get(l.module_id));
  if (tenant && !guidToTenant.has(guid)) guidToTenant.set(guid, tenant);
}

// 3) Agregar por tenant (dedupe por guid)
const byTenant = {};
let mapped = 0;
for (const [guid, size] of bunny) {
  const tenant = guidToTenant.get(guid);
  if (!tenant) continue;
  byTenant[tenant] = (byTenant[tenant] || 0) + size;
  mapped++;
}
let totalBytes = 0; for (const s of bunny.values()) totalBytes += s;
let mappedBytes = 0; for (const b of Object.values(byTenant)) mappedBytes += b;

console.log('lessons:', lessons.length, '| modules:', modules.length, '| courses:', courses.length, '| videos(tbl):', videosTbl.length);
console.log('Bunny vídeos:', bunny.size, '=', (totalBytes / 1073741824).toFixed(4), 'GB');
console.log('Mapeados a tenant:', mapped, '=', (mappedBytes / 1073741824).toFixed(4), 'GB');
console.log('Não mapeados (órfãos):', bunny.size - mapped, '=', ((totalBytes - mappedBytes) / 1073741824).toFixed(4), 'GB');
console.log('\n=== bytes por tenant_id (= company_id Hub) ===');
for (const [tid, bytes] of Object.entries(byTenant).sort((a, b) => b[1] - a[1]))
  console.log(`${tid}\t${bytes}\t${(bytes / 1073741824).toFixed(4)} GB`);
console.log('\nJSON', JSON.stringify(byTenant));
