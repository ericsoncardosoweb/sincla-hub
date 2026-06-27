import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptsDir, '../..');
const monorepoRoot = path.resolve(appRoot, '..');

const ENV_FILES = [
  path.join(appRoot, '.env'),
  path.join(monorepoRoot, '.env'),
];

let loaded = false;

export function loadEnv(): void {
  if (loaded) return;

  for (const file of ENV_FILES) {
    if (!fs.existsSync(file)) continue;

    for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;

      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  }

  loaded = true;
}

export function requireEnv(name: string): string {
  loadEnv();
  const value = process.env[name];
  if (!value) {
    throw new Error(`Defina ${name} em app/.env (veja app/.env.example)`);
  }
  return value;
}
