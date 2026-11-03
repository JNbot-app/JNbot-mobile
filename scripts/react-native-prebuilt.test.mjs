import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const source = readFileSync(require.resolve('react-native/scripts/replace-rncore-version.js'), 'utf8');

function selectFramework(configuration, previous) {
  const extracted = [];
  const markers = [];
  const cli = {
    option() { return this; },
    usage() { return this; },
    argv: { configuration, reactNativeVersion: '0.81.5', podsRoot: '/pods' },
  };
  vm.runInNewContext(source, {
    console: { log() {} },
    require(name) {
      if (name === 'yargs') return cli;
      if (name === 'child_process') return {
        spawnSync(command, args) { extracted.push({ command, args }); return { status: 0 }; },
      };
      if (name === 'fs') return {
        existsSync: () => previous !== undefined,
        readFileSync: () => Buffer.from(previous),
        rmSync() {},
        mkdirSync() {},
        writeFileSync: (file, value) => markers.push(value),
      };
      throw new Error(`Unexpected dependency: ${name}`);
    },
  });
  return { extracted, markers };
}

for (const configuration of ['Debug', 'Release']) {
  test(`restores the ${configuration} framework when the configuration marker is missing`, () => {
    const result = selectFramework(configuration);
    assert.equal(result.extracted.length, 1);
    assert.ok(result.extracted[0].args.includes(`/pods/ReactNativeCore-artifacts/reactnative-core-0.81.5-${configuration.toLowerCase()}.tar.gz`));
    assert.deepEqual(result.markers, [configuration]);
  });
  test(`keeps the installed ${configuration} framework when the marker matches`, () => {
    assert.equal(selectFramework(configuration, configuration).extracted.length, 0);
  });
  test(`switches to ${configuration} when the marker differs`, () => {
    assert.equal(selectFramework(configuration, configuration === 'Debug' ? 'Release' : 'Debug').extracted.length, 1);
  });
}
