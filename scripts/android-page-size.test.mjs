import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assertAndroidPageSize } from './android-page-size.mjs';

function library(alignments) {
  const bytes = Buffer.alloc(64 + 56 * alignments.length);
  bytes.writeUInt32BE(0x7f454c46);
  bytes[4] = 2;
  bytes[5] = 1;
  bytes.writeBigUInt64LE(64n, 32);
  bytes.writeUInt16LE(56, 54);
  bytes.writeUInt16LE(alignments.length, 56);
  alignments.forEach((alignment, index) => {
    bytes.writeUInt32LE(1, 64 + 56 * index);
    bytes.writeBigUInt64LE(BigInt(alignment), 64 + 56 * index + 48);
  });
  return bytes;
}

test('accepts 16 KB and larger LOAD alignment', () => {
  assert.equal(assertAndroidPageSize(library([16384, 65536]), 'lib.so'), true);
});

test('rejects a 4 KB segment even when the first segment is aligned', () => {
  assert.throws(() => assertAndroidPageSize(library([16384, 4096]), 'lib.so'), /segment 1/);
});

test('rejects mismatched file and virtual page offsets', () => {
  const bytes = library([16384]);
  bytes.writeBigUInt64LE(4096n, 64 + 8);
  assert.throws(() => assertAndroidPageSize(bytes, 'lib.so'), /not 16 KB aligned/);
});

test('rejects missing and truncated program headers', () => {
  assert.throws(() => assertAndroidPageSize(library([]), 'lib.so'), /no ELF LOAD/);
  assert.throws(() => assertAndroidPageSize(library([16384]).subarray(0, 80), 'lib.so'), /invalid ELF program/);
});

test('exempts 32-bit libraries', () => {
  const bytes = library([4096]);
  bytes[4] = 1;
  assert.equal(assertAndroidPageSize(bytes, 'lib.so'), false);
});
