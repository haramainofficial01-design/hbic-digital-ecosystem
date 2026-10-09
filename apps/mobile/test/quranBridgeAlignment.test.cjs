const test = require("node:test");
const assert = require("node:assert/strict");
const { alignQuranBridge } = require("../plugins/withQuranRecitationRuntime");
test("Quran bridge links for 16 KB once without replacing the native runtime", () => {
  const source = "add_library(onnxruntimejsi SHARED src.cpp)\n";
  const result = alignQuranBridge(source);
  assert.ok(result.startsWith(source));
  assert.ok(result.includes('target_link_options(onnxruntimejsi PRIVATE "-Wl,-z,max-page-size=16384" "-Wl,-z,common-page-size=16384")'));
  assert.equal(alignQuranBridge(result), result);
  assert.throws(() => alignQuranBridge("unknown target"), /native target changed/);
});
