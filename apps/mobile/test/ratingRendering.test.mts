import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { chromium, type Page } from "playwright";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../../..");
const rating = path.join(root, "apps/mobile/src/rating");
const qaDirectory = mkdtempSync(path.join(tmpdir(), "hbic-rating-qa-"));
// Explicit native adapters exercise the real React effects, storage and actions.
// These checks do not claim physical-device store UI or Apple prompt delivery.
const native = `import React,{useEffect} from 'react';
const flatten=s=>Array.isArray(s)?Object.assign({},...s.map(flatten)):s||{};
const style=s=>{const x={...flatten(s)};if(x.fontSize)x.fontSize*=window.textScale||1;if(x.lineHeight)x.lineHeight=(x.lineHeight*(window.textScale||1))+'px';return x};
export const Platform={OS:window.platform};
export const View=({children,style:s,...p})=><div style={{display:'flex',flexDirection:'column',position:'relative',...style(s)}}>{children}</div>;
export const Text=({children,style:s,accessibilityRole})=><div role={accessibilityRole==='header'?'heading':undefined} style={style(s)}>{children}</div>;
export const Image=({style:s})=><div aria-label='Masjid Bilal logo' style={{...style(s),background:'#087B83'}}/>;
export const Pressable=({children,onPress,style:s,accessible,accessibilityLabel,disabled})=>accessible===false?<div onClick={onPress} style={style(s)}/>:<button aria-label={accessibilityLabel} disabled={disabled} onClick={onPress} style={{...style(typeof s==='function'?s({pressed:false}):s),font:'inherit'}}>{children}</button>;
export const ScrollView=({children,contentContainerStyle})=><div style={{overflowY:'auto',width:'100%',maxHeight:'100vh'}}><div style={{...style(contentContainerStyle),minHeight:'100vh',boxSizing:'border-box',display:'flex',flexDirection:'column'}}>{children}</div></div>;
export const Modal=({visible,children,onRequestClose})=>{useEffect(()=>{window.back=onRequestClose},[onRequestClose]);return visible?<div data-testid='invitation' role='dialog' style={{display:'flex',position:'fixed',inset:0,zIndex:10,overflow:'hidden'}}>{children}</div>:null};
export const StyleSheet={create:x=>x,hairlineWidth:1,absoluteFill:{position:'absolute',inset:0},absoluteFillObject:{position:'absolute',inset:0}};
const states=new Set();export const AppState={currentState:'active',addEventListener(_,fn){states.add(fn);return{remove(){states.delete(fn)}}}};
window.appState=s=>{AppState.currentState=s;states.forEach(fn=>fn(s))};
export const InteractionManager={runAfterInteractions(fn){let cancelled=false;queueMicrotask(()=>{if(!cancelled)fn()});return{cancel(){cancelled=true}}}};
export const Linking={_validateURL(url){if(typeof url!=='string')throw Error('invalid URL')},async openURL(url){this._validateURL(url);window.opened.push(url);if(window.failStore)throw Error('offline')}};`;
const content = `export const usePublishedContent=()=>window.fixture.content;
export const useOnboarding=()=>({active:window.fixture.onboarding});
export const useIsFocused=()=>window.fixture.focused;`;
const notifications = `const received=new Set(),responses=new Set();
export const getLastNotificationResponseAsync=async()=>window.launchResponse||null;
export const addNotificationReceivedListener=fn=>{received.add(fn);return{remove(){received.delete(fn)}}};
export const addNotificationResponseReceivedListener=fn=>{responses.add(fn);return{remove(){responses.delete(fn)}}};
window.notification=()=>received.forEach(fn=>fn({}));window.response=()=>responses.forEach(fn=>fn({}));
window.notificationListeners=()=>received.size+responses.size;`;
const modules: Record<string, string> = {
  "react-native": native,
  "react-native-safe-area-context": "export{View as SafeAreaView}from'react-native'",
  "expo-linear-gradient": "import React from'react';import{View}from'react-native';export const LinearGradient=({colors,style,children})=><View style={[style,{backgroundColor:colors[0]}]}>{children}</View>",
  "expo-notifications": notifications,
  "expo-modules-core": "export const requireOptionalNativeModule=()=>window.nativeAvailable===false?{}:{requestAppReview:async()=>{window.nativeRequests++;return window.nativeDecline!==true}}",
  "expo-file-system/legacy": "export const documentDirectory='file:///qa/';export const getInfoAsync=async()=>({exists:window.disk!==null});export const readAsStringAsync=async()=>window.disk;export const writeAsStringAsync=async(_,value)=>{if(window.diskFailure)throw Error('disk full');window.disk=value}",
  "@react-navigation/native": content,
  "@expo/vector-icons": "export const Ionicons=()=>null",
  "@hbic/shared": `export*from'${root}/packages/shared/src/ratingCampaign';export const isVisibleItem=x=>x.visible!==false&&!x.archived;export const createWidgetPrayerSnapshot=()=>({prayers:window.prayerTimes.map(time=>({key:'fajr',adhanDate:new Date(time).toISOString()})),jumuah:[]});`
};

async function bundle() {
  const result = await build({ write: false, bundle: true, platform: "browser", format: "iife", jsx: "automatic", define: { "process.env.NODE_ENV": '"production"', "__DEV__": "false" },
    stdin: { resolveDir: root, loader: "tsx", contents: `import React,{useState}from'react';import{createRoot}from'react-dom/client';import{flushSync}from'react-dom';import{RatingCampaignHost}from'${rating}/RatingCampaignHost';import{RateAppButton}from'${rating}/RateAppButton';import{noteRatingHomeInteraction}from'${rating}/homeActivity';
let reactRoot;function Harness(){const [tick,set]=useState(0);window.patch=(key,value)=>flushSync(()=>{window.fixture[key]=value;if(key==='lastInteractionAt')noteRatingHomeInteraction(value);set(x=>x+1)});return <><RatingCampaignHost homeReady={window.fixture.ready}/><RateAppButton/></>}
window.mount=()=>{reactRoot=createRoot(document.getElementById('root'));flushSync(()=>reactRoot.render(<Harness/>))};window.unmount=()=>flushSync(()=>reactRoot.unmount());window.mount();` },
    plugins: [{ name: "rating-native-adapter", setup(builder) {
      builder.onResolve({ filter: /.*/ }, args => {
        if (modules[args.path]) return { path: args.path, namespace: "fixture" };
        for (const [suffix, name] of [["services/content", "content"], ["OnboardingProvider", "content"], ["ThemeProvider", "theme"], ["LanguageProvider", "language"], ["LocalizedText", "text"], ["constants/assets", "assets"]])
          if (args.path.endsWith(suffix)) return { path: name, namespace: "fixture" };
      });
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: modules[args.path] ?? {
        content, theme: `import{lightTheme,darkTheme}from'${root}/apps/mobile/src/theme/theme';export const useAppTheme=()=>({theme:window.dark?darkTheme:lightTheme})`,
        language: "export const useAppLanguage=()=>({translate:x=>x})", text: "export{Text,Image}from'react-native';export const Alert={alert:(...args)=>window.errors.push(args)}",
        assets: "export const brandAssets={appMark:{}}"
      }[args.path], loader: "tsx", resolveDir: root }));
    } }] });
  return result.outputFiles[0].text;
}
let bundled: Promise<string> | undefined;
async function setup(page: Page, platform = "android", extra: Record<string, unknown> = {}) {
  await page.clock.install({ time: new Date("2026-10-13T16:00:00Z") });
  await page.setContent(`<style>html,body{margin:0;font-family:system-ui}*{box-sizing:border-box}button{cursor:pointer}</style><div id="root"></div>`);
  await page.evaluate(({ platform, extra }) => Object.assign(window, { platform, disk: null, opened: [], errors: [], nativeRequests: 0,
    fixture: { ready: true, focused: true, onboarding: false, lastInteractionAt: Date.now(), content: { loading: false, source: "api", refreshError: null,
      content: { settings: { ratingCampaign: { id: "hbic-rating-2026-10", enabled: true } }, announcements: [] } } }, prayerTimes: [Date.now() + 3_600_000] }, extra), { platform, extra });
  bundled ??= bundle(); await page.addScriptTag({ content: await bundled });
}
async function advance(page: Page, ms = 16_000) {
  // Let React commit between virtual clock ticks, like a real foreground app.
  for (let remaining = ms; remaining > 0; remaining -= 1_000) {
    await page.clock.runFor(Math.min(1_000, remaining));
    await page.waitForTimeout(1);
  }
}
async function patch(page: Page, key: string, value: unknown) { await page.evaluate(([key, value]) => (window as any).patch(key, value), [key, value]); }
async function campaign(page: Page, enabled: boolean, id = "hbic-rating-2026-10") {
  const next = await page.evaluate(({ enabled, id }) => ({ ...(window as any).fixture.content,
    content: { settings: { ratingCampaign: { id, enabled } }, announcements: [] } }), { enabled, id });
  await patch(page, "content", next);
}

test("Android waits for idle home, shows exact copy, Not Now persists through remount and disabling/re-enabling", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage(); await setup(page);
    await advance(page, 14_000); assert.equal(await page.getByRole("dialog").count(), 0);
    await advance(page, 2_000); assert.equal(await page.getByRole("dialog").count(), 1);
    await page.getByRole("button", { name: "Not Now", exact: true }).click();
    assert.equal(await page.getByRole("dialog").count(), 0);
    assert.deepEqual(await page.evaluate(() => (window as any).opened), []);
    await page.evaluate(() => { (window as any).unmount(); (window as any).mount(); }); await advance(page);
    assert.equal(await page.getByRole("dialog").count(), 0);
    await campaign(page, false); await campaign(page, true); await advance(page);
    assert.equal(await page.getByRole("dialog").count(), 0);
    await campaign(page, true, "second-approved-campaign"); await advance(page);
    assert.equal(await page.getByRole("dialog").count(), 1);
    await page.getByRole("button", { name: "Rate Our App ⭐", exact: true }).click();
    assert.match((await page.evaluate(() => (window as any).opened))[0], /market:\/\/details\?id=ca.hbic.calgary.app&showAllReviews=true/);
    assert.equal(await page.getByRole("dialog").count(), 0);
  } finally { await browser.close(); }
});
test("remote kill switch dismisses an open invitation; Android Back dismisses without store navigation", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage(); await setup(page); await advance(page);
    await campaign(page, false); assert.equal(await page.getByRole("dialog").count(), 0);
    await campaign(page, true, "back-campaign"); await advance(page);
    await page.evaluate(() => (window as any).back());
    assert.equal(await page.getByRole("dialog").count(), 0);
    assert.deepEqual(await page.evaluate(() => (window as any).opened), []);
  } finally { await browser.close(); }
});
test("iOS invokes the native API once, never shows custom UI, and its permanent action opens write-review", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage(); await setup(page, "ios"); await advance(page);
    assert.equal(await page.evaluate(() => (window as any).nativeRequests), 1);
    assert.equal(await page.getByRole("dialog").count(), 0);
    await page.evaluate(() => { (window as any).unmount(); (window as any).mount(); }); await advance(page);
    assert.equal(await page.evaluate(() => (window as any).nativeRequests), 1);
    await page.getByRole("button", { name: "Rate Our App", exact: true }).click();
    assert.match((await page.evaluate(() => (window as any).opened))[0], /id6790937097\?action=write-review$/);
    assert.equal(await page.evaluate(() => (window as any).nativeRequests), 1);
  } finally { await browser.close(); }
});
test("old iOS binaries without the new bridge safely suppress automatic prompting", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage(); await setup(page, "ios", { nativeAvailable: false }); await advance(page);
    assert.equal(await page.evaluate(() => (window as any).nativeRequests), 0);
    assert.equal(await page.evaluate(() => (window as any).disk), null);
    assert.equal(await page.getByRole("dialog").count(), 0);
  } finally { await browser.close(); }
});
test("cached or failed remote fetches cannot activate a campaign, and native decline does not consume it", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const flags of [{ source: "cache" }, { source: "bundled-fallback" }, { refreshError: "Offline" }, { loading: true }]) {
      const page = await browser.newPage(); await setup(page);
      const cached = await page.evaluate(flags => ({ ...(window as any).fixture.content, ...flags }), flags);
      await patch(page, "content", cached); await advance(page);
      assert.equal(await page.getByRole("dialog").count(), 0);
      assert.equal(await page.evaluate(() => (window as any).disk), null);
      await page.close();
    }
    const page = await browser.newPage(); await setup(page, "ios", { nativeDecline: true }); await advance(page);
    assert.equal(await page.evaluate(() => (window as any).nativeRequests), 1);
    assert.deepEqual(await page.evaluate(() => JSON.parse((window as any).disk).attempted), []);
    await advance(page, 60_000);
    assert.equal(await page.evaluate(() => (window as any).nativeRequests), 1);
  } finally { await browser.close(); }
});
test("a voluntary permanent review action satisfies the campaign without a later automatic invitation", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage(); await setup(page);
    await patch(page, "focused", false);
    await page.getByRole("button", { name: "Rate Our App", exact: true }).click();
    await patch(page, "focused", true); await advance(page);
    assert.equal(await page.getByRole("dialog").count(), 0);
    assert.equal(await page.evaluate(() => (window as any).opened.length), 1);
  } finally { await browser.close(); }
});
test("onboarding, loading, other-screen interactions, background and notifications postpone instead of consuming", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const [key, value] of [["ready", false], ["onboarding", true], ["focused", false]] as const) {
      const page = await browser.newPage(); await setup(page); await patch(page, key, value); await advance(page);
      assert.equal(await page.getByRole("dialog").count(), 0); assert.equal(await page.evaluate(() => (window as any).disk), null);
      await patch(page, key, !value); await advance(page); assert.equal(await page.getByRole("dialog").count(), 1); await page.close();
    }
    const page = await browser.newPage(); await setup(page); await page.evaluate(() => (window as any).appState("background")); await advance(page);
    assert.equal(await page.evaluate(() => (window as any).disk), null);
    await page.evaluate(() => { (window as any).appState("active"); (window as any).notification(); }); await advance(page);
    assert.equal(await page.getByRole("dialog").count(), 0);
    await advance(page, 140_000); assert.equal(await page.getByRole("dialog").count(), 1);
    await page.evaluate(() => (window as any).response()); assert.equal(await page.getByRole("dialog").count(), 0);
  } finally { await browser.close(); }
});
test("fresh remote activation is required; idle resets after touch; store errors preserve the dismiss decision", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage(); await setup(page); await campaign(page, false); await advance(page);
    assert.equal(await page.evaluate(() => (window as any).disk), null);
    await campaign(page, true); await advance(page, 10_000);
    await patch(page, "lastInteractionAt", await page.evaluate(() => Date.now())); await advance(page, 10_000);
    assert.equal(await page.getByRole("dialog").count(), 0); await advance(page, 6_000);
    assert.equal(await page.getByRole("dialog").count(), 1);
    await page.evaluate(() => { (window as any).failStore = true; });
    await page.getByRole("button", { name: "Rate Our App ⭐", exact: true }).click();
    assert.equal(await page.getByRole("dialog").count(), 0);
    assert.equal(await page.evaluate(() => (window as any).errors.length), 1);
    await page.evaluate(() => { (window as any).unmount(); (window as any).mount(); }); await advance(page);
    assert.equal(await page.getByRole("dialog").count(), 0);
  } finally { await browser.close(); }
});
test("small screens, enlarged text and dark mode keep both actions reachable without horizontal overflow", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const [width, height, scale, dark] of [[320, 568, 1, false], [390, 844, 1.5, false], [320, 568, 1.5, true]] as const) {
      const page = await browser.newPage({ viewport: { width, height } }); await setup(page, "android", { textScale: scale, dark }); await advance(page);
      assert.equal(await page.getByRole("dialog").count(), 1);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.getByRole("button", { name: "Not Now", exact: true }).scrollIntoViewIfNeeded();
      const box = await page.getByRole("button", { name: "Not Now", exact: true }).boundingBox(); assert.ok(box && box.x >= 0 && box.x + box.width <= width);
      const screenshot = path.join(qaDirectory, `android-invitation-${width}-${scale}-${dark ? "dark" : "light"}.png`);
      await page.screenshot({ path: screenshot }); console.log("Rendered native-adapter QA:", screenshot);
      await page.getByRole("button", { name: "Not Now", exact: true }).click(); await page.close();
    }
  } finally { await browser.close(); }
});
