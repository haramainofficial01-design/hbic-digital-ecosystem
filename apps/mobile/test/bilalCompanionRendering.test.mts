import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { chromium, type Page } from "playwright";
import path from "node:path";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { defaultContent, normalizeContent } from "@hbic/shared";

const root = path.resolve(import.meta.dirname, "../../.."), qa = mkdtempSync(path.join(tmpdir(), "hbic-companion-native-adapters-"));
// Real component/effects/client with explicit native UI adapters. Not physical-device proof.
const native = `import React,{forwardRef,useEffect,useImperativeHandle,useRef}from'react';
const flat=s=>Array.isArray(s)?Object.assign({},...s.map(flat)):s||{};
const css=s=>{const x={...flat(s)};for(const key of ['padding','margin']){if(x[key+'Horizontal']!==undefined){x[key+'Left']=x[key+'Right']=x[key+'Horizontal'];delete x[key+'Horizontal']}if(x[key+'Vertical']!==undefined){x[key+'Top']=x[key+'Bottom']=x[key+'Vertical'];delete x[key+'Vertical']}}if(x.fontSize)x.fontSize*=window.textScale||1;if(x.lineHeight)x.lineHeight=(x.lineHeight*(window.textScale||1))+'px';return x};
export const Platform={OS:window.platform};export const useWindowDimensions=()=>({width:window.innerWidth,height:window.innerHeight});export const StyleSheet={create:x=>x,absoluteFillObject:{position:'absolute',inset:0}};
export const View=({children,style:s})=><div style={{display:'flex',position:'relative',flexDirection:'column',minWidth:0,...css(s)}}>{children}</div>;
export const Animated={View,createAnimatedComponent:component=>component,Value:class{setValue(){}interpolate(){return 0}},timing:(_,config)=>({start(){window.motionStarts=(window.motionStarts||0)+1;window.motionConfig=config},stop(){window.motionStops=(window.motionStops||0)+1}})};export const Easing={out:x=>x,cubic:x=>x};
export const Text=({children,style:s,accessibilityRole})=><div role={accessibilityRole==='header'?'heading':accessibilityRole==='alert'?'alert':undefined} style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',...css(s)}}>{children}</div>;
export const TextInput=forwardRef(({value,onChangeText,onSubmitEditing,accessibilityLabel,placeholder,editable,style:s},ref)=><input ref={ref} aria-label={accessibilityLabel} placeholder={placeholder} value={value} disabled={editable===false} onChange={e=>onChangeText(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')onSubmitEditing()}} style={{border:0,background:'transparent',...css(s)}}/>);
export const Pressable=({children,onPress,onPressIn,onPressOut,accessibilityLabel,accessibilityRole,disabled,style:s,testID})=><button data-testid={testID} role={accessibilityRole==='link'?'link':undefined} aria-label={accessibilityLabel} disabled={disabled} onPointerDown={onPressIn} onPointerUp={onPressOut} onClick={onPress} style={{display:'flex',position:'relative',backgroundColor:'transparent',cursor:'pointer',font:'inherit',...css(typeof s==='function'?s({pressed:false}):s)}}>{children}</button>;
export const ScrollView=forwardRef(({children,style:s,contentContainerStyle,onContentSizeChange},ref)=>{const el=useRef();useImperativeHandle(ref,()=>({scrollToEnd(){el.current?.scrollTo(0,el.current.scrollHeight)}}));useEffect(()=>{onContentSizeChange?.()},[children]);return <div ref={el} style={{overflowY:'auto',...css(s)}}><div style={{display:'flex',flexDirection:'column',...css(contentContainerStyle)}}>{children}</div></div>});
export const KeyboardAvoidingView=({children,style:s})=><div style={{display:'flex',flexDirection:'column',height:'calc(100dvh - '+(window.keyboardHeight||0)+'px)',...css(s)}}>{children}</div>;
export const Modal=({visible,children,onRequestClose,onShow})=>{useEffect(()=>{window.back=onRequestClose;if(visible)onShow?.()},[visible]);return visible?<div role='dialog' style={{position:'fixed',inset:0,zIndex:100}}>{children}</div>:null};
export const AccessibilityInfo={isReduceMotionEnabled:async()=>window.reducedMotion!==false,addEventListener:()=>({remove(){}})};
export const Image=forwardRef((_,ref)=><img ref={ref}/>);export const Alert={alert(){}};
const listeners=new Set();export const AppState={currentState:'active',addEventListener(_,fn){listeners.add(fn);return{remove(){listeners.delete(fn)}}}};window.appState=s=>listeners.forEach(fn=>fn(s));
export const Linking={openURL:async url=>{window.opened.push(url);if(window.linkError)throw Error('offline')}};`;

async function bundle() {
  const result = await build({ bundle: true, write: false, format: "iife", platform: "browser", jsx: "automatic", define: { "process.env.NODE_ENV": '"production"', "process.env.EXPO_PUBLIC_API_URL": '"https://hbic.ca"' }, stdin: { resolveDir: root, loader: "tsx", contents: `import React,{useState}from'react';import{createRoot}from'react-dom/client';import{flushSync}from'react-dom';import{BilalCompanion,BilalLauncher}from'./apps/mobile/src/companion/BilalCompanion';import{getCompanionActive}from'./apps/mobile/src/companion/activity';window.companionActive=getCompanionActive;function Harness(){const[tick,set]=useState(0);window.patch=(key,value)=>flushSync(()=>{window.fixture[key]=value;set(x=>x+1)});return <BilalCompanion><BilalLauncher/><button id="screen-content">Screen content remains mounted</button></BilalCompanion>}let root;window.mount=()=>{root=createRoot(document.getElementById('root'));flushSync(()=>root.render(<Harness/>))};window.unmount=()=>flushSync(()=>root.unmount());window.mount();` }, plugins: [{ name: "native-companion-adapters", setup(b) {
    b.onResolve({ filter: /^react-native$|^@react-navigation\/native$|^react-native-safe-area-context$|^@expo\/vector-icons$|^expo-router$|^expo-notifications$|^expo-file-system\/legacy$|^expo-linear-gradient$/ }, args => ({ path: args.path, namespace: "fixture" }));
    for (const name of ["ThemeProvider", "LanguageProvider", "OnboardingProvider", "services/content", "quran/macRuntime", "components/NativeGlassSurface", "constants/assets"]) b.onResolve({ filter: new RegExp(`${name}$`) }, () => ({ path: name, namespace: "fixture" }));
    b.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ loader: "tsx", resolveDir: root, contents: {
      "react-native": native,
      "@react-navigation/native": "export const useIsFocused=()=>window.fixture.focused!==false",
      "react-native-safe-area-context": "export const useSafeAreaInsets=()=>({top:20,bottom:20,left:0,right:0})",
      "@expo/vector-icons": "import React from'react';export const Ionicons=()=> <span aria-hidden='true' style={{width:20,height:20}}>◌</span>",
      "expo-linear-gradient": "import React from'react';import{View}from'react-native';export const LinearGradient=({children,style})=><View style={style}>{children}</View>",
      "expo-router": "export const usePathname=()=>window.fixture.pathname",
      "expo-notifications": "const received=new Set(),tapped=new Set();export const getLastNotificationResponseAsync=async()=>null;export const addNotificationReceivedListener=fn=>{received.add(fn);return{remove(){received.delete(fn)}}};export const addNotificationResponseReceivedListener=fn=>{tapped.add(fn);return{remove(){tapped.delete(fn)}}};window.notification=()=>received.forEach(fn=>fn());window.notificationListeners=()=>received.size+tapped.size",
      "expo-file-system/legacy": "export const documentDirectory='test://';export const getInfoAsync=async()=>({exists:window.tourDisk!==null});export const readAsStringAsync=async()=>window.tourDisk;export const writeAsStringAsync=async(_,v)=>{window.tourDisk=v};export const deleteAsync=async()=>{window.tourDisk=null}",
      "components/NativeGlassSurface": `import React from'react';import{View}from'react-native';export const NativeGlassSurface=({children,style})=><View style={style}>{children}</View>`,
      "constants/assets": "export const brandAssets={bilalMark:{}}",
      ThemeProvider: `import{lightTheme,darkTheme}from'${root}/apps/mobile/src/theme/theme';export const useAppTheme=()=>({theme:window.dark?darkTheme:lightTheme})`,
      LanguageProvider: `import{translateUi}from'@hbic/shared';export const useAppLanguage=()=>({language:window.fixture.language,isRtl:window.fixture.language!=='en',translate:x=>translateUi(window.fixture.language,x)})`,
      OnboardingProvider: "export const useOnboarding=()=>({active:window.fixture.onboarding})",
      "services/content": "export const usePublishedContent=()=>({loading:window.fixture.loading,content:window.fixture.content?{...window.fixture.content,featureFlags:{...window.fixture.content.featureFlags,bilalCompanionEnabled:window.fixture.enabled}}:{featureFlags:{bilalCompanionEnabled:window.fixture.enabled}},source:window.fixture.source})",
      "quran/macRuntime": "export const isMacQuranHost=window.mac"
    }[args.path] ?? "" }));
  } }] });
  return result.outputFiles[0].text;
}
const bundled = bundle();
async function setup(page: Page, platform = "android", dark = false, mac = false, seen = true) {
  page.setDefaultTimeout(5000);
  page.on("pageerror", error => console.error("Native-adapter error:", error.message));
  await page.setContent("<style>html,body{margin:0;font-family:system-ui}*{box-sizing:border-box}button{border:0}</style><div id='root'></div>");
  await page.evaluate(({ platform, dark, mac, seen }) => {
    Object.assign(window, { platform, dark, mac, tourDisk: seen ? "hbic-bilal-welcome-2026-10-v1" : null, opened: [], requests: [], fixture: { pathname: "/", loading: false, onboarding: false, enabled: true, language: "en" }, fail: false });
    window.fetch = async (_, init) => { const w = window as any; w.requests.push({ url: String(_), body: JSON.parse(String(init?.body)) }); return Response.json(w.fail ? { ok: false } : { ok: true, answer: "Verified public answer.", sources: [{ id: "contact", title: "Source page", href: "https://hbic.ca/contact" }, { id: "bad", title: "Unsafe link", href: "https://untrusted.test" }], asOf: "2026-10-17T16:00:00Z", mode: "published-info" }, { status: w.fail ? 503 : 200 }); };
  }, { platform, dark, mac, seen });
  await page.addScriptTag({ content: await bundled });
}
async function patch(page: Page, key: string, value: unknown) { await page.evaluate(([key, value]) => (window as any).patch(key, value), [key, value]); }

test("native motion is finite and native-driven, does not repeat on typing, and stops when hidden", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage(); await page.setContent("<div></div>");
    await page.evaluate(() => { (window as any).reducedMotion = false; }); await setup(page);
    await page.getByRole("button", { name: "Open Bilal" }).click();
    const initial = await page.evaluate(() => ({ starts: (window as any).motionStarts, config: (window as any).motionConfig }));
    assert.ok(initial.starts > 0); assert.equal(initial.config.useNativeDriver, true); assert.equal(initial.config.isInteraction, false); assert.ok(initial.config.duration <= 300);
    await page.getByRole("textbox", { name: "Your question" }).fill("contact");
    assert.equal(await page.evaluate(() => (window as any).motionStarts), initial.starts, "Typing must not replay an animation");
    await page.evaluate(() => (window as any).appState("background")); await page.getByRole("dialog").waitFor({ state: "hidden" });
    assert.ok(await page.evaluate(() => (window as any).motionStops) > 0);
    await page.close();
  } finally { await browser.close(); }
});

test("iOS/Android/Mac native component actions, bounded layout, sources, clearing and session-only lifecycle", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const [platform, width, height, dark, mac] of [["ios",390,844,false,false],["android",320,568,true,false],["ios",1440,900,true,true]] as const) {
      const page = await browser.newPage({ viewport: { width, height } }); await setup(page, platform, dark, mac);
      const launcher = page.getByRole("button", { name: "Open Bilal" }); assert.equal(await page.getByRole("dialog").count(), 0);
      await launcher.click(); await page.getByRole("dialog").waitFor(); assert.equal(await page.evaluate(() => (window as any).companionActive()), true);
      const input = page.getByRole("textbox", { name: "Your question" }); await input.fill("contact"); await page.getByRole("button", { name: "Send question" }).click();
      await page.getByText("Verified public answer.", { exact: true }).waitFor();
      assert.equal(await page.getByRole("link", { name: "Unsafe link" }).count(), 0);
      const form = await input.boundingBox(); assert.ok(form && form.x >= 0 && form.x + form.width <= width + 1 && form.y >= 0 && form.y + form.height <= height, JSON.stringify(form));
      await page.screenshot({ path: path.join(qa, `${platform}-${width}.png`) });
      await page.getByRole("link", { name: "Source page" }).click(); assert.deepEqual(await page.evaluate(() => (window as any).opened), ["https://hbic.ca/contact"]);
      await page.getByRole("dialog").waitFor({ state: "hidden" }); assert.equal(await page.getByRole("dialog").count(), 0); assert.equal(await page.evaluate(() => (window as any).companionActive()), false);
      await launcher.click(); await page.getByRole("button", { name: "Clear chat" }).click(); assert.equal(await page.getByText("Verified public answer.", { exact: true }).count(), 0);
      await page.evaluate(() => { (window as any).fail = true; }); await input.fill("question"); await input.press("Enter"); await page.getByRole("alert").waitFor();
      assert.equal(await input.inputValue(), "question", "failed question is available for retry");
      await page.evaluate(() => (window as any).back()); await page.getByRole("dialog").waitFor({ state: "hidden" }); assert.equal(await page.getByRole("dialog").count(), 0);
      await page.evaluate(() => { (window as any).unmount(); (window as any).mount(); }); await launcher.click(); assert.equal(await page.getByText("question", { exact: true }).count(), 0);
      const requests = await page.evaluate(() => (window as any).requests); assert.equal(requests[0].url, "https://hbic.ca/api/assistant"); assert.deepEqual(requests[0].body, { question: "contact", previousQuestions: [], language: "en" });
      await page.close();
    }
    console.log(`Native adapter screenshots (not real-device proof): ${qa}`);
  } finally { await browser.close(); }
});
test("native chat keeps its header below the safe area and input above a reduced keyboard viewport", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const platform of ["android", "ios"]) {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } }); await setup(page, platform);
      await page.getByRole("button", { name: "Open Bilal" }).click();
      await page.evaluate(() => { (window as any).keyboardHeight = 330; });
      await patch(page, "language", "en");
      const heading = await page.getByRole("heading", { name: "Bilal", exact: true }).boundingBox();
      const input = await page.getByRole("textbox", { name: "Your question" }).boundingBox();
      assert.ok(heading && heading.y >= 32, "Header must clear the top safe area, including with a keyboard");
      assert.ok(input && input.y + input.height <= 514, "Input must clear the reduced keyboard viewport");
      await page.close();
    }
  } finally { await browser.close(); }
});

test("native press feedback is finite, non-blocking and disabled by Reduced Motion", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const reduced of [false, true]) {
      const page = await browser.newPage(); await page.setContent("<div></div>");
      await page.evaluate(reduced => { (window as any).reducedMotion = reduced; }, reduced); await setup(page);
      const launcher = page.getByRole("button", { name: "Open Bilal" }); await launcher.waitFor();
      const before = await page.evaluate(() => (window as any).motionStarts ?? 0);
      await launcher.dispatchEvent("pointerdown"); await launcher.dispatchEvent("pointerup");
      const motion = await page.evaluate(() => ({ count: (window as any).motionStarts ?? 0, config: (window as any).motionConfig }));
      assert.equal(motion.count - before, reduced ? 0 : 2);
      if (!reduced) { assert.equal(motion.config.duration, 170); assert.equal(motion.config.useNativeDriver, true); assert.equal(motion.config.isInteraction, false); assert.equal(motion.config.toValue, 1); }
      await page.evaluate(() => (window as any).unmount()); await page.close();
    }
  } finally { await browser.close(); }
});

test("existing native installation automatically receives one tour only after fresh, idle Home content", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage(); await page.clock.install({ time: new Date("2026-10-17T18:00:00Z") }); await setup(page, "ios", false, false, false);
    const content = normalizeContent({ ...structuredClone(defaultContent), updatedAt: "2026-10-17T18:00:00Z", announcements: [], prayerTime: { ...defaultContent.prayerTime, date: "2026-10-17", fajr: "6:00 AM", sunrise: "8:00 AM", dhuhr: "1:30 PM", asr: "4:00 PM", maghrib: "6:30 PM", isha: "8:30 PM", source: "iqamah.ca" } });
    await patch(page, "content", content); await patch(page, "source", "cache"); await page.clock.runFor(10_000);
    assert.equal(await page.getByRole("dialog").count(), 0); assert.equal(await page.evaluate(() => (window as any).tourDisk), null);
    await patch(page, "source", "api"); await page.clock.runFor(6600); await page.getByRole("heading", { name: "Meet Bilal" }).waitFor();
    assert.equal(await page.evaluate(() => (window as any).companionActive()), true);
    await page.getByRole("button", { name: "Skip tour" }).click(); await page.getByRole("dialog").waitFor({ state: "hidden" });
    await page.clock.runFor(90_000); assert.equal(await page.getByRole("dialog").count(), 0);
    await page.evaluate(() => { (window as any).unmount(); (window as any).mount(); }); await page.clock.runFor(40_000);
    assert.equal(await page.getByRole("dialog").count(), 0);
  } finally { await browser.close(); }
});
test("native tour is translated, scrollable at large text, consumed once, replayable and interrupted by a notification", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const language of ["en", "ur", "fa-AF", "ar"]) {
      const page = await browser.newPage({ viewport: { width: 320, height: 568 } }); await setup(page, "android", true, false, false);
      await page.evaluate(() => { (window as any).textScale = 1.6; }); await patch(page, "language", language); await page.waitForTimeout(60);
      await page.getByTestId("bilal-companion-launcher").click();
      const dialog = page.getByRole("dialog"), next = dialog.getByRole("button").filter({ has: page.locator('span[aria-hidden="true"]') });
      // The primary step button is the only non-header button containing an arrow.
      for (let step = 0; step < 3; step++) {
        const primary = next.last(); await primary.scrollIntoViewIfNeeded(); await primary.click();
      }
      const input = dialog.getByRole("textbox"); await input.waitFor();
      await dialog.getByRole("button").nth(1).click();
      await dialog.getByRole("textbox").waitFor({ state: "hidden" });
      await page.evaluate(() => (window as any).notification()); await dialog.waitFor({ state: "hidden" });
      await page.getByTestId("bilal-companion-launcher").click(); await input.waitFor();
      await page.evaluate(() => { (window as any).unmount(); (window as any).mount(); }); await page.waitForTimeout(60);
      await page.getByTestId("bilal-companion-launcher").click(); await input.waitFor();
      assert.equal(await page.evaluate(() => (window as any).tourDisk), "hbic-bilal-welcome-2026-10-v1");
      await page.screenshot({ path: path.join(qa, `tour-${language}.png`) }); await page.close();
    }
  } finally { await browser.close(); }
});
test("native chat closes on notification/background, respects onboarding/remote switch and private routes, cleans listeners", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage(); await setup(page);
    const launcher = page.getByRole("button", { name: "Open Bilal" }); await launcher.click(); await page.evaluate(() => (window as any).notification()); await page.getByRole("dialog").waitFor({ state: "hidden" }); assert.equal(await page.getByRole("dialog").count(), 0);
    await launcher.click(); await page.evaluate(() => (window as any).appState("background")); await page.getByRole("dialog").waitFor({ state: "hidden" }); assert.equal(await launcher.count(), 0); assert.equal(await page.getByRole("dialog").count(), 0);
    await page.evaluate(() => (window as any).appState("active"));
    await patch(page, "focused", false); assert.equal(await launcher.count(), 0); assert.equal(await page.locator("#screen-content").count(), 1); await patch(page, "focused", true);
    for (const key of ["onboarding", "loading"]) { await patch(page, key, true); assert.equal(await launcher.count(), 0); await patch(page, key, false); }
    await launcher.click(); await patch(page, "enabled", false); assert.equal(await page.getByRole("dialog").count(), 0); await patch(page, "enabled", true);
    for (const route of ["/quran", "/quran/reader", "/quran-academy", "/donate", "/academy/check-in"]) { await patch(page, "pathname", route); assert.equal(await launcher.count(), 0, route); assert.equal(await page.locator("#screen-content").count(), 1, "Important screens remain mounted"); }
    await patch(page, "pathname", "/"); await launcher.click(); await page.evaluate(() => (window as any).unmount()); assert.equal(await page.evaluate(() => (window as any).companionActive()), false); assert.equal(await page.evaluate(() => (window as any).notificationListeners()), 0);
  } finally { await browser.close(); }
});
