import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PAGE_SIZE = 16_384n;

export function assertAndroidPageSize(bytes, name) {
  if (bytes.length < 64 || bytes.readUInt32BE(0) !== 0x7f454c46) {
    throw new Error(`${name}: invalid ELF library.`);
  }
  // Google Play's 16 KB requirement applies to 64-bit libraries.
  if (bytes[4] === 1) return false;
  if (bytes[4] !== 2 || bytes[5] !== 1) {
    throw new Error(`${name}: unsupported ELF format.`);
  }
  const tableOffset = Number(bytes.readBigUInt64LE(32));
  const entrySize = bytes.readUInt16LE(54);
  const entryCount = bytes.readUInt16LE(56);
  if (entrySize < 56 || tableOffset + entrySize * entryCount > bytes.length) {
    throw new Error(`${name}: invalid ELF program headers.`);
  }
  let loadSegments = 0;
  for (let index = 0; index < entryCount; index++) {
    const offset = tableOffset + index * entrySize;
    if (bytes.readUInt32LE(offset) !== 1) continue;
    loadSegments++;
    const alignment = bytes.readBigUInt64LE(offset + 48);
    const fileOffset = bytes.readBigUInt64LE(offset + 8);
    const address = bytes.readBigUInt64LE(offset + 16);
    if (alignment < PAGE_SIZE || fileOffset % PAGE_SIZE !== address % PAGE_SIZE) {
      throw new Error(`${name}: LOAD segment ${index} is not 16 KB aligned (alignment ${alignment}).`);
    }
  }
  if (!loadSegments) throw new Error(`${name}: no ELF LOAD segments.`);
  return true;
}

export function verifyAndroidLibraries(artifact) {
  const entries = execFileSync('zipinfo', ['-1', artifact], { encoding: 'utf8' });
  const libraries = entries.split('\n').filter((entry) => entry.endsWith('.so'));
  if (!libraries.length) throw new Error(`${artifact}: no native libraries found.`);
  const failures = [];
  let checked = 0;
  for (const entry of libraries) {
    try {
      const bytes = execFileSync('unzip', ['-p', artifact, entry], { maxBuffer: 256 * 1024 * 1024 });
      if (assertAndroidPageSize(bytes, entry)) checked++;
    } catch (error) {
      failures.push(error.message);
    }
  }
  if (failures.length) throw new Error(`Android 16 KB verification failed:\n${failures.join('\n')}`);
  console.log(`Verified 16 KB ELF alignment for ${checked} 64-bit libraries.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const target = process.argv[2];
  if (!target) throw new Error('Usage: node scripts/android-page-size.mjs <artifact.aab|artifact.apk|library.so>');
  if (target.endsWith('.so')) {
    assertAndroidPageSize(readFileSync(target), target);
    console.log(`Verified ${target}.`);
  } else {
    verifyAndroidLibraries(target);
  }
}
