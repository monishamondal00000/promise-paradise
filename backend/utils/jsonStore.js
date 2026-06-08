import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIR = path.resolve(__dirname, '..', 'data');

export function readJSON(name) {
  const file = path.join(DIR, `${name}.json`);
  if (!fs.existsSync(file)) return [];
  const content = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
  return JSON.parse(content);
}

export function writeJSON(name, data) {
  const file = path.join(DIR, `${name}.json`);
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}
