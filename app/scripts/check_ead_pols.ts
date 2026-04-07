import * as fs from 'fs';

const d = JSON.parse(fs.readFileSync('diagnostic_ead.json', 'utf8'));

console.log('--- Warning: Flawed Policies in EAD ---');
for(const pol of d.policies) {
  if (pol.qual === 'true' || pol.qual === '(true)') {
     console.log(`Table: ${pol.tablename} | cmd: ${pol.cmd} | pol: ${pol.policyname} | qual: ${pol.qual}`);
  }
}
