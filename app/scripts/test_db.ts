import { createClient } from '@supabase/supabase-js';
import { requireEnv, loadEnv } from './lib/loadEnv.js';

loadEnv();

const supabase = createClient(
  requireEnv('VITE_SUPABASE_URL'),
  requireEnv('VITE_SUPABASE_ANON_KEY'),
);

async function run() {
    const { error: ce1 } = await supabase.from('company_contacts').insert({ company_id: '00000000-0000-0000-0000-000000000000', name: 't', email: 't', phone: 't', whatsapp: 't', cpf: 't', contact_type: 't', notes: 't', source: 't', tags: []});
    console.log('Contacts insert error:', ce1?.message);

    const { error: me1 } = await supabase.from('company_members').insert({ company_id: '00000000-0000-0000-0000-000000000000', user_id: '00000000-0000-0000-0000-000000000000', role: 'admin', user_type: 'manager' });
    console.log('Members insert error:', me1?.message);
}

run();
