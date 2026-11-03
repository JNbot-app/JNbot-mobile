/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: "widget",
  name: "JNbotWidgetExtension",
  displayName: "JNbot",
  bundleIdentifier: ".widgets",
  deploymentTarget: "16.0",
  colors: {
    $accent: "#FF7A45",
    $widgetBackground: "#121315",
  },
  entitlements: {
    "com.apple.security.application-groups":
      config.ios.entitlements["com.apple.security.application-groups"],
  },
});
