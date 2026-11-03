module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { unstable_transformImportMeta: true }]],
    // react-native-worklets/plugin must be listed last. Reanimated 4 relies on
    // it for its worklet transform (it replaced the old reanimated/plugin).
    plugins: ['react-native-worklets/plugin'],
  };
};
