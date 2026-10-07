const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { optimizeProperties, optimizeBuildGradle, preserveReflectiveLoader } = require("../plugins/withAndroidReleaseOptimization");

test("release optimization replaces disabled/duplicate flags and preserves unrelated properties", () => {
  const original = [
    { type: "comment", value: "Preserve me" },
    { type: "property", key: "hermesEnabled", value: "true" },
    { type: "property", key: "android.enableMinifyInReleaseBuilds", value: "false" },
    { type: "property", key: "android.enableMinifyInReleaseBuilds", value: "false" },
    { type: "property", key: "android.enableR8.fullMode", value: "false" },
  ];
  const result = optimizeProperties(original);
  assert.deepEqual(result.slice(0, 2), original.slice(0, 2));
  for (const key of ["android.enableMinifyInReleaseBuilds", "android.enableShrinkResourcesInReleaseBuilds", "android.enableR8.fullMode"]) {
    assert.deepEqual(result.filter((entry) => entry.key === key), [{ type: "property", key, value: "true" }]);
  }
  assert.deepEqual(optimizeProperties(result), result);
  assert.equal(original[2].value, "false");
});

test("uses optimizing release defaults without changing signing, debug, or native keep rules", () => {
  const original = 'debug { signingConfig signingConfigs.debug }\nrelease { proguardFiles getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro" }';
  const expected = original.replace("proguard-android.txt", "proguard-android-optimize.txt");
  assert.equal(optimizeBuildGradle(original), expected);
  assert.equal(optimizeBuildGradle(expected), expected);
  assert.throws(() => optimizeBuildGradle("unexpected template"), /not found/);
});

test("optimization is registered in the actual Expo production configuration", () => {
  const config = JSON.parse(fs.readFileSync(path.join(__dirname, "../app.json"), "utf8"));
  assert.ok(config.expo.plugins.includes("./plugins/withAndroidReleaseOptimization"));
  assert.equal(config.expo.android.package, "ca.hbic.calgary.app");
  assert.equal(config.expo.extra.eas.projectId, "79283015-cb87-48ef-9761-81ab87641205");
});

test("preserves Expo's manifest-loaded background loader without disabling other obfuscation", () => {
  const original = "-keep class com.swmansion.reanimated.** { *; }\n";
  const result = preserveReflectiveLoader(original);
  assert.ok(result.startsWith(original));
  assert.ok(result.includes("-keep,allowoptimization class expo.modules.adapters.react.apploader.RNHeadlessAppLoader"));
  assert.ok(result.includes("public <init>(android.content.Context);"));
  assert.ok(result.includes("-keep @interface expo.modules.kotlin.records.** { *; }"));
  assert.equal(preserveReflectiveLoader(result), result);
  assert.ok(!result.includes("-dontobfuscate"));
  assert.ok(!result.includes("-keep class expo.**"));
});
