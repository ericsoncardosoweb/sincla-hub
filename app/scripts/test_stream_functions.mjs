// Smoke test (backend) da Fase 3.1: stream-upload-init + stream-delete no Hub.
// Lê HUB url/anon de tools/ead/.env. Cria um vídeo de teste vazio e o remove.
import fs from 'node:fs';
const read = (p, k) => ((fs.readFileSync(p, 'utf8').match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1] || '').trim();

const HUB_URL = read('tools/ead/.env', 'VITE_HUB_SUPABASE_URL');
const ANON = read('tools/ead/.env', 'VITE_HUB_ANON_KEY');
const COMPANY = '69782e1b-d0ec-4d9b-a450-bd4f154cf4d1'; // Operação SIM

const call = async (fn, body) => {
    const r = await fetch(`${HUB_URL}/functions/v1/${fn}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    return { status: r.status, body: await r.json().catch(() => ({})) };
};

console.log('1) stream-upload-init...');
const init = await call('stream-upload-init', { company_id: COMPANY, tool_id: 'ead', title: 'TESTE-FASE-3.1', file_size: 1000 });
console.log('   status', init.status);
console.log('   success:', init.body.success, '| guid:', init.body.videoGuid, '| collection:', init.body.collectionId, '| sigLen:', (init.body.authorizationSignature || '').length);

if (init.body.success && init.body.videoGuid) {
    console.log('2) stream-status...');
    const st = await call('stream-status', { company_id: COMPANY, guid: init.body.videoGuid });
    console.log('   status', st.status, '| video status:', st.body.status);

    console.log('3) stream-delete (cleanup)...');
    const del = await call('stream-delete', { company_id: COMPANY, guid: init.body.videoGuid });
    console.log('   status', del.status, '| success:', del.body.success, '| freed:', del.body.freed_bytes);

    console.log('4) isolamento: delete com empresa errada (deve dar 404)...');
    const bad = await call('stream-delete', { company_id: '00000000-0000-0000-0000-000000000000', guid: init.body.videoGuid });
    console.log('   status', bad.status, '| error:', bad.body.error);
} else {
    console.log('FALHOU no init:', JSON.stringify(init.body));
}
