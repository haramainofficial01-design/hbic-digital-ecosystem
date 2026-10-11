const test = require("node:test");
const assert = require("node:assert/strict");
const { alignQuranBridge, protectRecordingSession } = require("../plugins/withQuranRecitationRuntime");
test("Quran bridge links for 16 KB once without replacing the native runtime", () => {
  const source = "add_library(onnxruntimejsi SHARED src.cpp)\n";
  const result = alignQuranBridge(source);
  assert.ok(result.startsWith(source));
  assert.ok(result.includes('target_link_options(onnxruntimejsi PRIVATE "-Wl,-z,max-page-size=16384" "-Wl,-z,common-page-size=16384")'));
  assert.equal(alignQuranBridge(result), result);
  assert.throws(() => alignQuranBridge("unknown target"), /native target changed/);
});
test("iOS player pause cannot deactivate preparing/active recording, and recording end releases idle audio", () => {
  const fixture = `  private func setAudioMode(mode: AudioMode) throws {
    self.shouldPlayInBackground = mode.shouldPlayInBackground
    self.allowsRecording = mode.allowsRecording
    if sessionOptions.isEmpty {
      try session.setCategory(category, mode: .default)
    }
  }

  private func activateSession() {}
  private func deactivateSession() {
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) { [weak self] in
      let hasActivePlayers = self.registry.allPlayers.values.contains { $0.isPlaying }
      if !hasActivePlayers { session.setActive(false) }
    }
  }`;
  const result = protectRecordingSession(fixture);
  assert.ok(result.includes("let wasRecordingEnabled = self.allowsRecording"));
  assert.ok(result.indexOf("if self.allowsRecording { return }") < result.indexOf("let hasActivePlayers"));
  assert.ok(result.includes("if wasRecordingEnabled && !mode.allowsRecording { deactivateSession() }"));
  assert.equal(protectRecordingSession(result), result);
});
test("changed/partial iOS audio implementations fail closed instead of silently losing the session guard", () => {
  assert.throws(() => protectRecordingSession("different native source"), /implementation changed/);
  assert.throws(() => protectRecordingSession("// HBIC recording-aware audio session"), /Incomplete/);
});
