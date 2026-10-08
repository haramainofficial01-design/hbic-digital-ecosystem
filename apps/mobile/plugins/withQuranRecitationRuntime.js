const { withProjectBuildGradle, withPodfile } = require("@expo/config-plugins");
const marker = "// HBIC pinned on-device Quran runtime";
module.exports = function withQuranRecitationRuntime(config) {
  config = withProjectBuildGradle(config, (mod) => {
    if (!mod.modResults.contents.includes(marker)) mod.modResults.contents += `\n${marker}\nallprojects {\n  configurations.configureEach {\n    resolutionStrategy.eachDependency { details ->\n      if (details.requested.group == 'com.microsoft.onnxruntime' && details.requested.name == 'onnxruntime-android') {\n        details.useVersion '1.24.3'\n      }\n    }\n  }\n}\n`;
    return mod;
  });
  return withPodfile(config, (mod) => {
    if (!mod.modResults.contents.includes(marker.replace("//", "#"))) {
      const target = /target ['"]MasjidBilal['"] do/;
      if (!target.test(mod.modResults.contents)) throw new Error("HBIC phone Podfile target not found; refusing to modify Watch targets.");
      mod.modResults.contents = mod.modResults.contents.replace(target, (line) => `${line}\n  ${marker.replace("//", "#")}\n  pod 'onnxruntime-c', '1.24.3'`);
    }
    return mod;
  });
};
