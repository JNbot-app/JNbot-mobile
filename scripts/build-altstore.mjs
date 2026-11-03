import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const outputDir = join(root, "dist", "altstore");
const appName = "JNbot.app";
const unusedPrivacyKeys = [
  "NSMicrophoneUsageDescription",
  "NSFaceIDUsageDescription",
];
const developmentArtifacts = [
  "__preview.dylib",
  "JNbot.debug.dylib",
  "EXDevLauncher.bundle",
  "EXDevMenu.bundle",
];
function getDefaultDownloadUrl(version) {
  return (
    process.env.ALTSTORE_DOWNLOAD_URL ??
    `https://github.com/usserwout/JNbot-updater/releases/download/v${version}/JNbot.ipa`
  );
}
const defaultIconUrl =
  process.env.ALTSTORE_ICON_URL ??
  "https://raw.githubusercontent.com/usserwout/JNbot-updater/main/images/icon.png";
const defaultScreenshotUrls = [
  "https://raw.githubusercontent.com/usserwout/JNbot-updater/main/images/overviewPage.png",
  "https://raw.githubusercontent.com/usserwout/JNbot-updater/main/images/movementPage.png",
  "https://raw.githubusercontent.com/usserwout/JNbot-updater/main/images/scriptPage.png",
  "https://raw.githubusercontent.com/usserwout/JNbot-updater/main/images/accountPage.png",
];
const screenshotUrls = (process.env.ALTSTORE_SCREENSHOT_URLS ?? defaultScreenshotUrls.join(","))
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: root,
    stdio: "inherit",
    ...options,
  });
}

function loadProductionEnvironment() {
  const inheritedKeys = new Set(Object.keys(process.env));

  for (const path of [join(root, ".env.local"), join(root, ".env.production.local")]) {
    if (!existsSync(path)) continue;

    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (!match || inheritedKeys.has(match[1])) continue;

      const value = match[2].replace(/^(['"])(.*)\1$/, "$2");
      process.env[match[1]] = value;
    }
  }

  process.env.EXPO_PUBLIC_MONETIZATION_ENV = "production";
  process.env.JNBOT_IOS_MONETIZATION_DISABLED = "true";
}

function readPlist(path) {
  const json = execFileSync("plutil", ["-convert", "json", "-o", "-", "--", path], {
    encoding: "utf8",
  });
  return JSON.parse(json);
}

function assertDesktopVersionMatchesMobileConfig() {
  const desktopPackagePath = join(root, "..", "app", "release", "app", "package.json");
  const mobileConfigPath = join(root, "app.json");
  const desktopVersion = JSON.parse(readFileSync(desktopPackagePath, "utf8")).version;
  const mobileVersion = JSON.parse(readFileSync(mobileConfigPath, "utf8")).expo.version;

  if (mobileVersion !== desktopVersion) {
    throw new Error(
      `Mobile version ${mobileVersion} does not match desktop release version ${desktopVersion}.`,
    );
  }
}

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function packageUnsignedApp(appPath, ipaPath) {
  const packageDir = mkdtempSync(join(tmpdir(), "jnbot-altstore-"));
  const payloadDir = join(packageDir, "Payload");
  mkdirSync(payloadDir, { recursive: true });
  cpSync(appPath, join(payloadDir, appName), { recursive: true });
  rmSync(ipaPath, { force: true });
  run("zip", ["-qry", ipaPath, "Payload"], { cwd: packageDir });
  rmSync(packageDir, { recursive: true, force: true });
}

function removeUnusedPrivacyKeys(appPath) {
  const plistPath = join(appPath, "Info.plist");
  for (const key of unusedPrivacyKeys) {
    try {
      run("plutil", ["-remove", key, plistPath]);
    } catch {
      // The key is already absent.
    }
  }
}

function assertProductionApp(appPath) {
  const foundArtifacts = developmentArtifacts.filter((artifact) => existsSync(join(appPath, artifact)));
  if (foundArtifacts.length > 0) {
    throw new Error(
      `Release app contains development artifacts: ${foundArtifacts.join(", ")}. Build with the Release configuration.`,
    );
  }
}

function ensureWorkspaceMarker() {
  const markerPath = join(
    root,
    "ios",
    "JNbot.xcworkspace",
    "xcshareddata",
    "IDEWorkspaceChecks.plist",
  );
  if (existsSync(markerPath)) return;

  mkdirSync(join(root, "ios", "JNbot.xcworkspace", "xcshareddata"), {
    recursive: true,
  });
  writeFileSync(
    markerPath,
    `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0"><dict><key>IDEDidComputeMac32BitWarning</key><true/></dict></plist>\n`,
  );
}

function disableIosNativeMonetization() {
  const podfilePath = join(root, "ios", "Podfile");
  const source = readFileSync(podfilePath, "utf8");
  const autolinkingCommand = "'ios'";
  const disabledAutolinkingCommand = [
    "'ios',",
    "      '--exclude',",
    "      'react-native-google-mobile-ads'",
  ].join("\n");

  if (source.includes(disabledAutolinkingCommand)) return;
  if (!source.includes(autolinkingCommand)) {
    throw new Error("Could not exclude AdMob from the iOS native target.");
  }

  writeFileSync(
    podfilePath,
    source.replace(autolinkingCommand, disabledAutolinkingCommand),
  );
}

function installPods() {
  try {
    run("pod", ["install", "--no-repo-update"], { cwd: join(root, "ios") });
  } catch (error) {
    const hasExistingInstall =
      existsSync(join(root, "ios", "Pods", "Manifest.lock")) &&
      existsSync(
        join(root, "ios", "Pods", "Target Support Files", "Pods-JNbot", "Pods-JNbot.release.xcconfig"),
      );
    if (!hasExistingInstall) throw error;
    console.warn("CocoaPods could not refresh; continuing with the existing locked Pods installation.");
  }
}

// AltStore reads entitlements (the widgets' App Group) from the binaries, so embed them with an ad-hoc signature.
function embedEntitlements(appPath) {
  run("codesign", ["--force", "--deep", "--sign", "-", appPath]);
  run("codesign", [
    "--force", "--sign", "-",
    "--entitlements", join(root, "targets", "widget", "generated.entitlements"),
    join(appPath, "PlugIns", "JNbotWidgetExtension.appex"),
  ]);
  run("codesign", [
    "--force", "--sign", "-",
    "--entitlements", join(root, "ios", "JNbot", "JNbot.entitlements"),
    appPath,
  ]);
}

function buildUnsignedIpa() {
  const derivedDataPath = join(outputDir, "derived-data");
  rmSync(derivedDataPath, { recursive: true, force: true });
  mkdirSync(outputDir, { recursive: true });

  loadProductionEnvironment();
  assertDesktopVersionMatchesMobileConfig();
  run("npm", ["run", "verify:local-backend"]);
  run("npx", ["expo", "prebuild", "--no-install"]);
  disableIosNativeMonetization();
  ensureWorkspaceMarker();
  installPods();
  run("xcodebuild", [
    "-workspace",
    "ios/JNbot.xcworkspace",
    "-scheme",
    "JNbot",
    "-configuration",
    "Release",
    "-sdk",
    "iphoneos",
    "-destination",
    "generic/platform=iOS",
    "-derivedDataPath",
    derivedDataPath,
    "build",
    "CODE_SIGNING_ALLOWED=NO",
    "CODE_SIGNING_REQUIRED=NO",
    "CODE_SIGN_IDENTITY=",
    "DEVELOPMENT_TEAM=",
    "EXPO_PUBLIC_MONETIZATION_ENV=production",
    "ENABLE_DEBUG_DYLIB=NO",
    "SENTRY_DISABLE_AUTO_UPLOAD=true",
    "SENTRY_COPY_OPTIONS_FILE=false",
  ]);

  const appPath = join(derivedDataPath, "Build", "Products", "Release-iphoneos", appName);
  if (!existsSync(appPath)) {
    throw new Error(`Xcode completed without producing ${appPath}`);
  }

  assertProductionApp(appPath);
  removeUnusedPrivacyKeys(appPath);
  embedEntitlements(appPath);
  const ipaPath = join(outputDir, "JNbot.ipa");
  packageUnsignedApp(appPath, ipaPath);
  return { appPath, ipaPath };
}

function appPermissions(appPath) {
  const info = readPlist(join(appPath, "Info.plist"));
  const privacy = Object.fromEntries(
    Object.entries(info)
      .filter(([key, value]) => key.endsWith("UsageDescription") && typeof value === "string")
      .sort(([left], [right]) => left.localeCompare(right)),
  );

  const entitlementsPath = join(root, "ios", "JNbot", "JNbot.entitlements");
  const entitlements = existsSync(entitlementsPath) ? readPlist(entitlementsPath) : {};
  return { entitlements: Object.keys(entitlements).sort(), privacy };
}

function createSource({ appPath, ipaPath, downloadUrl }) {
  const info = readPlist(join(appPath, "Info.plist"));
  const ipaBytes = readFileSync(ipaPath);
  const permissions = appPermissions(appPath);
  const version = info.CFBundleShortVersionString;
  const buildVersion = info.CFBundleVersion;
  const minOsVersion = info.MinimumOSVersion ?? "15.1";
  const resolvedDownloadUrl = downloadUrl ?? getDefaultDownloadUrl(version);

  if (!resolvedDownloadUrl) {
    throw new Error(
      "Set ALTSTORE_DOWNLOAD_URL to the public HTTPS URL of the uploaded IPA before generating source.json.",
    );
  }

  const app = {
    name: info.CFBundleDisplayName ?? "JNbot",
    bundleIdentifier: info.CFBundleIdentifier,
    developerName: process.env.ALTSTORE_DEVELOPER_NAME ?? "JNbot",
    subtitle: "Manage your Minecraft bots from your iPhone or iPad.",
    localizedDescription:
      "JNbot is a Minecraft bot management app for monitoring connected bots, interacting with instances, managing inventory and scripts, and controlling supported automation profiles from your phone. NOT AN OFFICIAL MINECRAFT PRODUCT. NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.",
    category: "utilities",
    appPermissions: permissions,
    versions: [
      {
        version,
        buildVersion,
        date: new Date().toISOString(),
        localizedDescription: `Initial JNbot release ${version} (${buildVersion}).`,
        downloadURL: resolvedDownloadUrl,
        size: ipaBytes.byteLength,
        sha256: createHash("sha256").update(ipaBytes).digest("hex"),
        minOSVersion: minOsVersion.toString(),
      },
    ],
  };

  if (defaultIconUrl) app.iconURL = defaultIconUrl;
  if (screenshotUrls.length > 0) app.screenshots = screenshotUrls;

  const source = {
    name: process.env.ALTSTORE_SOURCE_NAME ?? "JNbot",
    subtitle: "Minecraft bot management on the go.",
    description:
      "JNbot is a mobile companion for managing Minecraft bots, monitoring activity, and controlling supported automation profiles. NOT AN OFFICIAL MINECRAFT PRODUCT. NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.",
    website: process.env.ALTSTORE_WEBSITE_URL ?? "https://github.com/usserwout/JNbot-updater",
    apps: [app],
    news: [],
  };

  Object.keys(source).forEach((key) => {
    if (source[key] === undefined) delete source[key];
  });
  writeFileSync(join(outputDir, "source.json"), `${JSON.stringify(source, null, 2)}\n`);
}

const ipaArgument = argumentValue("--ipa");
const ipaPath = ipaArgument ? resolve(root, ipaArgument) : undefined;
const build = ipaPath ? undefined : buildUnsignedIpa();
const finalIpaPath = ipaPath ?? build.ipaPath;
if (!existsSync(finalIpaPath)) {
  throw new Error(`IPA not found: ${finalIpaPath}`);
}

const inspectDir = mkdtempSync(join(tmpdir(), "jnbot-altstore-inspect-"));
run("unzip", ["-q", "-o", finalIpaPath, "-d", inspectDir]);
const appPath = join(inspectDir, "Payload", appName);
if (!existsSync(appPath)) {
  rmSync(inspectDir, { recursive: true, force: true });
  throw new Error(`IPA does not contain Payload/${appName}`);
}

try {
  assertProductionApp(appPath);
  if (finalIpaPath !== join(outputDir, "JNbot.ipa")) {
    mkdirSync(outputDir, { recursive: true });
    cpSync(finalIpaPath, join(outputDir, "JNbot.ipa"));
  }
  createSource({
    appPath,
    ipaPath: join(outputDir, "JNbot.ipa"),
  });
  console.log(`Wrote ${join(outputDir, "JNbot.ipa")}`);
  console.log(`Wrote ${join(outputDir, "source.json")}`);
} finally {
  rmSync(inspectDir, { recursive: true, force: true });
}
