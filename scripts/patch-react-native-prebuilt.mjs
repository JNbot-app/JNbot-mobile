import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const file = require.resolve('react-native/scripts/replace-rncore-version.js');
const source = fs.readFileSync(file, 'utf8');
const assumption = `  // Assumption: if there is no stored last build, we assume that it was build for debug.
  if (!fileExists && configuration === 'Debug') {
    console.log(
      'No previous build detected, but Debug Configuration. No need to replace React-Core-prebuilt',
    );
    return false;
  }`;
const replacement = '  // Without a configuration marker, restore the requested framework from its tarball.';

if (source.includes(assumption)) {
  // A CocoaPods cache can contain a Release framework without its build marker.
  fs.rmSync(file);
  fs.writeFileSync(file, source.replace(assumption, replacement));
} else if (!source.includes(replacement)) {
  throw new Error('React Native prebuilt configuration script changed; review its cache handling.');
}
