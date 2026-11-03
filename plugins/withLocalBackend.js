const { withDangerousMod, withAppBuildGradle } = require('@expo/config-plugins');
const path = require('path');
const { spawnSync } = require('child_process');

/** Verifies the desktop-owned Node asset and configures Android build settings. */
module.exports = function withLocalBackend(config) {
  const verify = (config) => {
    const result = spawnSync(process.execPath, [path.join(config.modRequest.projectRoot, 'scripts', 'verify-local-backend.mjs')], { stdio: 'inherit' });
    if (result.status !== 0) throw new Error('Local JNbot backend verification failed; native prebuild was stopped.');
    return config;
  };
  config = withDangerousMod(config, ['ios', verify]);
  config = withDangerousMod(config, ['android', verify]);

  config = withAppBuildGradle(config, (mod) => {
    if (mod.modResults.language === 'groovy') {
      if (!mod.modResults.contents.includes("noCompress 'gz'")) {
        if (mod.modResults.contents.includes('androidResources {')) {
          mod.modResults.contents = mod.modResults.contents.replace(
            'androidResources {',
            "androidResources {\n        noCompress 'gz'"
          );
        }
      }
    }
    return mod;
  });

  return config;
};

