// Auditoria de storage no Bunny Stream (somente leitura).
// Lê a API key do tools/ead/.env (não recebe segredo por argumento).
import fs from 'node:fs';

const env = fs.readFileSync('tools/ead/.env', 'utf8');
const get = (k) => (env.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1]?.trim();
const key = get('VITE_BUNNY_API_KEY');
const lib = get('VITE_BUNNY_LIBRARY_ID');

if (!key || !lib) {
  console.error('Faltando VITE_BUNNY_API_KEY ou VITE_BUNNY_LIBRARY_ID no .env');
  process.exit(1);
}

const all = [];
let page = 1;
let total = 0;

while (true) {
  const url = `https://video.bunnycdn.com/library/${lib}/videos?page=${page}&itemsPerPage=100&orderBy=date`;
  const r = await fetch(url, { headers: { AccessKey: key } });
  if (!r.ok) {
    console.error('HTTP', r.status, await r.text());
    process.exit(1);
  }
  const d = await r.json();
  total = d.totalItems;
  const items = d.items || [];
  all.push(...items);
  if (all.length >= total || items.length === 0) break;
  page++;
}

let sumBytes = 0;
let sumSec = 0;
const byCol = {};
for (const v of all) {
  sumBytes += v.storageSize || 0;
  sumSec += v.length || 0;
  const c = v.collectionId || '(none)';
  byCol[c] = (byCol[c] || 0) + (v.storageSize || 0);
}

console.log('LIBRARY', lib);
console.log('totalVideos', total, 'fetched', all.length);
console.log('sumStorageBytes', sumBytes, '=', (sumBytes / 1073741824).toFixed(3), 'GB');
console.log('sumDurationMin', (sumSec / 60).toFixed(1));
console.log('collections', Object.keys(byCol).length);
console.log(
  'byCollectionGB',
  Object.fromEntries(Object.entries(byCol).map(([k, v]) => [k, (v / 1073741824).toFixed(4)]))
);
console.log('sample', JSON.stringify(all.slice(0, 6).map((v) => ({
  guid: v.guid, title: v.title, storageSize: v.storageSize, length: v.length,
  collectionId: v.collectionId, dateUploaded: v.dateUploaded,
})), null, 2));
