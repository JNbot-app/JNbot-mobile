import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

// Run after prepare:needle -- --ios on macOS.
const source = fileURLToPath(new URL('../../app/native/needle/', import.meta.url));
const { engineRevision } = JSON.parse(readFileSync(path.join(source, 'model.json'), 'utf8'));

test('Needle XCFramework supports CocoaPods and links the current engine on every iOS architecture', () => {
  const framework = path.join(source, 'engine/mobile', engineRevision, 'JNbotInference.xcframework');
  const info = JSON.parse(execFileSync('plutil', [
    '-convert', 'json', '-o', '-', path.join(framework, 'Info.plist'),
  ], { encoding: 'utf8' }));
  const slices = info.AvailableLibraries;
  const names = new Set(slices.map(slice => path.basename(slice.LibraryPath)));
  assert.equal(names.size, 1, `CocoaPods requires matching archive names: ${[...names]}`);
  assert.equal(slices.length, 2);
  for (const [variant, architectures] of [
    [undefined, ['arm64']],
    ['simulator', ['arm64', 'x86_64']],
  ]) {
    const slice = slices.find(value => value.SupportedPlatformVariant === variant);
    assert.ok(slice, `Missing ${variant || 'device'} slice`);
    assert.equal(slice.SupportedPlatform, 'ios');
    assert.deepEqual([...slice.SupportedArchitectures].sort(), architectures);
    const library = path.join(framework, slice.LibraryIdentifier, slice.LibraryPath);
    assert.ok(existsSync(library));
    for (const arch of architectures) {
      const symbols = execFileSync('xcrun', ['nm', '-arch', arch, '-g', library], {
        encoding: 'utf8',
        maxBuffer: 16 * 1024 * 1024,
      });
      for (const symbol of ['jnbot_needle_register', 'np_load', 'np_set_window', 'np_set_prefix']) {
        assert.match(symbols, new RegExp(`\\bT _${symbol}\\b`));
      }
    }
  }
});
