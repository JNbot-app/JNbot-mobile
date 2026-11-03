import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const file = require.resolve('@bacons/apple-targets/build/with-xcode-changes.js');
const source = fs.readFileSync(file, 'utf8');
const broken = `        targetToUpdate.props.buildConfigurationList
            .getReferrers()
            .forEach((ref) => {
            ref.removeReference(targetToUpdate.props.buildConfigurationList.uuid);
        });
        targetToUpdate.props.buildConfigurationList.removeFromProject();`;
const fixed = `        const buildConfigurationList = targetToUpdate.props.buildConfigurationList;
        buildConfigurationList
            .getReferrers()
            .forEach((ref) => {
            ref.removeReference(buildConfigurationList.uuid);
        });
        buildConfigurationList.removeFromProject();`;

if (source.includes(broken)) {
  // Removing the list's referrers clears it from the target, so a non-clean prebuild crashed.
  fs.rmSync(file);
  fs.writeFileSync(file, source.replace(broken, fixed));
} else if (!source.includes(fixed)) {
  throw new Error('@bacons/apple-targets changed; review its existing-target update.');
}
