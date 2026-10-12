import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { quranPrimaryMode, quranWorkspaceLayout } from "../src/quran/workspaceLayout";

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
test("Mac gets a dedicated desktop layout without changing wide iPad and Vision defaults", () => {
  for (const width of [320, 640, 779, NaN]) {
    const layout = quranWorkspaceLayout(width, "mac");
    assert.equal(layout.desktop, true); assert.equal(layout.sidebar, false); assert.equal(layout.inspector, false);
  }
  for (const width of [780, 900, 1279, 1280, 1512, 2560]) {
    const layout = quranWorkspaceLayout(width, "mac");
    assert.equal(layout.sidebar, true); assert.equal(layout.sidebarWidth, 224);
    assert.equal(layout.inspector, width >= 1280); assert.equal(layout.readingWidth, 920);
    assert.ok(width - layout.sidebarWidth - (layout.inspector ? 240 : 0) >= 500);
  }
  assert.equal(quranWorkspaceLayout(1440).desktop, false);
  assert.equal(quranWorkspaceLayout(1440).inspector, false);
});
test("desktop host detection comes from the native runtime, not display width or user agent", () => {
  const source = readFileSync(new URL("../src/quran/macRuntime.ts", import.meta.url), "utf8");
  assert.match(source, /isIOSAppOnMac/); assert.match(source, /isMacCatalyst/);
  assert.doesNotMatch(source, /userAgent|windowDimensions|fetch\(/);
});
test("Mac glass is limited to desktop controls and reduced transparency has an opaque fallback", () => {
  const source = readFileSync(new URL("../src/quran/QuranMacWorkspace.tsx", import.meta.url), "utf8");
  assert.match(source, /opaque \? View : NativeGlassSurface/);
  assert.match(source, /subscription\.remove\(\)/);
  for (const label of ["Mac Quran sidebar", "Mac reading inspector", "Hide Quran sidebar", "Show reading inspector", "Test this surah"]) assert.ok(source.includes(label));
  assert.match(source, /initialNumToRender=\{8\}/);
  assert.match(source, /onAccessibilityTap=\{disabled \? undefined : onPress\}/);
  assert.doesNotMatch(source, /setInterval|fetch\(|quranClient/);
});
test("desktop shortcuts are scoped to a mounted Quran workspace and don't hijack other screens", () => {
  const source = readFileSync(new URL("../plugins/SceneDelegate.swift", import.meta.url), "utf8");
  assert.match(source, /guard quranCommandsEnabled else \{ return super\.keyCommands \}/);
  assert.match(source, /ProcessInfo\.processInfo\.isiOSAppOnMac/);
  for (const command of ["read", "listen", "practice", "review", "search", "preferences", "sidebar"]) assert.ok(source.includes(`"${command}"`));
  const reader = readFileSync(new URL("../src/quran/QuranReaderScreen.tsx", import.meta.url), "utf8");
  assert.match(reader, /return \(\) => subscription\.remove\(\)/);
  assert.match(reader, /isMacQuranHost \? "mac" : "mobile"/);
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
  assert.equal(expo.ios.infoPlist.UISupportsTrueScreenSizeOnMac, true);
  assert.equal(expo.ios.infoPlist.UIRequiresFullScreen, undefined);
  assert.equal(expo.ios.infoPlist.UIRequiredDeviceCapabilities, undefined);
  assert.equal(expo.ios.bundleIdentifier, "ca.hbic.calgary.app");
  assert.deepEqual(expo.ios.entitlements["keychain-access-groups"], ["$(AppIdentifierPrefix)ca.hbic.calgary.app"]);
});

test("practice and library subtools remain in their primary navigation group", () => {
  for (const mode of ["practice", "memorize", "test"] as const) assert.equal(quranPrimaryMode(mode), "practice");
  for (const mode of ["review", "bookmarks"] as const) assert.equal(quranPrimaryMode(mode), "review");
  assert.equal(quranPrimaryMode("listen"), "listen");
  assert.equal(quranPrimaryMode("home"), "read");
});

test("Quran glass is bounded to navigation and respects reduced transparency", () => {
  const navigation = readFileSync(new URL("../src/quran/QuranNavigation.tsx", import.meta.url), "utf8");
  assert.match(navigation, /isReduceTransparencyEnabled/);
  assert.match(navigation, /subscription\.remove\(\)/);
  assert.match(navigation, /reduceTransparency \? View : NativeGlassSurface/);
  assert.doesNotMatch(navigation, /setInterval|fetch\(|quranClient/);
  const reader = readFileSync(new URL("../src/quran/QuranReaderScreen.tsx", import.meta.url), "utf8");
  assert.match(reader, /focused \? "Leave focus" : "Focus reading"/);
  assert.match(reader, /workspace\.sidebar && !focused/);
});
