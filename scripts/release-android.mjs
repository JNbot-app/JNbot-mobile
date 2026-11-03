import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { verifyAndroidLibraries } from "./android-page-size.mjs";

const root = resolve(new URL("..", import.meta.url).pathname);
const appConfigPath = join(root, "app.json");
const artifactPath = join(root, "android", "app", "build", "outputs", "bundle", "release", "app-release.aab");
const productionRevenueCatPrefix = "goog_";
const testAdMobAppId = "ca-app-pub-3940256099942544~3347511713";
const testAdMobInterstitialId = "ca-app-pub-3940256099942544/1033173712";

const isProductionAdMobAppId = (value) =>
  typeof value === "string" &&
  /^ca-app-pub-\d+~\d+$/.test(value) &&
  value !== testAdMobAppId;

const isProductionAdMobInterstitialId = (value) =>
  typeof value === "string" &&
  /^ca-app-pub-\d+\/\d+$/.test(value) &&
  value !== testAdMobInterstitialId;

function run(command, args) {
  execFileSync(command, args, {
    cwd: root,
    stdio: "inherit",
  });
}

function assertSupportedNodeVersion() {
  const [major] = process.versions.node.split(".").map(Number);
  if (major < 20) {
    throw new Error(
      `Android production releases require Node 20 or newer; found Node ${process.versions.node}.`,
    );
  }
}

function bumpAndroidVersionCode() {
  const appConfig = JSON.parse(readFileSync(appConfigPath, "utf8"));
  const currentVersionCode = appConfig.expo.android?.versionCode;
  if (!Number.isInteger(currentVersionCode) || currentVersionCode < 1) {
    throw new Error("app.json must contain a positive integer expo.android.versionCode.");
  }

  const nextVersionCode = currentVersionCode + 1;
  appConfig.expo.android.versionCode = nextVersionCode;
  writeFileSync(appConfigPath, `${JSON.stringify(appConfig, null, 2)}\n`);
  console.log(`Preparing Android version code ${nextVersionCode}.`);
}

function cleanGeneratedAndroidBuild() {
  for (const relativePath of ["android/app/.cxx", "android/app/build", "android/build"]) {
    rmSync(join(root, relativePath), { recursive: true, force: true });
  }
}

function removeDevelopmentInspectorFlag() {
  const gradlePropertiesPath = join(root, "android", "gradle.properties");
  if (!existsSync(gradlePropertiesPath)) return;

  const source = readFileSync(gradlePropertiesPath, "utf8");
  const cleaned = source
    .split(/\r?\n/)
    .filter((line) => line.trim() !== "EX_DEV_CLIENT_NETWORK_INSPECTOR=true")
    .join("\n");
  if (cleaned !== source) writeFileSync(gradlePropertiesPath, cleaned);
}

function assertProductionEnvironment() {
  const requiredEnvironment = {
    EAS_BUILD_PROFILE: "production",
    EAS_BUILD_PLATFORM: "android",
    EXPO_PUBLIC_MONETIZATION_ENV: "production",
    NODE_ENV: "production",
  };

  for (const [name, expectedValue] of Object.entries(requiredEnvironment)) {
    if (process.env[name] !== expectedValue) {
      throw new Error(`${name} must be ${expectedValue} for an Android production release.`);
    }
  }

  const revenueCatKey = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;
  if (!revenueCatKey?.startsWith(productionRevenueCatPrefix) || revenueCatKey.startsWith("test_")) {
    throw new Error("The production RevenueCat Google Play key is missing or invalid.");
  }

  if (!isProductionAdMobAppId(process.env.ADMOB_ANDROID_APP_ID)) {
    throw new Error("The production Android AdMob app ID is missing or still uses Google's test app ID.");
  }

  if (!isProductionAdMobInterstitialId(process.env.EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL_ID)) {
    throw new Error("The production Android AdMob interstitial ID is missing or still uses Google's test ad unit ID.");
  }
}

function readZipEntry(zipPath, entryPath) {
  return execFileSync("unzip", ["-p", zipPath, entryPath]);
}

function validateArtifact() {
  if (!existsSync(artifactPath)) {
    throw new Error(`Gradle completed without producing ${artifactPath}.`);
  }

  verifyAndroidLibraries(artifactPath);

  const entries = execFileSync("zipinfo", ["-1", artifactPath], { encoding: "utf8" });
  const developmentModules = entries.match(/expo-dev-(client|launcher|menu)/gi) ?? [];
  if (developmentModules.length > 0) {
    throw new Error(
      `Release artifact contains Expo development modules: ${[...new Set(developmentModules)].join(", ")}.`,
    );
  }

  const bundlePath = join(root, "android", "app", "build", "generated", "assets", "createBundleReleaseJsAndAssets", "index.android.bundle");
  const bundle = readFileSync(bundlePath, "utf8");
  if (!bundle.includes(process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY)) {
    throw new Error("The production RevenueCat key was not embedded in the Android bundle.");
  }
  const productionInterstitialId = process.env.EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL_ID;
  if (!bundle.includes(productionInterstitialId)) {
    throw new Error("The production Android AdMob interstitial ID was not embedded in the bundle.");
  }

  const manifest = readZipEntry(artifactPath, "base/manifest/AndroidManifest.xml").toString("utf8");
  const productionAppId = process.env.ADMOB_ANDROID_APP_ID;
  if (!manifest.includes(productionAppId) || manifest.includes(testAdMobAppId)) {
    throw new Error("The production Android AdMob app ID was not embedded exclusively in the manifest.");
  }

  console.log(`Android production AAB ready: ${artifactPath}`);
}

function buildProductionArtifact() {
  process.env.EAS_BUILD_PROFILE = "production";
  process.env.EAS_BUILD_PLATFORM = "android";
  process.env.EXPO_PUBLIC_MONETIZATION_ENV = "production";
  process.env.NODE_ENV = "production";
  process.env.EXPO_PUBLIC_REVENUECAT_TEST_STORE_API_KEY = "";
  process.env.SENTRY_DISABLE_AUTO_UPLOAD = "true";

  assertProductionEnvironment();
  run(process.execPath, [join(root, "scripts", "patch-nodejs-mobile.mjs")]);
  bumpAndroidVersionCode();
  run("npm", ["run", "verify:local-backend"]);
  run(process.execPath, [join(root, "node_modules", "expo", "bin", "cli"), "prebuild", "--no-install"]);
  removeDevelopmentInspectorFlag();
  cleanGeneratedAndroidBuild();

  const gradleCommand = process.platform === "win32" ? "android/gradlew.bat" : "./android/gradlew";
  run(gradleCommand, ["--no-daemon", "--max-workers=2", "-p", "android", "bundleRelease"]);
  validateArtifact();
}

assertSupportedNodeVersion();

if (process.argv.includes("--inside-production-environment")) {
  buildProductionArtifact();
} else {
  const buildCommand = `${process.execPath} scripts/release-android.mjs --inside-production-environment`;
  run("npx", ["--yes", "eas-cli@latest", "env:exec", "production", buildCommand, "--non-interactive"]);
}
