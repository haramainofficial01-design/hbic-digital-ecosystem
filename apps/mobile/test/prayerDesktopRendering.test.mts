/** Actual React component geometry with explicit native adapters, NOT native
 * Mac/phone screenshots, live prayer-data verification or recognition accuracy. */
import assert from "node:assert/strict";
import test from "node:test";
import {build} from "esbuild";
import {chromium} from "playwright";
import {mkdirSync} from "node:fs";
import path from "node:path";

const root=path.resolve(import.meta.dirname,"../../..");
const native=`import React,{useLayoutEffect,useRef}from'react';
function flatten(v){return Array.isArray(v)?Object.assign({},...v.filter(Boolean).map(flatten)):v||{}}
function css(v,box){let s=flatten(typeof v==='function'?v({pressed:false}):v);s={borderWidth:0,...s};if(box){s.display='flex';s.flexDirection=s.flexDirection||'column';s.flexShrink=s.flexShrink??0;s.position=s.position||'relative'}for(const[a,b,c]of[['paddingHorizontal','paddingLeft','paddingRight'],['paddingVertical','paddingTop','paddingBottom'],['marginHorizontal','marginLeft','marginRight'],['marginVertical','marginTop','marginBottom']]){if(s[a]!=null){s[b]=s[c]=s[a];delete s[a]}}if(s.flex!=null)s.flex=s.flex+' 1 0%';if(typeof s.lineHeight==='number')s.lineHeight=s.lineHeight+'px';if(s.borderWidth!=null||s.borderTopWidth!=null||s.borderBottomWidth!=null)s.borderStyle='solid';delete s.elevation;delete s.shadowColor;delete s.shadowOpacity;delete s.shadowOffset;delete s.shadowRadius;return s}
export function View({children,style,onLayout,accessibilityLabel,accessibilityRole,pointerEvents}){const ref=useRef();useLayoutEffect(()=>{if(!onLayout)return;const notify=()=>onLayout({nativeEvent:{layout:{width:ref.current.getBoundingClientRect().width}}});const observer=new ResizeObserver(notify);observer.observe(ref.current);notify();return()=>observer.disconnect()},[!!onLayout]);return <div ref={ref} aria-label={accessibilityLabel} role={accessibilityRole} style={{...css(style,true),pointerEvents}}>{children}</div>}
export const Text=({children,style,numberOfLines})=><span style={{...css(style,false),...(numberOfLines===1?{whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}:{})}}>{children}</span>;
export const Image=({source,style})=><img src={source} alt='' style={css(style,false)}/>;
export const Pressable=({children,style,onPress,accessibilityLabel,accessibilityRole,accessibilityState})=><button type='button' aria-label={accessibilityLabel} aria-selected={accessibilityState?.selected} onClick={onPress} style={css(style,true)}>{children}</button>;
export const ScrollView=({children,style,contentContainerStyle,horizontal,accessibilityLabel})=><div aria-label={accessibilityLabel} style={{...css(style,true),overflowX:horizontal?'auto':'hidden'}}><div style={{...css(contentContainerStyle,true),...(horizontal?{flexDirection:'row',width:'max-content'}:{})}}>{children}</div></div>;
export const RefreshControl=()=>null;export const StyleSheet={create:s=>s,hairlineWidth:1};export const useWindowDimensions=()=>({width:innerWidth,height:innerHeight,fontScale:window.qaFontScale||1});`;
async function bundle(){const result=await build({write:false,bundle:true,platform:"browser",format:"iife",jsx:"automatic",loader:{".png":"dataurl",".jpg":"dataurl",".jpeg":"dataurl",".webp":"dataurl"},define:{"process.env.NODE_ENV":'"production"'},
stdin:{resolveDir:root,loader:"tsx",contents:`import React from'react';import{createRoot}from'react-dom/client';import{AppScreen}from'./apps/mobile/src/components/AppScreen';import{DesktopColumns}from'./apps/mobile/src/components/DesktopColumns';import{PrayerHero}from'./apps/mobile/src/components/PrayerHero';import{PrayerTimesList}from'./apps/mobile/src/components/PrayerTimesList';import{SectionHeader}from'./apps/mobile/src/components/SectionHeader';
createRoot(document.getElementById('root')).render(<AppScreen><SectionHeader title='Prayer & Iqamah' subtitle='Today’s adhan, iqamah, and Jumu’ah times for Masjid Bilal.'/><PrayerHero/><DesktopColumns><PrayerTimesList/><div style={{padding:24,borderRadius:26,background:window.qaDark?'#112B4B':'white',color:window.qaDark?'white':'#10202A'}}><h2>Jumu’ah Schedule</h2><p>First Khutbah · 1:45 PM</p><p>Second Khutbah · 2:30 PM</p></div></DesktopColumns></AppScreen>);`},
plugins:[{name:"explicit-prayer-native-layout-adapter",setup(b){
  for(const[filter,id]of[[/^react-native$/,"native"],[/^react-native-safe-area-context$/,"safe"],[/i18n\/LocalizedText$/,"text"],[/i18n\/LanguageProvider$/,"language"],[/services\/content$/,"content"],[/services\/useVisibleClock$/,"clock"],[/theme\/ThemeProvider$/,"theme"],[/quran\/macRuntime$/,"mac"],[/^@expo\/vector-icons$/,"icons"]]as const)b.onResolve({filter},()=>({path:id,namespace:"fixture"}));
  b.onLoad({filter:/.*/,namespace:"fixture"},args=>({contents:args.path==="native"?native:args.path==="safe"?`export{View as SafeAreaView}from'react-native';`:args.path==="text"?`export{Text,Image}from'react-native';`:args.path==="language"?`import{english}from'${path.join(root,"packages/shared/src/i18n/en.ts")}';export const useAppLanguage=()=>({language:'en',isRtl:false,translate:x=>x,t:x=>({fajr:'Fajr',dhuhr:'Dhuhr',asr:'Asr',maghrib:'Maghrib',isha:'Isha',sunrise:'Sunrise',nextPrayer:'Next Prayer',prayerTimes:'Prayer Times',todaySchedule:'Today’s Schedule',adhan:'Adhan',iqamah:'Iqamah',noIqamah:'No Iqamah',prayer:'Prayer'}[x]||x)});`:args.path==="theme"?`import{lightTheme,darkTheme}from'${path.join(root,"apps/mobile/src/theme/theme.ts")}';export const useAppTheme=()=>({theme:window.qaDark?darkTheme:lightTheme});`:args.path==="content"?`import{defaultContent}from'@hbic/shared';export const usePublishedContent=()=>({content:{...defaultContent,prayerTime:{...defaultContent.prayerTime,date:'2026-10-13'},featureFlags:{...defaultContent.featureFlags,hijriDateEnabled:false}},source:'api',loading:false,refresh:()=>{}});`:args.path==="clock"?`export const useVisibleClock=()=>new Date('2026-10-13T15:00:00Z');`:args.path==="mac"?`export const isMacQuranHost=window.qaMac;`:`import React from'react';export const Ionicons=()=>null;export const MaterialCommunityIcons=()=>null;`,loader:"tsx",resolveDir:root}));
}}]});return result.outputFiles[0].text;}

test("Mac prayer controls fill their card; headings clear native navigation and selection still works",async()=>{
  const script=await bundle(),browser=await chromium.launch({headless:true});
  const out=path.resolve(root,"output/quran-development/mac-prayer-layout-20261013");mkdirSync(out,{recursive:true});
  try{for(const width of[390,640,900,1280,1792])for(const dark of[false,true]){
    const page=await browser.newPage({viewport:{width,height:1000}});
    try{await page.setContent(`<style>*{box-sizing:border-box}body{margin:0;font-family:system-ui}button{font:inherit;background:none;cursor:pointer}span{min-width:0}</style><div id='root'></div><script>window.qaMac=${width!==390};window.qaDark=${dark};${script}</script>`);
      const selector=page.getByLabel("Prayer selector");await selector.waitFor();
      await page.waitForTimeout(60);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`Overflow ${width}/${dark}`);
      const heading=await page.getByText("Prayer & Iqamah",{exact:true}).boundingBox();assert.ok(heading);
      if(width!==390)assert.ok(heading.y>=64,"Heading must clear the Mac top tab strip");
      const selectorBox=await selector.boundingBox();assert.ok(selectorBox&&selectorBox.y<550,"Prayer card must remain compact, without oversized text-line gaps");
      const buttons=selector.getByRole("button");assert.equal(await buttons.count(),6);
      if(width>=640){const box=await selector.boundingBox(),first=await buttons.first().boundingBox(),last=await buttons.last().boundingBox();assert.ok(box&&first&&last);assert.ok(first.width>=60&&first.height>=44);assert.ok(last.x+last.width>box.x+box.width-20,"Last prayer must reach the right edge, not bunch left");}
      await selector.getByRole("button",{name:"Show Maghrib prayer times"}).click();
      await selector.locator('[aria-label="Show Maghrib prayer times"][aria-selected="true"]').waitFor();
      await selector.getByRole("button",{name:"Show Now prayer times"}).click();
      await selector.locator('[aria-label="Show Now prayer times"][aria-selected="true"]').waitFor();
      if(width===1280||width===390)await page.screenshot({path:path.join(out,`component-layout-${width}-${dark?"dark":"light"}.png`),fullPage:true});
    }finally{await page.close();}
  }}finally{await browser.close();}
});
