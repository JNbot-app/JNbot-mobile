import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { patchNodejsMobile } from './patch-nodejs-mobile.mjs';

patchNodejsMobile();

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const backend = path.join(root, 'nodejs-assets', 'nodejs-project');
const lockPath = path.join(backend, 'backend.lock.json');

if (!fs.existsSync(lockPath)) throw new Error('Missing local backend artifact. Run the desktop build:mobile-backend job before native prebuild.');
const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
if (lock.format !== 1 || lock.protocolVersion !== 1 || !lock.files || typeof lock.files !== 'object')
  throw new Error('Invalid local backend manifest.');
for (const [relative, expected] of Object.entries(lock.files)) {
  if (relative.includes('..') || path.isAbsolute(relative)) throw new Error(`Unsafe artifact path: ${relative}`);
  const full = path.join(backend, relative);
  if (!fs.existsSync(full)) throw new Error(`Missing backend artifact file: ${relative}`);
  const actual = crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex');
  if (actual !== expected) throw new Error(`Backend checksum mismatch: ${relative}`);
}
const wasm = [];
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith('.wasm')) wasm.push(path.relative(backend, full));
  }
};
walk(backend);
if (wasm.length) throw new Error(`WASM is not permitted in the mobile backend: ${wasm.join(', ')}`);
console.log(`Verified local backend (${Object.keys(lock.files).length} files, protocol v${lock.protocolVersion}).`);
