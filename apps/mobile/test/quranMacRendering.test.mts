import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { chromium } from "playwright";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../../..");
const nativeAdapter = `import React from 'react';
function flatten(value){return Array.isArray(value)?Object.assign({},...value.filter(Boolean).map(flatten)):value||{}}
function css(value,container){const s=flatten(typeof value==='function'?value({pressed:false}):value);if(container){s.display='flex';s.flexDirection=s.flexDirection||'column'}if(s.paddingHorizontal!=null){s.paddingLeft=s.paddingRight=s.paddingHorizontal;delete s.paddingHorizontal}if(s.paddingVertical!=null){s.paddingTop=s.paddingBottom=s.paddingVertical;delete s.paddingVertical}if(s.marginHorizontal!=null){s.marginLeft=s.marginRight=s.marginHorizontal;delete s.marginHorizontal}if(s.marginVertical!=null){s.marginTop=s.marginBottom=s.marginVertical;delete s.marginVertical}if(s.flex!=null)s.flex=s.flex+' 1 0%';return s}
export function View({children,style,accessibilityLabel,accessibilityRole}){return React.createElement('div',{'aria-label':accessibilityLabel,role:accessibilityRole,style:css(style,true)},children)}
export function Text({children,style,numberOfLines}){return React.createElement('span',{style:{...css(style,false),...(numberOfLines===1?{whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}:{})}},children)}
export function TextInput({accessibilityLabel,onChangeText,style,...p}){delete p.autoCorrect;return React.createElement('input',{...p,'aria-label':accessibilityLabel,onChange:e=>onChangeText?.(e.target.value),style:css(style,false)})}
export function Pressable({children,style,onPress,accessibilityLabel,accessibilityRole,accessibilityState,disabled}){return React.createElement('button',{type:'button',onClick:onPress,'aria-label':accessibilityLabel,role:accessibilityRole,'aria-selected':accessibilityState?.selected,disabled,style:css(style,true)},children)}
export function FlatList({ListHeaderComponent,data,renderItem,keyExtractor,style,accessibilityLabel}){return React.createElement('div',{'aria-label':accessibilityLabel,style:{...css(style,true),overflowY:'auto'}},ListHeaderComponent,...data.map((item,index)=>React.createElement(React.Fragment,{key:keyExtractor(item,index)},renderItem({item,index}))))}
export function ScrollView({children,style,contentContainerStyle,accessibilityLabel}){return React.createElement('div',{'aria-label':accessibilityLabel,style:{...css(style,true),overflowY:'auto'}},React.createElement('div',{style:css(contentContainerStyle,true)},children))}
export const StyleSheet={create:s=>s,hairlineWidth:1};
export const AccessibilityInfo={isReduceTransparencyEnabled:async()=>window.qaOpaque,addEventListener:(_,fn)=>{window.qaTransparency=fn;return{remove(){window.qaTransparency=null}}}};`;

async function renderBundle() {
  const result = await build({ write: false, bundle: true, platform: "browser", format: "iife", jsx: "automatic", define: { "process.env.NODE_ENV": '"production"' },
    stdin: { resolveDir: root, loader: "tsx", contents: `import React,{useState}from'react';import{createRoot}from'react-dom/client';
import{QuranMacSidebar,QuranMacToolbar,QuranMacCompactNavigation,QuranMacInspector}from'./apps/mobile/src/quran/QuranMacWorkspace';
import{quranWorkspaceLayout}from'./apps/mobile/src/quran/workspaceLayout';
const chapters=[{id:1,nameSimple:'Al-Fatihah',nameArabic:'الفاتحة',versesCount:7,translatedName:{name:'The Opening'}},{id:2,nameSimple:'Al-Baqarah',nameArabic:'البقرة',versesCount:286,translatedName:{name:'The Cow'}}];
function Fixture(){const[mode,setMode]=useState('read'),[side,setSide]=useState(true),[inspect,setInspect]=useState(true),[focus,setFocus]=useState(false),[book,setBook]=useState(false);const layout=quranWorkspaceLayout(innerWidth,'mac'),showSide=layout.sidebar&&side&&!focus,showInspector=layout.inspector&&inspect&&!focus&&mode==='read';window.qaMode=mode;
const open=(chapter)=>{window.qaOpened=chapter;setMode('read')};
return <div style={{display:'flex',height:'100vh',background:window.qaDark?'#031827':'#F2FBFC'}}>
{showSide&&<QuranMacSidebar chapters={chapters} chapterId={1} mode={mode} onMode={setMode} onOpen={open} onBack={()=>window.qaBack=true}/>}
<main style={{flex:1,minWidth:0,display:'flex',flexDirection:'column'}}><QuranMacToolbar title={mode==='read'?'Reader':mode} chapter={chapters[0]} mode={mode} focused={focus} sidebar={showSide} inspector={showInspector} canSidebar={layout.sidebar} canInspect={layout.inspector} onSidebar={()=>setSide(!side)} onInspector={()=>setInspect(!inspect)} onFocus={()=>setFocus(!focus)} onMode={setMode} onBack={()=>window.qaBack=true}/>
{!showSide&&!focus&&<QuranMacCompactNavigation mode={mode} onMode={setMode}/>}
<article style={{padding:28,flex:1,overflow:'auto',color:window.qaDark?'white':'#10202A'}}><h1>Al-Fatihah</h1><p style={{fontSize:36,textAlign:'right',direction:'rtl'}}>بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</p><p>Mac component-layout fixture. Not a native screenshot or a recitation-accuracy test.</p></article></main>
{showInspector&&<QuranMacInspector chapter={chapters[0]} ayah={1} bookmarked={book} canListen={true} reciter='Mishary Alafasi' onBookmark={()=>setBook(!book)} onMode={setMode} onListen={()=>window.qaListened=true} onOpen={open}/>}
</div>}
createRoot(document.getElementById('root')).render(<Fixture/>);` },
    plugins: [{ name: "explicit-mac-layout-adapters", setup(b) {
      b.onResolve({ filter: /^react-native$/ }, () => ({ path: "native", namespace: "fixture" }));
      b.onResolve({ filter: /i18n\/LocalizedText$/ }, () => ({ path: "text", namespace: "fixture" }));
      b.onResolve({ filter: /theme\/ThemeProvider$/ }, () => ({ path: "theme", namespace: "fixture" }));
      b.onResolve({ filter: /components\/NativeGlassSurface$/ }, () => ({ path: "glass", namespace: "fixture" }));
      b.onResolve({ filter: /^@expo\/vector-icons$/ }, () => ({ path: "icons", namespace: "fixture" }));
      b.onResolve({ filter: /macRuntime$/ }, () => ({ path: "mac", namespace: "fixture" }));
      b.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: args.path === "native" ? nativeAdapter
        : args.path === "text" ? `export{Text,TextInput}from'react-native';`
        : args.path === "theme" ? `import{lightTheme,darkTheme}from'${path.join(root, "apps/mobile/src/theme/theme.ts")}';export const useAppTheme=()=>({theme:window.qaDark?darkTheme:lightTheme});`
        : args.path === "glass" ? `import React from'react';import{View}from'react-native';export const NativeGlassSurface=p=><View {...p}/>`
        : args.path === "mac" ? `export const isMacQuranHost=true;`
        : `import React from'react';export const Ionicons=({name,color,size})=><span aria-hidden="true" style={{color,fontSize:size,width:size,flexShrink:0}}>◇</span>;`, loader: "tsx", resolveDir: root }));
    } }] });
  return result.outputFiles[0].text;
}

test("actual Mac components fit narrow/wide light/dark layouts and controls dispatch their real callbacks", async () => {
  // Native views/glass/input are explicitly adapted for headless layout QA.
  // This does not replace the separately gated native Mac interaction test.
  const script = await renderBundle(), browser = await chromium.launch({ headless: true });
  try {
    for (const width of [640, 900, 1280, 1512]) for (const dark of [false, true]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      try {
        await page.setContent(`<style>*{box-sizing:border-box}body{margin:0;font-family:system-ui}button{border:0;background:transparent;font:inherit;cursor:pointer}input{min-width:0}main{overflow:hidden}</style><div id="root"></div><script>window.qaOpaque=true;window.qaDark=${dark};${script}</script>`);
        await page.getByRole("heading", { name: "Al-Fatihah" }).waitFor();
        const fits = () => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
        assert.ok(await fits(), `Initial overflow at ${width}/${dark}`);
        assert.equal(await page.getByLabel("Mac Quran sidebar").count(), width >= 780 ? 1 : 0);
        assert.equal(await page.getByLabel("Mac reading inspector").count(), width >= 1280 ? 1 : 0);
        if (width >= 780) {
          await page.getByLabel("Find a surah in sidebar").fill("Baqarah");
          assert.equal(await page.getByRole("button", { name: "Open Al-Fatihah, 7 ayahs" }).count(), 0);
          await page.getByLabel("Find a surah in sidebar").fill("");
          await page.getByRole("button", { name: "Hide Quran sidebar" }).click();
          assert.equal(await page.getByLabel("Mac Quran sidebar").count(), 0);
          await page.getByRole("button", { name: "Show Quran sidebar" }).click();
        }
        if (width >= 1280) {
          await page.getByRole("button", { name: "Bookmark 1:1", exact: true }).click();
          await page.getByRole("button", { name: "Remove bookmark for 1:1", exact: true }).waitFor();
          await page.getByRole("button", { name: "Listen from here" }).click();
          assert.equal(await page.evaluate(() => (window as any).qaListened), true);
          await page.getByRole("button", { name: "Hide reading inspector" }).click();
          assert.equal(await page.getByLabel("Mac reading inspector").count(), 0);
        }
        await page.getByRole("button", { name: "Focus reading" }).click();
        assert.equal(await page.getByLabel("Mac Quran sidebar").count(), 0);
        assert.equal(await page.getByLabel("Mac reading inspector").count(), 0);
        await page.getByRole("button", { name: "Leave focus" }).click();
        await page.getByRole(width >= 780 ? "button" : "tab", { name: "Practise", exact: true }).click();
        await page.getByRole(width >= 780 ? "button" : "tab", { name: "Test yourself", exact: true }).click();
        assert.equal(await page.evaluate(() => (window as any).qaMode), "test");
        await page.getByRole("button", { name: "Search Quran", exact: true }).click();
        assert.equal(await page.evaluate(() => (window as any).qaMode), "search");
        assert.ok(await fits(), `Context overflow at ${width}/${dark}`);
        await page.evaluate(() => (window as any).qaTransparency(false));
        assert.ok(await fits());
      } finally { await page.close(); }
    }
  } finally { await browser.close(); }
});
