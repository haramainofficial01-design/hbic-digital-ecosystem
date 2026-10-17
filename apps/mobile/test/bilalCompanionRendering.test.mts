import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { chromium, type Page } from "playwright";
import path from "node:path";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";

const root = path.resolve(import.meta.dirname, "../../.."), qa = mkdtempSync(path.join(tmpdir(), "hbic-companion-native-adapters-"));
// Real component/effects/client with explicit native UI adapters. Not physical-device proof.
const native = `import React,{forwardRef,useEffect,useImperativeHandle,useRef}from'react';
const flat=s=>Array.isArray(s)?Object.assign({},...s.map(flat)):s||{};
const css=s=>{const x={...flat(s)};for(const key of ['padding','margin']){if(x[key+'Horizontal']!==undefined){x[key+'Left']=x[key+'Right']=x[key+'Horizontal'];delete x[key+'Horizontal']}if(x[key+'Vertical']!==undefined){x[key+'Top']=x[key+'Bottom']=x[key+'Vertical'];delete x[key+'Vertical']}}if(x.fontSize)x.fontSize*=window.textScale||1;if(x.lineHeight)x.lineHeight=(x.lineHeight*(window.textScale||1))+'px';return x};
export const Platform={OS:window.platform};export const useWindowDimensions=()=>({width:window.innerWidth,height:window.innerHeight});export const StyleSheet={create:x=>x,absoluteFillObject:{position:'absolute',inset:0}};
export const View=({children,style:s})=><div style={{display:'flex',position:'relative',flexDirection:'column',minWidth:0,...css(s)}}>{children}</div>;
export const Text=({children,style:s,accessibilityRole})=><div role={accessibilityRole==='header'?'heading':accessibilityRole==='alert'?'alert':undefined} style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',...css(s)}}>{children}</div>;
export const TextInput=forwardRef(({value,onChangeText,onSubmitEditing,accessibilityLabel,placeholder,editable,style:s},ref)=><input ref={ref} aria-label={accessibilityLabel} placeholder={placeholder} value={value} disabled={editable===false} onChange={e=>onChangeText(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')onSubmitEditing()}} style={{border:0,background:'transparent',...css(s)}}/>);
export const Pressable=({children,onPress,accessibilityLabel,accessibilityRole,disabled,style:s,testID})=><button data-testid={testID} role={accessibilityRole==='link'?'link':undefined} aria-label={accessibilityLabel} disabled={disabled} onClick={onPress} style={{display:'flex',position:'relative',backgroundColor:'transparent',cursor:'pointer',font:'inherit',...css(typeof s==='function'?s({pressed:false}):s)}}>{children}</button>;
export const ScrollView=forwardRef(({children,style:s,contentContainerStyle,onContentSizeChange},ref)=>{const el=useRef();useImperativeHandle(ref,()=>({scrollToEnd(){el.current?.scrollTo(0,el.current.scrollHeight)}}));useEffect(()=>{onContentSizeChange?.()},[children]);return <div ref={el} style={{overflowY:'auto',...css(s)}}><div style={{display:'flex',flexDirection:'column',...css(contentContainerStyle)}}>{children}</div></div>});
export const KeyboardAvoidingView=({children,style:s})=><div style={{display:'flex',flexDirection:'column',height:'100dvh',...css(s)}}>{children}</div>;
export const Modal=({visible,children,onRequestClose,onShow})=>{useEffect(()=>{window.back=onRequestClose;if(visible)onShow?.()},[visible]);return visible?<div role='dialog' style={{position:'fixed',inset:0,zIndex:100}}>{children}</div>:null};
export const AccessibilityInfo={isReduceMotionEnabled:async()=>true,addEventListener:()=>({remove(){}})};
const listeners=new Set();export const AppState={currentState:'active',addEventListener(_,fn){listeners.add(fn);return{remove(){listeners.delete(fn)}}}};window.appState=s=>listeners.forEach(fn=>fn(s));
export const Linking={openURL:async url=>{window.opened.push(url);if(window.linkError)throw Error('offline')}};`;

async function bundle() {
  const result = await build({ bundle: true, write: false, format: "iife", platform: "browser", jsx: "automatic", define: { "process.env.NODE_ENV": '"production"', "process.env.EXPO_PUBLIC_API_URL": '"https://hbic.ca"' }, stdin: { resolveDir: root, loader: "tsx", contents: `import React,{useState}from'react';import{createRoot}from'react-dom/client';import{flushSync}from'react-dom';import{BilalCompanion}from'./apps/mobile/src/companion/BilalCompanion';import{getCompanionActive}from'./apps/mobile/src/companion/activity';window.companionActive=getCompanionActive;function Harness(){const[tick,set]=useState(0);window.patch=(key,value)=>flushSync(()=>{window.fixture[key]=value;set(x=>x+1)});return <BilalCompanion/>}let root;window.mount=()=>{root=createRoot(document.getElementById('root'));flushSync(()=>root.render(<Harness/>))};window.unmount=()=>flushSync(()=>root.unmount());window.mount();` }, plugins: [{ name: "native-companion-adapters", setup(b) {
    b.onResolve({ filter: /^react-native$|^react-native-safe-area-context$|^@expo\/vector-icons$|^expo-router$|^expo-notifications$/ }, args => ({ path: args.path, namespace: "fixture" }));
    for (const name of ["ThemeProvider", "LanguageProvider", "OnboardingProvider", "services/content", "quran/macRuntime"]) b.onResolve({ filter: new RegExp(`${name}$`) }, () => ({ path: name, namespace: "fixture" }));
    b.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ loader: "tsx", resolveDir: root, contents: {
      "react-native": native,
      "react-native-safe-area-context": "export const useSafeAreaInsets=()=>({top:20,bottom:20,left:0,right:0})",
      "@expo/vector-icons": "import React from'react';export const Ionicons=()=> <span aria-hidden='true' style={{width:20,height:20}}>◌</span>",
      "expo-router": "export const usePathname=()=>window.fixture.pathname",
      "expo-notifications": "const received=new Set(),tapped=new Set();export const addNotificationReceivedListener=fn=>{received.add(fn);return{remove(){received.delete(fn)}}};export const addNotificationResponseReceivedListener=fn=>{tapped.add(fn);return{remove(){tapped.delete(fn)}}};window.notification=()=>received.forEach(fn=>fn());window.notificationListeners=()=>received.size+tapped.size",
      ThemeProvider: `import{lightTheme,darkTheme}from'${root}/apps/mobile/src/theme/theme';export const useAppTheme=()=>({theme:window.dark?darkTheme:lightTheme})`,
      LanguageProvider: "export const useAppLanguage=()=>({language:window.fixture.language,translate:x=>x})",
      OnboardingProvider: "export const useOnboarding=()=>({active:window.fixture.onboarding})",
      "services/content": "export const usePublishedContent=()=>({loading:window.fixture.loading,content:{featureFlags:{bilalCompanionEnabled:window.fixture.enabled}}})",
      "quran/macRuntime": "export const isMacQuranHost=window.mac"
    }[args.path] ?? "" }));
  } }] });
  return result.outputFiles[0].text;
}
const bundled = bundle();
async function setup(page: Page, platform = "android", dark = false, mac = false) {
  page.setDefaultTimeout(5000);
  page.on("pageerror", error => console.error("Native-adapter error:", error.message));
  await page.setContent("<style>html,body{margin:0;font-family:system-ui}*{box-sizing:border-box}button{border:0}</style><div id='root'></div>");
  await page.evaluate(({ platform, dark, mac }) => {
    Object.assign(window, { platform, dark, mac, opened: [], requests: [], fixture: { pathname: "/", loading: false, onboarding: false, enabled: true, language: "en" }, fail: false });
    window.fetch = async (_, init) => { const w = window as any; w.requests.push({ url: String(_), body: JSON.parse(String(init?.body)) }); return Response.json(w.fail ? { ok: false } : { ok: true, answer: "Verified public answer.", sources: [{ id: "contact", title: "Source page", href: "https://hbic.ca/contact" }, { id: "bad", title: "Unsafe link", href: "https://untrusted.test" }], asOf: "2026-10-17T16:00:00Z", mode: "published-info" }, { status: w.fail ? 503 : 200 }); };
  }, { platform, dark, mac });
  await page.addScriptTag({ content: await bundled });
}
async function patch(page: Page, key: string, value: unknown) { await page.evaluate(([key, value]) => (window as any).patch(key, value), [key, value]); }

test("iOS/Android/Mac native component actions, bounded layout, sources, clearing and session-only lifecycle", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const [platform, width, height, dark, mac] of [["ios",390,844,false,false],["android",320,568,true,false],["ios",1440,900,true,true]] as const) {
      const page = await browser.newPage({ viewport: { width, height } }); await setup(page, platform, dark, mac);
      const launcher = page.getByRole("button", { name: "Open Bilal Companion" }); assert.equal(await page.getByRole("dialog").count(), 0);
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
      const requests = await page.evaluate(() => (window as any).requests); assert.equal(requests[0].url, "https://hbic.ca/api/assistant"); assert.deepEqual(requests[0].body, { question: "contact", previousQuestions: [] });
      await page.close();
    }
    console.log(`Native adapter screenshots (not real-device proof): ${qa}`);
  } finally { await browser.close(); }
});
test("native chat closes on notification/background, respects onboarding/remote switch and private routes, cleans listeners", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage(); await setup(page);
    const launcher = page.getByRole("button", { name: "Open Bilal Companion" }); await launcher.click(); await page.evaluate(() => (window as any).notification()); await page.getByRole("dialog").waitFor({ state: "hidden" }); assert.equal(await page.getByRole("dialog").count(), 0);
    await launcher.click(); await page.evaluate(() => (window as any).appState("background")); await launcher.waitFor({ state: "hidden" }); assert.equal(await page.getByRole("dialog").count(), 0);
    await page.evaluate(() => (window as any).appState("active"));
    for (const key of ["onboarding", "loading"]) { await patch(page, key, true); assert.equal(await launcher.count(), 0); await patch(page, key, false); }
    await launcher.click(); await patch(page, "enabled", false); assert.equal(await page.getByRole("dialog").count(), 0); await patch(page, "enabled", true);
    for (const route of ["/quran", "/quran/reader", "/quran-academy", "/donate", "/academy/check-in"]) { await patch(page, "pathname", route); assert.equal(await launcher.count(), 0, route); }
    await patch(page, "pathname", "/"); await launcher.click(); await page.evaluate(() => (window as any).unmount()); assert.equal(await page.evaluate(() => (window as any).companionActive()), false); assert.equal(await page.evaluate(() => (window as any).notificationListeners()), 0);
  } finally { await browser.close(); }
});
