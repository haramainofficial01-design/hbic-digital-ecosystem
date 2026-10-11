const { withProjectBuildGradle, withPodfile, withDangerousMod } = require("@expo/config-plugins");
const fs = require("node:fs/promises");
const path = require("node:path");
const marker = "// HBIC pinned on-device Quran runtime";
function alignQuranBridge(source) {
  if (source.includes("HBIC 16 KB JSI alignment")) return source;
  if (!source.includes("onnxruntimejsi SHARED")) throw new Error("Quran native target changed; verify 16 KB alignment before release.");
  return source + "\n# HBIC 16 KB JSI alignment\ntarget_link_options(onnxruntimejsi PRIVATE \"-Wl,-z,max-page-size=16384\" \"-Wl,-z,common-page-size=16384\")\n";
}
function protectRecordingSession(source) {
  const guard = "// HBIC recording-aware audio session";
  if (source.includes(guard)) {
    if (source.includes("if self.allowsRecording { return }") && source.includes("if wasRecordingEnabled && !mode.allowsRecording { deactivateSession() }")) return source;
    throw new Error("Incomplete recording-session guard; inspect the installed Expo audio source.");
  }
  // Expo 1.1.x delays player-pause deactivation by 100 ms but checks only
  // players. It can deactivate a newly preparing recorder. Protect the owned
  // recording mode, then release idle audio when that mode ends; never keep
  // the audio session permanently active to work around the race.
  const edits = [
    ["    self.shouldPlayInBackground = mode.shouldPlayInBackground", "    let wasRecordingEnabled = self.allowsRecording\n    self.shouldPlayInBackground = mode.shouldPlayInBackground"],
    ["    }\n  }\n\n  private func activateSession()", "    }\n    " + guard + "\n    if wasRecordingEnabled && !mode.allowsRecording { deactivateSession() }\n  }\n\n  private func activateSession()"],
    ["      let hasActivePlayers = self.registry.allPlayers.values.contains { $0.isPlaying }", "      " + guard + "\n      if self.allowsRecording { return }\n      let hasActivePlayers = self.registry.allPlayers.values.contains { $0.isPlaying }"]
  ];
  for (const [before, after] of edits) {
    if (source.split(before).length !== 2) throw new Error("Expo audio session implementation changed; verify recorder ownership before release.");
    source = source.replace(before, after);
  }
  return source;
}
module.exports = function withQuranRecitationRuntime(config) {
  config = withDangerousMod(config, ["ios", async mod => {
    const audio = require.resolve("expo-audio/package.json", { paths: [mod.modRequest.projectRoot] });
    const filename = path.join(path.dirname(audio), "ios", "AudioModule.swift");
    const source = await fs.readFile(filename, "utf8"), protectedSource = protectRecordingSession(source);
    if (protectedSource !== source) await fs.writeFile(filename, protectedSource);
    return mod;
  }]);
  config = withDangerousMod(config, ["android", async mod => {
    // The upstream JSI bridge is compiled locally; the ORT core already has
    // correct alignment. Apply the documented linker flags to this target.
    const cmake = require.resolve("onnxruntime-react-native/package.json", { paths: [mod.modRequest.projectRoot] });
    const filename = path.join(path.dirname(cmake), "android", "CMakeLists.txt");
    const source = await fs.readFile(filename, "utf8");
    const aligned = alignQuranBridge(source);
    if (aligned !== source) await fs.writeFile(filename, aligned);
    return mod;
  }]);
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
module.exports.alignQuranBridge = alignQuranBridge;
module.exports.protectRecordingSession = protectRecordingSession;
