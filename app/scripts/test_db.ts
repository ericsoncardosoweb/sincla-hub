import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// read .env
const envFile = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8');
const envVars = Object.fromEntries(
  envFile.split('\n')
  .filter(line => line && !line.startsWith('#') && line.includes('='))
  .map(line => {
    const [key, ...vals] = line.split('=');
    return [key.trim(), vals.join('=').trim()];
  })
);

const supabase = createClient(envVars.VITE_SUPABASE_URL, envVars.VITE_SUPABASE_ANON_KEY);

async function run() {
    const { error: ce1 } = await supabase.from('company_contacts').insert({ company_id: '00000000-0000-0000-0000-000000000000', name: 't', email: 't', phone: 't', whatsapp: 't', cpf: 't', contact_type: 't', notes: 't', source: 't', tags: []});
    console.log('Contacts insert error:', ce1?.message);

    const { error: me1 } = await supabase.from('company_members').insert({ company_id: '00000000-0000-0000-0000-000000000000', user_id: '00000000-0000-0000-0000-000000000000', role: 'admin', user_type: 'manager' });
    console.log('Members insert error:', me1?.message);
}

run();
