const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
test('Duo release and simulator use the current Duo-capable SDK', () => {
  const config = JSON.parse(fs.readFileSync(path.join(root, 'eas.json'), 'utf8'));
  for (const name of ['production', 'qaSimulator']) {
    assert.equal(config.build[name].ios.image, 'macos-tahoe-26.6-xcode-27.1');
    assert.equal(config.build[name].ios.env.SHARP_IGNORE_GLOBAL_LIBVIPS, '1');
  }
});
test('native window tracks its own scene instead of a different display', () => {
  const source = fs.readFileSync(path.join(root, 'plugins/SceneDelegate.swift'), 'utf8');
  assert.ok(source.includes('MasjidSceneWindow(windowScene: windowScene)'));
  assert.ok(source.includes('private final class MasjidSceneWindow: UIWindow'));
  assert.ok(source.includes('window.frame = windowScene.coordinateSpace.bounds'));
  assert.match(source, /func windowScene\([\s\S]*?didUpdate[\s\S]*?window\?\.frame = windowScene\.coordinateSpace\.bounds/);
  assert.ok(!source.includes('UIScreen.main.bounds'));
  assert.ok(source.includes('[.flexibleWidth, .flexibleHeight]'));
});
test('older pod resource targets are raised only to the existing iOS 15.1 minimum', () => {
  const source = fs.readFileSync(path.join(root, 'plugins/withIosSceneLifecycle.js'), 'utf8');
  assert.ok(source.includes('withPodfile'));
  assert.ok(source.includes("Gem::Version.new(deployment) < Gem::Version.new('15.1')"));
  assert.ok(source.includes("build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.1'"));
});
test('content avoids a vertical system tab/status bar while the background fills the display', () => {
  const source = fs.readFileSync(path.join(root, 'src/components/AppScreen.tsx'), 'utf8');
  assert.ok(source.includes('edges={["top", "left", "right"]}'));
  assert.ok(source.indexOf('styles.gradient') < source.indexOf('<SafeAreaView'));
});
