import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const basePath = process.argv[2];
if (!basePath) {
    console.error('Forneça o caminho do projeto (ex: ../tools/rh)');
    process.exit(1);
}

const migrationsDir = path.join(basePath, 'supabase', 'migrations');
if (!fs.existsSync(migrationsDir)) {
    console.log(`Sem migrations em: ${migrationsDir}`);
    process.exit(0);
}

const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

let repairs = files.map(file => {
    // try to get 14-digit timestamp
    const match = file.match(/^(\d{14})_(.*)/);
    if(match) return match[1];
    return null;
}).filter(Boolean);

console.log(`\nAplicando ${repairs.length} repair commands...`);
try {
    for (const ts of repairs) {
        console.log(`>> npx supabase migration repair ${ts} --status applied`);
        execSync(`npx supabase migration repair ${ts} --status applied`, { 
            cwd: basePath, 
            stdio: 'inherit',
            env: { ...process.env, SUPABASE_DB_PASSWORD: 'mMug4QfBXuzXq0vV' }
        });
    }
} catch (e) {
    console.error('Erro no migration repair:', e.message);
}
