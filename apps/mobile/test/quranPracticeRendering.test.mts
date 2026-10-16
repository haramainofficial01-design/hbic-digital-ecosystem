/** Real practice-component UI/wiring QA with explicit native/recording adapters.
 * No microphone, actual recognition, native screenshot or accuracy claim. */
import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { chromium } from "playwright";
import { resolve } from "node:path";
import { mkdirSync } from "node:fs";

const root = resolve(import.meta.dirname, "../../..");
const native = `import React from'react';
const flat=s=>Array.isArray(s)?Object.assign({},...s.filter(Boolean).map(flat)):s||{};
function css(value,view){const s=flat(typeof value==='function'?value({pressed:false}):value);if(view){s.display='flex';s.flexDirection=s.flexDirection||'column';s.flexShrink=s.flexShrink??0}for(const [a,b,c]of[['paddingHorizontal','paddingLeft','paddingRight'],['paddingVertical','paddingTop','paddingBottom'],['marginVertical','marginTop','marginBottom']])if(s[a]!=null){s[b]=s[c]=s[a];delete s[a]}if(s.flex!=null)s.flex=s.flex+' 1 0%';if(typeof s.lineHeight==='number')s.lineHeight=s.lineHeight+'px';if(s.borderWidth!=null||s.borderBottomWidth!=null)s.borderStyle='solid';delete s.transform;return s}
export const View=({children,style,testID,accessibilityLabel,accessibilityRole,accessibilityValue})=><div data-testid={testID} aria-label={accessibilityLabel} role={accessibilityRole} aria-valuenow={accessibilityValue?.now} aria-valuemax={accessibilityValue?.max} style={css(style,true)}>{children}</div>;
export const Animated={View};
export const AccessibilityInfo={isReduceTransparencyEnabled:async()=>true,addEventListener:()=>({remove(){}})};
export const Text=({children,style,accessibilityLabel,accessibilityRole})=><span aria-label={accessibilityLabel} role={accessibilityRole} style={css(style,false)}>{children}</span>;
export const TextInput=({value,onChangeText,style,accessibilityLabel,editable=true})=><input aria-label={accessibilityLabel} value={value} disabled={!editable} onChange={e=>onChangeText?.(e.target.value)} style={css(style,false)}/>;
export const Pressable=({children,style,accessibilityLabel,accessibilityRole,accessibilityState,disabled,onPress})=><button type='button' role={accessibilityRole||'button'} aria-label={accessibilityLabel} aria-checked={accessibilityState?.checked} aria-selected={accessibilityState?.selected} disabled={disabled} onClick={onPress} style={css(style,true)}>{children}</button>;
export const Switch=({accessibilityLabel,value,disabled,onValueChange})=><input type='checkbox' role='switch' aria-label={accessibilityLabel} checked={value} disabled={disabled} onChange={e=>onValueChange?.(e.target.checked)}/>;
export const ActivityIndicator=()=> <span role='status'>Loading</span>;
export const StyleSheet={create:s=>s,hairlineWidth:1};`;

async function bundle() {
  const out = await build({ write: false, bundle: true, platform: "browser", format: "iife", jsx: "automatic",
    define: { "process.env.NODE_ENV": '"production"', "process.env.EXPO_PUBLIC_RECITE_ASSIST_ENABLED": '"true"', "__DEV__": "false" },
    stdin: { resolveDir: root, loader: "tsx", contents: `import React,{useCallback,useState}from'react';import{createRoot}from'react-dom/client';
import{QuranPractice}from'./apps/mobile/src/quran/QuranPractice';import{emptyQuranState}from'@hbic/shared';
import data from'./apps/mobile/assets/quran/tanzil-uthmani.json';
const chapter={id:1,nameSimple:'Al-Fatihah',nameArabic:'الفاتحة',versesCount:7};
const getVerse=async ayah=>{if(window.qaHoldAyahs?.includes(ayah))await new Promise(resolve=>(window.qaPendingVerses??=[]).push({ayah,resolve}));return({...data.chapters[0].verses[ayah-1],verseNumber:ayah,verseKey:'1:'+ayah,audioUrl:'https://example.invalid/ui-only.wav',translation:'UI translation fixture',translationName:'Saheeh International'});};
function Fixture(){const[state,setState]=useState(emptyQuranState());window.qaState=state;
const update=useCallback(async transform=>{setState(s=>transform(s))},[]);
const library={ready:true,library:state,update,memorize:async()=>{window.qaReviewed=true}};
const audio={stop:()=>{window.qaPlaybackStopped=(window.qaPlaybackStopped||0)+1},start:async()=>{window.qaReferencePlays=(window.qaReferencePlays||0)+1},playRecording:async()=>{window.qaRecordingPlays=true}};
return <QuranPractice mode={window.qaMode||'practice'} chapter={chapter} getVerse={getVerse} library={library} audio={audio} fontLoaded={false} onReviewLibrary={()=>window.qaLibraryOpened=true} onCaptureActivity={active=>window.qaCaptureActive=active}/>}
createRoot(document.getElementById('root')).render(<Fixture/>);` }, plugins: [{name: "explicit-practice-ui-adapters", setup(b) {
      b.onResolve({filter: /^react-native$/}, () => ({path: "native", namespace: "qa"}));
      b.onResolve({filter: /i18n\/LocalizedText$/}, () => ({path: "text", namespace: "qa"}));
      b.onResolve({filter: /i18n\/LanguageProvider$/}, () => ({path: "language", namespace: "qa"}));
      b.onResolve({filter: /theme\/ThemeProvider$/}, () => ({path: "theme", namespace: "qa"}));
      b.onResolve({filter: /^@expo\/vector-icons$/}, () => ({path: "icons", namespace: "qa"}));
      b.onResolve({filter: /macRuntime$/}, () => ({path: "mac", namespace: "qa"}));
      b.onResolve({filter: /NativeGlassSurface$/}, () => ({path: "glass", namespace: "qa"}));
      b.onResolve({filter: /useQuranTransition$/}, () => ({path: "transition", namespace: "qa"}));
      b.onResolve({filter: /^\.\/useQuranRecording$/}, () => ({path: "recording", namespace: "qa"}));
      b.onResolve({filter: /^\.\/ReciteAssist$/}, () => ({path: "assist", namespace: "qa"}));
      b.onLoad({filter: /.*/, namespace: "qa"}, args => ({loader: "tsx", resolveDir: root, contents: args.path === "native" ? native
        : args.path === "text" ? `export{Text,TextInput}from'react-native';`
        : args.path === "language" ? `export const useAppLanguage=()=>({translate:s=>s});`
        : args.path === "theme" ? `import{lightTheme,darkTheme}from'${resolve(root, "apps/mobile/src/theme/theme.ts")}';export const useAppTheme=()=>({theme:window.qaDark?darkTheme:lightTheme});`
        : args.path === "mac" ? `export const isMacQuranHost=false;`
        : args.path === "glass" ? `export{View as NativeGlassSurface}from'react-native';`
        : args.path === "transition" ? `export const useQuranTransition=()=>({opacity:1});`
        : args.path === "icons" ? `import React from'react';export const Ionicons=()=> <span aria-hidden='true'>◇</span>;`
        : args.path === "recording" ? `import{useState}from'react';export function useQuranRecording(){const[phase,setPhase]=useState('idle');return{phase,error:null,temporary:null,accept:async()=>{},start:async()=>{window.qaAudioStarts=(window.qaAudioStarts||0)+1;setPhase('recording')},stop:async()=>{setPhase('idle')},keepTemporary:async()=>{},eraseTemporary:async()=>{}}}`
        : `import React,{useEffect,useState}from'react';export default function Assist({verse,onAdvance,onBusyChange,blocked,saveAudio,concealed,testMode,stopPlayback,onFeedback,onReview}){const[busy,setBusy]=useState(false);useEffect(()=>{window.qaAssistMounts=(window.qaAssistMounts||0)+1;return()=>window.qaAssistUnmounts=(window.qaAssistUnmounts||0)+1},[]);window.qaConcealed=concealed;window.qaAssistVerseKey=verse.verseKey;window.qaAssistBlocked=blocked;window.qaAdvance=onAdvance;window.qaFeedback=(key,feedback)=>onFeedback?.(key,feedback);window.qaReview=(feedback)=>onReview?.(verse.verseKey,'fixture-attempt',feedback);return <div aria-label='Recite Assist UI adapter'><button disabled={blocked&&!busy} onClick={()=>{if(!busy)stopPlayback();setBusy(!busy);onBusyChange(!busy);window.qaAssistStarts=(window.qaAssistStarts||0)+(busy?0:1)}}>{busy?'Stop Recitation':testMode?'Start Recitation Test':saveAudio?'Recite and Record':'Start Recite Assist'}</button></div>}` }));
    } }] });
  return out.outputFiles[0].text;
}

test("practice has one selected capture path, persistent recording choice and no mode change while busy", async () => {
  const script = await bundle(), browser = await chromium.launch({headless: true});
  try {
    for (const width of [320, 390, 768, 1280]) for (const dark of [false, true]) {
      const page = await browser.newPage({viewport: {width, height: 900}}), errors: string[] = [];
      page.on("pageerror", error => errors.push(error.message));
      try {
        await page.setContent(`<style>*{box-sizing:border-box}body{margin:0;padding:12px;font-family:system-ui}button{font:inherit;border:0;cursor:pointer}input{min-width:0}</style><div id='root'></div><script>window.qaDark=${dark};${script}</script>`);
        await page.getByRole("button", {name: "Start Recite Assist", exact: true}).waitFor();
        assert.equal(await page.getByRole("button", {name: "Record audio only", exact: true}).count(), 0);
        assert.equal(await page.evaluate(() => (window as any).qaAssistStarts ?? 0), 0);
        assert.equal(await page.evaluate(() => (window as any).qaAudioStarts ?? 0), 0);
        await page.getByRole("switch", {name: "Save a Recite Assist recording"}).check();
        await page.getByRole("button", {name: "Recite and Record", exact: true}).waitFor();
        assert.equal(await page.evaluate(() => (window as any).qaState.preferences.saveAssistAudio), true);
        await page.getByRole("button", {name: "Recite and Record", exact: true}).click();
        assert.ok(await page.getByRole("radio", {name: "Audio Only", exact: true}).isDisabled());
        assert.ok(await page.getByRole("switch", {name: "Save a Recite Assist recording"}).isDisabled());
        assert.equal(await page.evaluate(() => (window as any).qaCaptureActive), true);
        await page.getByRole("button", {name: "Stop Recitation", exact: true}).click();
        await page.getByRole("radio", {name: "Audio Only", exact: true}).click();
        await page.getByRole("button", {name: "Record audio only", exact: true}).waitFor();
        assert.equal(await page.getByRole("button", {name: "Recite and Record", exact: true}).count(), 0);
        await page.getByRole("button", {name: "Record audio only", exact: true}).click();
        assert.ok(await page.getByRole("radio", {name: "Word Tracking", exact: true}).isDisabled());
        assert.equal(await page.evaluate(() => (window as any).qaAudioStarts), 1);
        await page.getByRole("button", {name: "Stop and review recording", exact: true}).click();
        await page.getByRole("radio", {name: "Word Tracking", exact: true}).click();
        await page.getByRole("button", {name: "Recite and Record", exact: true}).waitFor();
        await page.getByRole("button", {name: "Open My Library · recordings and word review", exact: true}).click();
        assert.equal(await page.evaluate(() => (window as any).qaLibraryOpened), true);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Overflow at ${width}/${dark}`);
        assert.deepEqual(errors, []);
      } finally {await page.close();}
    }
  } finally {await browser.close();}
});

test("self-test still hides its ayah, supports hints/reveal and prevents recording before starting a question", async () => {
  const script = await bundle(), browser = await chromium.launch({headless: true});
  const page = await browser.newPage({viewport: {width: 390, height: 900}});
  try {
    await page.setContent(`<style>*{box-sizing:border-box}body{margin:0;font-family:system-ui}button{font:inherit;border:0}input{min-width:0}</style><div id='root'></div><script>window.qaMode='test';${script}</script>`);
    await page.getByRole("button", {name: "Start self-test", exact: true}).waitFor();
    await page.getByRole("radio", {name: "Audio Only", exact: true}).click();
    assert.ok(await page.getByRole("button", {name: "Record audio only", exact: true}).isDisabled());
    await page.getByRole("radio", {name: "Word Tracking", exact: true}).click();
    await page.getByRole("button", {name: "Start self-test", exact: true}).click();
    await page.getByRole("button", {name: "Start Recitation Test", exact: true}).waitFor();
    assert.equal(await page.evaluate(() => (window as any).qaConcealed), true);
    await page.getByRole("button", {name: "Word hint", exact: true}).click();
    assert.equal(await page.evaluate(() => (window as any).qaConcealed), true);
    await page.getByRole("button", {name: "Reveal ayah", exact: true}).click();
    assert.equal(await page.evaluate(() => (window as any).qaConcealed), false);
    await page.getByRole("button", {name: "Recalled · next", exact: true}).click();
    assert.equal(await page.evaluate(() => (window as any).qaReviewed), true);
    assert.equal(await page.evaluate(() => (window as any).qaConcealed), true);
  } finally {await page.close(); await browser.close();}
});

test("manual and self-test selection cannot start word tracking against the previous ayah while loading", async () => {
  const script = await bundle(), browser = await chromium.launch({headless: true});
  try { for (const mode of ["practice", "test"]) {
    const page = await browser.newPage({viewport: {width: 390, height: 900}});
    try {
      await page.setContent(`<div id='root'></div><script>window.qaMode=${JSON.stringify(mode)};${script}</script>`);
      if (mode === "practice") await page.getByRole("button", {name: "Start Recite Assist", exact: true}).waitFor();
      else await page.getByRole("button", {name: "Word hint", exact: true}).waitFor();
      await page.waitForFunction(() => Boolean((window as any).qaState));
      // With three questions, a zero Fisher-Yates draw selects ayah 2 first.
      await page.evaluate(() => { (window as any).qaHoldAyahs = [2]; Math.random = () => 0; });
      await page.getByRole("button", {name: mode === "practice" ? "Next ayah" : "Start self-test", exact: true}).click();
      await page.waitForFunction(() => (window as any).qaPendingVerses?.some((row: any) => row.ayah === 2));
      const start = page.getByRole("button", {name: mode === "practice" ? "Start Recite Assist" : "Start Recitation Test", exact: true});
      assert.ok(await start.isDisabled());
      assert.equal(await page.evaluate(() => (window as any).qaAssistVerseKey), "1:1");
      assert.equal(await page.evaluate(() => (window as any).qaAssistStarts ?? 0), 0);
      assert.ok(await page.getByRole("status").count() > 0);
      await page.evaluate(() => { const qa = window as any; qa.qaHoldAyahs = []; qa.qaPendingVerses.splice(0).forEach((row: any) => row.resolve()); });
      await page.waitForFunction(() => (window as any).qaAssistVerseKey === "1:2" && !(window as any).qaAssistBlocked);
      assert.ok(await start.isEnabled());
      await start.click();
      assert.equal(await page.evaluate(() => (window as any).qaAssistStarts), 1);
      assert.equal(await page.evaluate(() => (window as any).qaCaptureActive), true);
      await page.getByRole("button", {name: "Stop Recitation", exact: true}).click();
    } finally { await page.close(); }
  }} finally { await browser.close(); }
});

test("automatic next-ayah loading preserves the mounted capture path until the requested text resolves", async () => {
  const script = await bundle(), browser = await chromium.launch({headless: true});
  const page = await browser.newPage({viewport: {width: 390, height: 900}});
  try {
    await page.setContent(`<div id='root'></div><script>${script}</script>`);
    await page.getByRole("button", {name: "Start Recite Assist", exact: true}).click();
    await page.evaluate(() => {
      const qa = window as any; qa.qaHoldAyahs = [2];
      qa.qaAdvancePromise = qa.qaAdvance(new AbortController().signal);
    });
    await page.waitForFunction(() => (window as any).qaPendingVerses?.some((row: any) => row.ayah === 2));
    assert.ok(await page.getByRole("button", {name: "Stop Recitation", exact: true}).isEnabled());
    assert.equal(await page.evaluate(() => (window as any).qaCaptureActive), true);
    assert.equal(await page.evaluate(() => (window as any).qaAssistMounts), 1);
    assert.equal(await page.evaluate(() => (window as any).qaAssistUnmounts ?? 0), 0);
    assert.equal(await page.evaluate(() => (window as any).qaAssistVerseKey), "1:1");
    await page.evaluate(() => { const qa = window as any; qa.qaHoldAyahs = []; qa.qaPendingVerses.splice(0).forEach((row: any) => row.resolve()); });
    await page.waitForFunction(() => (window as any).qaAssistVerseKey === "1:2");
    assert.equal(await page.evaluate(() => (window as any).qaCaptureActive), true);
    assert.equal(await page.evaluate(() => (window as any).qaAssistMounts), 1);
    assert.equal(await page.evaluate(() => (window as any).qaAssistStarts), 1);
    await page.getByRole("button", {name: "Stop Recitation", exact: true}).click();
  } finally { await page.close(); await browser.close(); }
});

test("flashcards show only current-verse cues, keep hidden text concealed, and temporary tests do not save flags", async () => {
  const script = await bundle(), browser = await chromium.launch({headless: true});
  const out = resolve(root, "output/release-1.7.7/ui"); mkdirSync(out, {recursive: true});
  try {for (const width of [320, 390, 1280]) for (const dark of [false, true]) {
    const page = await browser.newPage({viewport: {width, height: 950}});
    try {
      await page.setContent(`<style>*{box-sizing:border-box}body{margin:0;padding:12px;font-family:system-ui;background:${dark ? "#031827" : "#F2FBFC"}}button{font:inherit;border:0}input{min-width:0}</style><div id='root'></div><script>window.qaMode='test';window.qaDark=${dark};${script}</script>`);
      await page.getByRole("button", {name: "Edit passage & options", exact: true}).click();
      await page.getByRole("switch").first().check();
      await page.getByRole("button", {name: "Start self-test", exact: true}).click();
      await page.getByRole("button", {name: "Start Recitation Test", exact: true}).waitFor();
      const feedback = await page.evaluate(() => {
        const key = (window as any).qaAssistVerseKey;
        // Explicit presentation fixtures, never model/real-voice evidence.
        return {key, feedback: {status: "possible_difference", attempted: 3, stableComplete: false, followingIndex: 1,
          words: Array.from(document.querySelectorAll("[data-testid^='quran-practice-word-']")).map(x => ({text: x.textContent?.replace("◇", ""), state: "matched"})),
          differences: [{kind: "repetition", index: 1}]}};
      });
      assert.equal(await page.getByLabel("Canonical Quran text").count(), 0, "listening must not reveal hidden canonical words");
      await page.getByRole("button", {name: "Reveal ayah", exact: true}).click();
      const canonical = await page.locator("[data-testid^='quran-practice-word-'] > span:first-child").allTextContents();
      feedback.feedback.words = canonical.map(text => ({text, state: "matched"}));
      await page.evaluate(({key, feedback}) => { (window as any).qaFeedback(key, feedback); (window as any).qaReview(feedback); }, feedback);
      await page.getByLabel(`${canonical[1]} · Possible word difference`, {exact: true}).waitFor();
      assert.equal(await page.evaluate(() => (window as any).qaState.mistakes.length), 0, "temporary tests must not save word flags");
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Overflow at ${width}/${dark}`);
      if (width === 390 || width === 1280) await page.screenshot({path: resolve(out, `practice-card-${width}-${dark ? "dark" : "light"}.png`), fullPage: true});
      await page.evaluate(({key, feedback}) => (window as any).qaFeedback(key === "1:1" ? "1:2" : "1:1", feedback), feedback);
      assert.equal(await page.getByLabel(`${canonical[1]} · Possible word difference`, {exact: true}).count(), 0, "a mismatched ayah cannot keep a current-word cue");
    } finally {await page.close();}
  }} finally {await browser.close();}
});
