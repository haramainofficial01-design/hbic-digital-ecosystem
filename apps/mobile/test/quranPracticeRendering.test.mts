/** Real practice-component UI/wiring QA with explicit native/recording adapters.
 * No microphone, actual recognition, native screenshot or accuracy claim. */
import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { chromium } from "playwright";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../../..");
const native = `import React from'react';
const flat=s=>Array.isArray(s)?Object.assign({},...s.filter(Boolean).map(flat)):s||{};
function css(value,view){const s=flat(typeof value==='function'?value({pressed:false}):value);if(view){s.display='flex';s.flexDirection=s.flexDirection||'column'}for(const [a,b,c]of[['paddingHorizontal','paddingLeft','paddingRight'],['paddingVertical','paddingTop','paddingBottom'],['marginVertical','marginTop','marginBottom']])if(s[a]!=null){s[b]=s[c]=s[a];delete s[a]}if(s.flex!=null)s.flex=s.flex+' 1 0%';delete s.transform;return s}
export const View=({children,style})=><div style={css(style,true)}>{children}</div>;
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
const getVerse=async ayah=>({...data.chapters[0].verses[ayah-1],verseNumber:ayah,verseKey:'1:'+ayah,audioUrl:'https://example.invalid/ui-only.wav',translation:'UI translation fixture',translationName:'Saheeh International'});
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
      b.onResolve({filter: /^\.\/useQuranRecording$/}, () => ({path: "recording", namespace: "qa"}));
      b.onResolve({filter: /^\.\/ReciteAssist$/}, () => ({path: "assist", namespace: "qa"}));
      b.onLoad({filter: /.*/, namespace: "qa"}, args => ({loader: "tsx", resolveDir: root, contents: args.path === "native" ? native
        : args.path === "text" ? `export{Text,TextInput}from'react-native';`
        : args.path === "language" ? `export const useAppLanguage=()=>({translate:s=>s});`
        : args.path === "theme" ? `import{lightTheme,darkTheme}from'${resolve(root, "apps/mobile/src/theme/theme.ts")}';export const useAppTheme=()=>({theme:window.qaDark?darkTheme:lightTheme});`
        : args.path === "mac" ? `export const isMacQuranHost=false;`
        : args.path === "icons" ? `import React from'react';export const Ionicons=()=> <span aria-hidden='true'>◇</span>;`
        : args.path === "recording" ? `import{useState}from'react';export function useQuranRecording(){const[phase,setPhase]=useState('idle');return{phase,error:null,temporary:null,accept:async()=>{},start:async()=>{window.qaAudioStarts=(window.qaAudioStarts||0)+1;setPhase('recording')},stop:async()=>{setPhase('idle')},keepTemporary:async()=>{},eraseTemporary:async()=>{}}}`
        : `import React,{useState}from'react';export default function Assist({onBusyChange,blocked,saveAudio,concealed,testMode,stopPlayback}){const[busy,setBusy]=useState(false);window.qaConcealed=concealed;return <div aria-label='Recite Assist UI adapter'><button disabled={blocked} onClick={()=>{if(!busy)stopPlayback();setBusy(!busy);onBusyChange(!busy);window.qaAssistStarts=(window.qaAssistStarts||0)+(busy?0:1)}}>{busy?'Stop Recitation':testMode?'Start Recitation Test':saveAudio?'Recite and Record':'Start Recite Assist'}</button></div>}` }));
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
