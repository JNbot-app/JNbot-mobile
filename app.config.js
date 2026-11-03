const TEST_ADMOB_APP_IDS = {
  android: "ca-app-pub-3940256099942544~3347511713",
  ios: "ca-app-pub-3940256099942544~1458002511",
};

const TEST_ADMOB_INTERSTITIAL_IDS = {
  android: "ca-app-pub-3940256099942544/1033173712",
  ios: "ca-app-pub-3940256099942544/4411468910",
};

const hasPlaceholder = (value) =>
  !value || value.includes("xxxxxxxx") || value.includes("<");

const isProductionRevenueCatKey = (value, prefix) =>
  typeof value === "string" &&
  value.startsWith(prefix) &&
  !value.startsWith("test_") &&
  !hasPlaceholder(value);

const isProductionAdMobAppId = (value, testValue) =>
  typeof value === "string" &&
  /^ca-app-pub-\d+~\d+$/.test(value) &&
  value !== testValue;

const isProductionAdMobUnitId = (value, testValue) =>
  typeof value === "string" &&
  /^ca-app-pub-\d+\/\d+$/.test(value) &&
  value !== testValue;

const disablesIosMonetization = () =>
  process.env.JNBOT_IOS_MONETIZATION_DISABLED === "true" ||
  process.env.EAS_BUILD_PLATFORM === "ios";

const withoutIosAdMobConfiguration = (config) =>
  withInfoPlist(config, (configured) => {
    delete configured.modResults.GADApplicationIdentifier;
    return configured;
  });

function assertProductionConfiguration() {
  const isProduction =
    process.env.EXPO_PUBLIC_MONETIZATION_ENV === "production" ||
    process.env.EAS_BUILD_PROFILE === "production";
  if (!isProduction || disablesIosMonetization()) return;

  const invalid = [];
  if (
    !isProductionAdMobAppId(
      process.env.ADMOB_ANDROID_APP_ID,
      TEST_ADMOB_APP_IDS.android,
    )
  ) {
    invalid.push("ADMOB_ANDROID_APP_ID");
  }
  if (
    !isProductionAdMobUnitId(
      process.env.EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL_ID,
      TEST_ADMOB_INTERSTITIAL_IDS.android,
    )
  ) {
    invalid.push("EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL_ID");
  }
  if (
    !isProductionRevenueCatKey(
      process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY,
      "goog_",
    )
  ) {
    invalid.push("EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY");
  }

  if (invalid.length > 0) {
    throw new Error(
      `Production monetization configuration is incomplete or still uses test values: ${invalid.join(", ")}`,
    );
  }
}

module.exports = ({ config }) => {
  assertProductionConfiguration();
  const iosMonetizationDisabled = disablesIosMonetization();

  return {
    ...config,
    plugins: [
      ...(config.plugins ?? []),
      [
        "react-native-google-mobile-ads",
        {
          androidAppId:
            process.env.ADMOB_ANDROID_APP_ID ?? TEST_ADMOB_APP_IDS.android,
          iosAppId: process.env.ADMOB_IOS_APP_ID ?? TEST_ADMOB_APP_IDS.ios,
          delayAppMeasurementInit: true,
          optimizeInitialization: true,
          optimizeAdLoading: true,
        },
      ],
      ...(iosMonetizationDisabled ? [withoutIosAdMobConfiguration] : []),
    ],
  };
};
const { withInfoPlist } = require("@expo/config-plugins");
