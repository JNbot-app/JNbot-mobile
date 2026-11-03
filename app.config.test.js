const TEST_ADMOB_APP_IDS = {
  android: "ca-app-pub-3940256099942544~3347511713",
  ios: "ca-app-pub-3940256099942544~1458002511",
};

const TEST_ADMOB_INTERSTITIAL_IDS = {
  android: "ca-app-pub-3940256099942544/1033173712",
  ios: "ca-app-pub-3940256099942544/4411468910",
};

const configFactory = require("./app.config.js");

const MONETIZATION_KEYS = [
  "EXPO_PUBLIC_MONETIZATION_ENV",
  "EAS_BUILD_PROFILE",
  "EAS_BUILD_PLATFORM",
  "JNBOT_IOS_MONETIZATION_DISABLED",
  "ADMOB_ANDROID_APP_ID",
  "ADMOB_IOS_APP_ID",
  "EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL_ID",
  "EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL_ID",
  "EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY",
  "EXPO_PUBLIC_REVENUECAT_IOS_API_KEY",
];

function withEnvironment(values, callback) {
  const previous = Object.fromEntries(
    MONETIZATION_KEYS.map((key) => [key, process.env[key]]),
  );
  for (const key of MONETIZATION_KEYS) delete process.env[key];
  Object.assign(process.env, values);
  try {
    return callback();
  } finally {
    for (const key of MONETIZATION_KEYS) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
}

describe("Expo production monetization configuration", () => {
  test("uses Google test app IDs outside production", () => {
    const result = withEnvironment({}, () =>
      configFactory({ config: { plugins: [] } }),
    );
    expect(result.plugins).toContainEqual([
      "react-native-google-mobile-ads",
      expect.objectContaining({
        androidAppId: TEST_ADMOB_APP_IDS.android,
        iosAppId: TEST_ADMOB_APP_IDS.ios,
      }),
    ]);
  });

  test("rejects incomplete production monetization configuration", () => {
    expect(() =>
      withEnvironment(
        { EXPO_PUBLIC_MONETIZATION_ENV: "production" },
        () => configFactory({ config: { plugins: [] } }),
      ),
    ).toThrow(/Production monetization configuration is incomplete/);
  });

  test("fails closed for the EAS production profile", () => {
    expect(() =>
      withEnvironment(
        { EAS_BUILD_PROFILE: "production" },
        () => configFactory({ config: { plugins: [] } }),
      ),
    ).toThrow(/Production monetization configuration is incomplete/);
  });

  test("strips the AdMob app id and skips monetization credentials for iOS", () => {
    const result = withEnvironment(
      {
        EXPO_PUBLIC_MONETIZATION_ENV: "production",
        JNBOT_IOS_MONETIZATION_DISABLED: "true",
      },
      () => configFactory({ config: { plugins: [] } }),
    );

    expect(result.plugins.at(-1)).toEqual(expect.any(Function));
  });

  test("rejects Google test identifiers in production", () => {
    expect(() =>
      withEnvironment(
        {
          EXPO_PUBLIC_MONETIZATION_ENV: "production",
          ADMOB_ANDROID_APP_ID: TEST_ADMOB_APP_IDS.android,
          ADMOB_IOS_APP_ID: TEST_ADMOB_APP_IDS.ios,
          EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL_ID:
            TEST_ADMOB_INTERSTITIAL_IDS.android,
          EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL_ID:
            TEST_ADMOB_INTERSTITIAL_IDS.ios,
          EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY: "goog_production_key",
          EXPO_PUBLIC_REVENUECAT_IOS_API_KEY: "appl_production_key",
        },
        () => configFactory({ config: { plugins: [] } }),
      ),
    ).toThrow(/Production monetization configuration is incomplete/);
  });

  test("accepts complete non-test production values", () => {
    const result = withEnvironment(
      {
        EXPO_PUBLIC_MONETIZATION_ENV: "production",
        ADMOB_ANDROID_APP_ID: "ca-app-pub-1593035394564260~5360225155",
        ADMOB_IOS_APP_ID: "ca-app-pub-1593035394564260~4143346403",
        EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL_ID:
          "ca-app-pub-1593035394564260/1234567890",
        EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL_ID:
          "ca-app-pub-1593035394564260/0987654321",
        EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY: "goog_production_key",
        EXPO_PUBLIC_REVENUECAT_IOS_API_KEY: "appl_production_key",
      },
      () => configFactory({ config: { plugins: [] } }),
    );

    expect(result.plugins).toContainEqual([
      "react-native-google-mobile-ads",
      expect.objectContaining({
        androidAppId: "ca-app-pub-1593035394564260~5360225155",
        iosAppId: "ca-app-pub-1593035394564260~4143346403",
      }),
    ]);
    expect(TEST_ADMOB_INTERSTITIAL_IDS.android).not.toBe(
      "ca-app-pub-1593035394564260/1234567890",
    );
  });
});
