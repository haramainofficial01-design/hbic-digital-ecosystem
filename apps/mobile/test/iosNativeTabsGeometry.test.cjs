const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { patchIosNativeTabsLayout } = require("../plugins/patchIosNativeTabsLayout");

test("native tab layout follows host bounds on cold launch and display transitions", () => {
  const source = fs.readFileSync(path.join(path.dirname(require.resolve("react-native-screens/package.json")), "ios/bottom-tabs/RNSBottomTabsHostComponentView.mm"), "utf8");
  const patched = patchIosNativeTabsLayout(source);
  assert.match(patched, /layoutSubviews\s*\{\s*\[super layoutSubviews\];/);
  assert.match(patched, /!CGRectEqualToRect\(_controller\.view\.frame, self\.bounds\)/);
  assert.match(patched, /_controller\.view\.frame = self\.bounds/);
  assert.equal(patchIosNativeTabsLayout(patched), patched, "prebuild replay must not duplicate the fix");
  assert.doesNotMatch(patched.slice(patched.indexOf("// HBIC scene-sized"), patched.indexOf("- (void)willMoveToWindow")), /UIScreen|NSTimer|dispatch_after/);
});

test("unsupported dependency changes fail clearly instead of silently skipping", () => {
  assert.throws(() => patchIosNativeTabsLayout("unexpected source"), /does not match/);
  assert.throws(() => patchIosNativeTabsLayout("#pragma mark - UIView methods\n- (void)layoutSubviews {}"), /does not match/);
});

test("production prebuild applies the native fix through the existing scene plugin", () => {
  const plugin = fs.readFileSync(path.join(__dirname, "../plugins/withIosSceneLifecycle.js"), "utf8");
  assert.match(plugin, /withDangerousMod\(config, \["ios"/);
  assert.match(plugin, /patchIosNativeTabsLayout\(source\)/);
});
