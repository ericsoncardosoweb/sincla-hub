import * as fs from 'fs';

const d = JSON.parse(fs.readFileSync('diagnostic_ead.json', 'utf8'));

const flaws = [];
for(const pol of d.policies) {
  if (pol.qual === 'true' || pol.qual === '(true)') {
     flaws.push(`Table: ${pol.tablename} | cmd: ${pol.cmd} | pol: ${pol.policyname}`);
  }
}

fs.writeFileSync('flaws.json', JSON.stringify(flaws, null, 2), 'utf-8');
