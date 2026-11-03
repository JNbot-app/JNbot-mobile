const withAndroidArchitectures = require("./withAndroidArchitectures");

test("adds android architecture and release minification properties", async () => {
  const config = withAndroidArchitectures({ name: "JNbot", slug: "jnbot" });
  const result = await config.mods.android.gradleProperties({
    ...config,
    modResults: [],
    modRequest: { platform: "android", modName: "gradleProperties" },
  });

  const properties = result.modResults.reduce((acc, curr) => {
    if (curr.type === "property") acc[curr.key] = curr.value;
    return acc;
  }, {});

  expect(properties["reactNativeArchitectures"]).toBe("armeabi-v7a,arm64-v8a,x86_64");
  expect(properties["android.enableMinifyInReleaseBuilds"]).toBe("true");
  expect(properties["android.enableShrinkResourcesInReleaseBuilds"]).toBe("true");
});

test("updates existing properties if already defined", async () => {
  const config = withAndroidArchitectures({ name: "JNbot", slug: "jnbot" });
  const result = await config.mods.android.gradleProperties({
    ...config,
    modResults: [
      { type: "property", key: "android.enableMinifyInReleaseBuilds", value: "false" },
    ],
    modRequest: { platform: "android", modName: "gradleProperties" },
  });

  const property = result.modResults.find(
    (p) => p.key === "android.enableMinifyInReleaseBuilds",
  );
  expect(property.value).toBe("true");
});
