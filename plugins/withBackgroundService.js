const {
  withAndroidManifest,
  withMainApplication,
  withDangerousMod,
} = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

function addServiceToManifest(config) {
  return withAndroidManifest(config, (mod) => {
    const manifest = mod.modResults.manifest;
    const application = manifest.application?.[0];
    if (!application) return mod;

    application.service = application.service || [];
    const staleServiceName = "com.jnbot.mobile.background.JNbotBackgroundService";
    const serviceName = "com.jnbot.app.background.JNbotBackgroundService";
    const service = application.service.find(
      (s) => s.$?.["android:name"] === serviceName,
    ) || {
      $: { "android:name": serviceName },
    };
    application.service = application.service.filter(
      (s) =>
        s.$?.["android:name"] !== staleServiceName &&
        s.$?.["android:name"] !== serviceName,
    );
    service.$["android:enabled"] = "true";
    service.$["android:exported"] = "false";
    service.$["android:foregroundServiceType"] = "specialUse";
    const subtypeProperty = "android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE";
    service.property = (service.property || []).filter(
      (property) => property.$?.["android:name"] !== subtypeProperty,
    );
    service.property.push({
      $: {
        "android:name": subtypeProperty,
        "android:value":
          "Keeps user-started Minecraft bots connected and executing in the embedded local runtime while the app is in the background.",
      },
    });
    application.service.push(service);

    return mod;
  });
}

function updateMainApplication(config) {
  return withMainApplication(config, (mod) => {
    let contents = mod.modResults.contents;
    const importStatement = "import com.jnbot.app.background.JNbotBackgroundPackage";
    const addPackageStatement = "add(JNbotBackgroundPackage())";

    if (!contents.includes(importStatement)) {
      contents = contents.replace(
        "import expo.modules.ApplicationLifecycleDispatcher",
        `${importStatement}\nimport expo.modules.ApplicationLifecycleDispatcher`,
      );
    }

    if (!contents.includes(addPackageStatement)) {
      contents = contents.replace(
        "PackageList(this).packages.apply {",
        `PackageList(this).packages.apply {\n              ${addPackageStatement}`,
      );
    }

    mod.modResults.contents = contents;
    return mod;
  });
}

function copyNativeBackgroundFiles(config) {
  return withDangerousMod(config, [
    "android",
    (mod) => {
      const projectRoot = mod.modRequest.projectRoot;
      const srcDir = path.join(projectRoot, "plugins", "native", "android");
      const destDir = path.join(
        projectRoot,
        "android",
        "app",
        "src",
        "main",
        "java",
        "com",
        "jnbot",
        "app",
        "background",
      );

      if (fs.existsSync(srcDir)) {
        fs.mkdirSync(destDir, { recursive: true });
        const files = fs.readdirSync(srcDir);
        for (const file of files) {
          if (file.endsWith(".kt") || file.endsWith(".java")) {
            fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file));
          }
        }
        const drawableDir = path.join(projectRoot, "android", "app", "src", "main", "res", "drawable");
        fs.mkdirSync(drawableDir, { recursive: true });
        fs.copyFileSync(
          path.join(srcDir, "res", "drawable", "ic_jnbot_notification.xml"),
          path.join(drawableDir, "ic_jnbot_notification.xml"),
        );
      }
      return mod;
    },
  ]);
}

module.exports = function withBackgroundService(config) {
  config = addServiceToManifest(config);
  config = updateMainApplication(config);
  config = copyNativeBackgroundFiles(config);
  return config;
};
