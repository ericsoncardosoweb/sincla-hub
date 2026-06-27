// Fase 3.3 — Migra os vídeos existentes para collections por empresa no Bunny
// e gera o SQL de upsert para stream_collections/stream_videos no Hub.
// Lê chave Bunny + service role do EAD de tools/ead/.env. Não toca no Hub (só imprime SQL).
import fs from 'node:fs';
const read = (p, k) => ((fs.readFileSync(p, 'utf8').match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1] || '').trim();

const EAD_URL = read('tools/ead/.env', 'VITE_SUPABASE_URL');
const EAD_SERVICE = read('tools/ead/.env', 'VITE_SUPABASE_SERVICE_ROLE_KEY');
const BUNNY_KEY = read('tools/ead/.env', 'VITE_BUNNY_API_KEY');
const BUNNY_LIB = read('tools/ead/.env', 'VITE_BUNNY_LIBRARY_ID');
const BUNNY = 'https://video.bunnycdn.com';

// Empresas e collections (Op SIM já existe no Hub; Sincla será criada)
const OP_SIM = { id: '69782e1b-d0ec-4d9b-a450-bd4f154cf4d1', collection: '66e205f4-d845-437d-9933-18e58c5dcfea', name: 'Operação SIM' };
const SINCLA = { id: 'cedd2a32-d666-400b-a402-477a51da5d58', collection: null, name: 'Sincla' };

const bunnyHeaders = { AccessKey: BUNNY_KEY, 'Content-Type': 'application/json' };
const STATUS = { 0: 'created', 1: 'uploaded', 2: 'processing', 3: 'processing', 4: 'ready', 5: 'error' };

// 1) Vídeos no Bunny
const eadH = { apikey: EAD_SERVICE, Authorization: `Bearer ${EAD_SERVICE}` };
const bunnyVideos = [];
{
    let page = 1, total = 0, fetched = 0;
    while (true) {
        const r = await fetch(`${BUNNY}/library/${BUNNY_LIB}/videos?page=${page}&itemsPerPage=100&orderBy=date`, { headers: { AccessKey: BUNNY_KEY } });
        const d = await r.json(); total = d.totalItems;
        for (const v of (d.items || [])) bunnyVideos.push(v);
        fetched += (d.items || []).length;
        if (fetched >= total || (d.items || []).length === 0) break; page++;
    }
}

// 2) Mapear guid -> empresa via lessons
const restAll = async (p) => (await fetch(`${EAD_URL}/rest/v1/${p}`, { headers: eadH })).json();
const lessons = await restAll('lessons?select=module_id,video_url');
const modules = await restAll('modules?select=id,course_id');
const courses = await restAll('courses?select=id,tenant_id');
const moduleToCourse = new Map(modules.map((m) => [m.id, m.course_id]));
const courseToTenant = new Map(courses.map((c) => [c.id, c.tenant_id]));
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const guidToTenant = new Map();
for (const l of lessons) {
    const m = (l.video_url || '').match(UUID);
    if (!m) continue;
    const guid = m[0];
    const tenant = courseToTenant.get(moduleToCourse.get(l.module_id));
    if (tenant && !guidToTenant.has(guid)) guidToTenant.set(guid, tenant);
}

// 3) Criar collection da Sincla se necessário
const sinclaVideos = bunnyVideos.filter((v) => guidToTenant.get(v.guid) === SINCLA.id);
if (sinclaVideos.length && !SINCLA.collection) {
    const r = await fetch(`${BUNNY}/library/${BUNNY_LIB}/collections`, {
        method: 'POST', headers: bunnyHeaders, body: JSON.stringify({ name: `${SINCLA.name} [${SINCLA.id}]` }),
    });
    SINCLA.collection = (await r.json()).guid;
    console.log('Collection Sincla criada:', SINCLA.collection);
}

const collOf = (tenant) => (tenant === OP_SIM.id ? OP_SIM.collection : tenant === SINCLA.id ? SINCLA.collection : null);

// 4) Atribuir collection a cada vídeo no Bunny + montar rows
const rows = [];
for (const v of bunnyVideos) {
    const tenant = guidToTenant.get(v.guid);
    const collection = collOf(tenant);
    if (!tenant || !collection) { console.log('SKIP (sem empresa/collection):', v.guid, v.title); continue; }
    const upd = await fetch(`${BUNNY}/library/${BUNNY_LIB}/videos/${v.guid}`, {
        method: 'POST', headers: bunnyHeaders, body: JSON.stringify({ collectionId: collection }),
    });
    console.log(`move ${v.guid} -> ${tenant === OP_SIM.id ? 'OpSIM' : 'Sincla'} (${upd.status})`);
    rows.push({
        guid: v.guid, company: tenant, collection, lib: BUNNY_LIB,
        title: (v.title || '').replace(/'/g, "''"),
        status: STATUS[v.status] || 'processing', bytes: v.storageSize || 0, dur: Math.round(v.length || 0),
    });
}

// 5) Gerar SQL
const collValues = [`('${OP_SIM.id}','bunny','${BUNNY_LIB}','${OP_SIM.collection}')`];
if (SINCLA.collection) collValues.push(`('${SINCLA.id}','bunny','${BUNNY_LIB}','${SINCLA.collection}')`);

console.log('\n===SQL_START===');
console.log(`INSERT INTO public.stream_collections (company_id, provider, library_id, collection_id) VALUES\n${collValues.join(',\n')}\nON CONFLICT (company_id) DO UPDATE SET collection_id=EXCLUDED.collection_id, library_id=EXCLUDED.library_id, updated_at=now();`);
console.log('');
const vidValues = rows.map((r) => `('${r.guid}','${r.company}','ead','bunny','${r.lib}','${r.collection}','${r.title}','${r.status}',${r.bytes},${r.dur})`);
console.log(`INSERT INTO public.stream_videos (guid, company_id, tool_id, provider, library_id, collection_id, title, status, storage_bytes, duration_seconds) VALUES\n${vidValues.join(',\n')}\nON CONFLICT (guid) DO UPDATE SET collection_id=EXCLUDED.collection_id, status=EXCLUDED.status, storage_bytes=EXCLUDED.storage_bytes, duration_seconds=EXCLUDED.duration_seconds, updated_at=now();`);
console.log('===SQL_END===');
