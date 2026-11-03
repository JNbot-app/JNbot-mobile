import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

// Run after prepare:needle with ANDROID_NDK_HOME and CMAKE pointing to the SDK tools.
const root = fileURLToPath(new URL('../', import.meta.url));
const ndk = process.env.ANDROID_NDK_HOME;
const cmake = process.env.CMAKE || 'cmake';

for (const abi of ['armeabi-v7a', 'arm64-v8a', 'x86_64']) {
  test(`Needle links the current binding on ${abi}`, () => {
    assert.ok(ndk, 'Set ANDROID_NDK_HOME to the installed Android NDK directory');
    const build = mkdtempSync(path.join(os.tmpdir(), 'needle-android-'));
    try {
      execFileSync(cmake, [
        '-S', path.resolve(root, '../app/native/needle/android'),
        '-B', build,
        `-DCMAKE_TOOLCHAIN_FILE=${ndk}/build/cmake/android.toolchain.cmake`,
        `-DANDROID_ABI=${abi}`,
        '-DANDROID_PLATFORM=android-24',
        '-DANDROID_STL=c++_static',
        '-DCMAKE_SHARED_LINKER_FLAGS=-Wl,--no-undefined',
        '-DCMAKE_BUILD_TYPE=Debug',
        `-DNODE_MOBILE_DIR=${root}/node_modules/nodejs-mobile-react-native`,
      ], { stdio: 'pipe' });
      execFileSync(cmake, ['--build', build, '--target', 'jnbot_needle', '-j', '4'], { stdio: 'pipe' });
      const host = process.platform === 'darwin' ? 'darwin-x86_64' : 'linux-x86_64';
      const symbols = execFileSync(
        path.join(ndk, 'toolchains/llvm/prebuilt', host, 'bin/llvm-nm'),
        ['-D', path.join(build, 'libjnbot_needle.so')],
        { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
      );
      assert.match(symbols, /\bT jnbot_needle_register\b/, 'The Node binding must be linked');
      assert.match(symbols, /\bT JNI_OnLoad\b/);
      if (abi === 'arm64-v8a') {
        assert.match(symbols, /\bT np_load\b/, 'The real decoder must be linked');
        assert.match(symbols, /\bT eg_encode\b/, 'The real encoder must be linked');
      } else {
        assert.doesNotMatch(symbols, /\bT np_load\b/, 'Unsupported architectures use the fallback binding');
      }
      assert.doesNotMatch(symbols, /\bU .*__hash_memory/);
    } finally {
      rmSync(build, { recursive: true, force: true });
    }
  });
}
