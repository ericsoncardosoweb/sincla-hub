// Lista (somente leitura) os vídeos do Bunny SEM lesson vinculada (órfãos).
import fs from 'node:fs';
const env = fs.readFileSync('tools/ead/.env', 'utf8');
const get = (k) => (env.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1]?.trim();
const EAD_URL = get('VITE_SUPABASE_URL');
const KEY = get('VITE_SUPABASE_SERVICE_ROLE_KEY');
const BUNNY_KEY = get('VITE_BUNNY_API_KEY');
const BUNNY_LIB = get('VITE_BUNNY_LIBRARY_ID');
const h = { apikey: KEY, Authorization: `Bearer ${KEY}` };
const restAll = async (p) => (await fetch(`${EAD_URL}/rest/v1/${p}`, { headers: h })).json();

const bunny = [];
{ let page = 1, total = 0, fetched = 0;
  while (true) {
    const r = await fetch(`https://video.bunnycdn.com/library/${BUNNY_LIB}/videos?page=${page}&itemsPerPage=100&orderBy=date`, { headers: { AccessKey: BUNNY_KEY } });
    const d = await r.json(); total = d.totalItems;
    for (const v of (d.items || [])) bunny.push(v);
    fetched += (d.items || []).length;
    if (fetched >= total || (d.items || []).length === 0) break; page++; } }

const lessons = await restAll('lessons?select=module_id,video_url');
const modules = await restAll('modules?select=id,course_id');
const courses = await restAll('courses?select=id,tenant_id');
const moduleToCourse = new Map(modules.map((m) => [m.id, m.course_id]));
const courseToTenant = new Map(courses.map((c) => [c.id, c.tenant_id]));
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const mapped = new Set();
for (const l of lessons) { const m = (l.video_url || '').match(UUID); if (m) mapped.add(m[0]); }

const orphans = bunny.filter((v) => !mapped.has(v.guid)).sort((a, b) => (b.storageSize || 0) - (a.storageSize || 0));
console.log('ÓRFÃOS:', orphans.length);
for (const v of orphans) {
  console.log(`${((v.storageSize || 0) / 1073741824).toFixed(3)} GB | ${(v.dateUploaded || '').slice(0, 10)} | ${v.guid} | ${v.title}`);
}
