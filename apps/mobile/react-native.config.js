// Expo 54 skips this legacy unimodule during RN Android autolinking unless the
// native source is explicit. No new app/project identifiers are introduced.
module.exports = {
  dependencies: {
    "onnxruntime-react-native": { platforms: { android: { sourceDir: "android" } } },
  },
};
