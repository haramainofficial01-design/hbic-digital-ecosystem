import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { quranWorkspaceLayout } from "../src/quran/workspaceLayout";

test("compact Quran navigation remains usable in phone and narrow windows", () => {
  for (const width of [320, 375, 390, 430, 768, 999, NaN]) {
    const layout = quranWorkspaceLayout(width);
    assert.equal(layout.sidebar, false); assert.equal(layout.sidebarWidth, 0);
  }
});
test("expanded Mac, tablet and Vision windows retain a bounded reading column", () => {
  for (const width of [1000, 1024, 1280, 1440, 2560]) {
    const layout = quranWorkspaceLayout(width);
    assert.equal(layout.sidebar, true); assert.equal(layout.sidebarWidth, 260);
    assert.equal(layout.readingWidth, 840); assert.ok(width - layout.sidebarWidth >= 740);
  }
});
test("sidebar preserves recitation, memorization, tests, bookmarks and challenges without extra provider calls", () => {
  const source = readFileSync(new URL("../src/quran/QuranSidebar.tsx", import.meta.url), "utf8");
  for (const mode of ["home", "bookmarks", "memorize", "test", "challenges"]) assert.ok(source.includes(`mode: "${mode}"`));
  assert.match(source, /FlatList/); assert.match(source, /maxToRenderPerBatch=\{8\}/);
  assert.doesNotMatch(source, /fetch\(|quranClient|setInterval/);
});
test("the existing iPad-capable app supports indirect input without demanding phone-only hardware", () => {
  const { expo } = JSON.parse(readFileSync(new URL("../app.json", import.meta.url), "utf8"));
  assert.equal(expo.ios.supportsTablet, true);
  assert.equal(expo.ios.infoPlist.UIApplicationSupportsIndirectInputEvents, true);
  assert.equal(expo.ios.infoPlist.UIRequiresFullScreen, undefined);
  assert.equal(expo.ios.infoPlist.UIRequiredDeviceCapabilities, undefined);
  assert.equal(expo.ios.bundleIdentifier, "ca.hbic.calgary.app");
});
