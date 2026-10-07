const fs = require("node:fs/promises");
const path = require("node:path");
const { withAppBuildGradle, withGradleProperties, withDangerousMod } = require("@expo/config-plugins");

const compatibilityRules = `# HBIC R8 reflection compatibility
# Expo/Kotlin reflection reads record annotation defaults at runtime.
-keep @interface expo.modules.kotlin.records.** { *; }
# Expo loads this name from AndroidManifest metadata via Class.forName.
-keep,allowoptimization class expo.modules.adapters.react.apploader.RNHeadlessAppLoader {
    public <init>(android.content.Context);
}
# End HBIC R8 reflection compatibility`;

function preserveReflectiveLoader(source) {
  const withoutPrevious = source.replace(/# HBIC R8 reflection compatibility[\s\S]*?# End HBIC R8 reflection compatibility\s*/g, "");
  return `${withoutPrevious.trimEnd()}\n\n${compatibilityRules}\n`;
}

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
  config = withAppBuildGradle(config, (mod) => {
    mod.modResults.contents = optimizeBuildGradle(mod.modResults.contents);
    return mod;
  });
  return withDangerousMod(config, ["android", async (mod) => {
    const filename = path.join(mod.modRequest.platformProjectRoot, "app", "proguard-rules.pro");
    const source = await fs.readFile(filename, "utf8");
    await fs.writeFile(filename, preserveReflectiveLoader(source));
    return mod;
  }]);
};
module.exports.optimizeProperties = optimizeProperties;
module.exports.optimizeBuildGradle = optimizeBuildGradle;
module.exports.preserveReflectiveLoader = preserveReflectiveLoader;
