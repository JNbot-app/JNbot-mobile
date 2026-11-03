const withBackgroundService = require("./withBackgroundService");

const serviceName = "com.jnbot.app.background.JNbotBackgroundService";
const subtypeName = "android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE";

async function applyManifestPlugin(manifest) {
  const config = withBackgroundService({ name: "JNbot", slug: "jnbot" });
  const result = await config.mods.android.manifest({
    ...config,
    modResults: { manifest },
    modRequest: { platform: "android", modName: "manifest" },
  });
  return result.modResults.manifest;
}

function expectSpecialUseService(manifest) {
  const services = manifest.application[0].service.filter(
    (service) => service.$["android:name"] === serviceName,
  );
  expect(services).toHaveLength(1);
  expect(services[0].$).toMatchObject({
    "android:enabled": "true",
    "android:exported": "false",
    "android:foregroundServiceType": "specialUse",
  });
  const properties = services[0].property.filter(
    (property) => property.$["android:name"] === subtypeName,
  );
  expect(properties).toHaveLength(1);
  expect(properties[0].$["android:value"]).toBe(
    "Keeps user-started Minecraft bots connected and executing in the embedded local runtime while the app is in the background.",
  );
}

test("creates the special-use service in a fresh manifest", async () => {
  const manifest = await applyManifestPlugin({ application: [{}] });
  expectSpecialUseService(manifest);
});

test("migrates existing declarations while preserving unrelated metadata", async () => {
  const otherService = { $: { "android:name": "OtherService" } };
  const otherProperty = { $: { "android:name": "other", "android:value": "keep" } };
  const manifest = await applyManifestPlugin({
    application: [{
      service: [
        otherService,
        { $: { "android:name": "com.jnbot.mobile.background.JNbotBackgroundService" } },
        {
          $: { "android:name": serviceName, "android:foregroundServiceType": "dataSync" },
          property: [
            otherProperty,
            { $: { "android:name": subtypeName, "android:value": "outdated" } },
          ],
        },
        { $: { "android:name": serviceName } },
      ],
    }],
  });
  expectSpecialUseService(manifest);
  expect(manifest.application[0].service).toHaveLength(2);
  expect(manifest.application[0].service).toContain(otherService);
  expect(manifest.application[0].service[1].property).toContain(otherProperty);
});

test("repeated application keeps the manifest unchanged", async () => {
  const manifest = await applyManifestPlugin({ application: [{}] });
  const snapshot = JSON.parse(JSON.stringify(manifest));
  await applyManifestPlugin(manifest);
  expect(manifest).toEqual(snapshot);
  expectSpecialUseService(manifest);
});
