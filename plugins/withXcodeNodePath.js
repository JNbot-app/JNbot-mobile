const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const MARKER = "# jnbot: NODE_BINARY first on PATH";
// nodejs-mobile-react-native's script phases run `node`/`npm` from Xcode's PATH and require Node 18,
// while Metro (via NODE_BINARY) requires Node >= 20. Set NODEJS_MOBILE_NODE_BINARY in .xcode.env.local
// to a Node 18 binary to put it first on PATH; otherwise fall back to NODE_BINARY.
const SNIPPET = `
${MARKER}
if [ -f "$PODS_ROOT/../.xcode.env.local" ]; then source "$PODS_ROOT/../.xcode.env.local"; fi
if [ -f ./.xcode.env.local ]; then source ./.xcode.env.local; fi
export PATH="$(dirname "\${NODEJS_MOBILE_NODE_BINARY:-$NODE_BINARY}"):$PATH"
`;

module.exports = function withXcodeNodePath(config) {
  return withDangerousMod(config, [
    "ios",
    (mod) => {
      const envPath = path.join(mod.modRequest.platformProjectRoot, ".xcode.env");
      const contents = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
      if (!contents.includes(MARKER)) fs.writeFileSync(envPath, contents + SNIPPET);
      return mod;
    },
  ]);
};
