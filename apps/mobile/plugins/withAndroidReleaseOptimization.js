const { withAppBuildGradle, withGradleProperties } = require("@expo/config-plugins");

const releaseProperties = {
  "android.enableMinifyInReleaseBuilds": "true",
  "android.enableShrinkResourcesInReleaseBuilds": "true",
  "android.enableR8.fullMode": "true",
};

function optimizeProperties(properties) {
  const retained = properties.filter(
    (entry) => entry.type !== "property" || !(entry.key in releaseProperties)
  );
  return [
    ...retained,
    ...Object.entries(releaseProperties).map(([key, value]) => ({
      type: "property", key, value,
    })),
  ];
}

function optimizeBuildGradle(source) {
  if (!/proguard-android(?:-optimize)?\.txt/.test(source)) {
    throw new Error("Android release ProGuard configuration not found; refusing an unoptimized release.");
  }
  return source.replace(/proguard-android\.txt/g, "proguard-android-optimize.txt");
}

module.exports = function withAndroidReleaseOptimization(config) {
  config = withGradleProperties(config, (mod) => {
    mod.modResults = optimizeProperties(mod.modResults);
    return mod;
  });
  return withAppBuildGradle(config, (mod) => {
    mod.modResults.contents = optimizeBuildGradle(mod.modResults.contents);
    return mod;
  });
};
module.exports.optimizeProperties = optimizeProperties;
module.exports.optimizeBuildGradle = optimizeBuildGradle;
