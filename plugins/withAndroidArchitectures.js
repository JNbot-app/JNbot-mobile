const { withGradleProperties, withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const SUPPORTED_ANDROID_ARCHITECTURES = "armeabi-v7a,arm64-v8a,x86_64";

const REQUIRED_PROPERTIES = {
  reactNativeArchitectures: SUPPORTED_ANDROID_ARCHITECTURES,
  "android.enableMinifyInReleaseBuilds": "true",
  "android.enableShrinkResourcesInReleaseBuilds": "true",
};

const PROGUARD_RULES = `
# Preserve source file and line numbers for de-obfuscation in Sentry and Play Console
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod

# React Native & TurboModules
-keep class com.facebook.react.turbomodule.** { *; }
-keep class com.facebook.react.fabric.** { *; }
-keepclassmembers class * {
    @com.facebook.react.bridge.ReactMethod *;
}

# Node.js Mobile (prevents JNI and reflection crashes)
-keep class com.janeasystems.rn_nodejs_mobile.** { *; }
-dontwarn com.janeasystems.rn_nodejs_mobile.**

# Custom JNbot Background Service
-keep class com.jnbot.app.background.** { *; }

# WebRTC JNI bindings
-keep class org.webrtc.** { *; }
-dontwarn org.webrtc.**

# React Native UI Libraries
-keep class com.swmansion.rnscreens.** { *; }
-keep class com.swmansion.reanimated.** { *; }
-keep class com.swmansion.worklets.** { *; }
-keep class com.swmansion.gesturehandler.** { *; }
-keep class com.th3rdwave.safeareacontext.** { *; }

# Purchases (RevenueCat) & Google Mobile Ads
-keep class com.revenuecat.purchases.** { *; }
-dontwarn com.revenuecat.purchases.**
-dontwarn com.google.android.gms.ads.**

# Kotlin coroutines and standard library warnings
-dontwarn kotlin.**
-dontwarn kotlinx.coroutines.**
`;

function configureGradleProperties(config) {
  return withGradleProperties(config, (mod) => {
    for (const [key, value] of Object.entries(REQUIRED_PROPERTIES)) {
      const existing = mod.modResults.find(
        (property) => property.type === "property" && property.key === key,
      );
      if (existing) {
        existing.value = value;
      } else {
        mod.modResults.push({
          type: "property",
          key,
          value,
        });
      }
    }
    return mod;
  });
}

function configureProguardRules(config) {
  return withDangerousMod(config, [
    "android",
    (mod) => {
      const proguardPath = path.join(
        mod.modRequest.projectRoot,
        "android",
        "app",
        "proguard-rules.pro",
      );
      if (fs.existsSync(proguardPath)) {
        const content = fs.readFileSync(proguardPath, "utf8");
        if (!content.includes("com.janeasystems.rn_nodejs_mobile")) {
          fs.appendFileSync(proguardPath, PROGUARD_RULES);
        }
      }
      return mod;
    },
  ]);
}

module.exports = function withAndroidArchitectures(config) {
  return configureProguardRules(configureGradleProperties(config));
};

