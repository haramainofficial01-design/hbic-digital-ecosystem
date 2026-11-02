/** Exercises the shipped component with scaled native-style adapters.
 * Geometry fixtures are not simulator screenshots or physical-device approval. */
import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../../..");
const output = path.join(root, "output/prayer-schedule-2026-11-02");
const native = `import React,{forwardRef,useLayoutEffect,useRef}from'react';
const flatten=s=>Array.isArray(s)?Object.assign({},...s.filter(Boolean).map(flatten)):s||{};
function css(style,box=false){const s={borderWidth:0,...flatten(style)};for(const[a,b,c]of[['paddingHorizontal','paddingLeft','paddingRight'],['paddingVertical','paddingTop','paddingBottom'],['marginHorizontal','marginLeft','marginRight'],['marginVertical','marginTop','marginBottom']]){if(s[a]!=null){s[b]=s[c]=s[a];delete s[a]}}if(s.flex!=null)s.flex=s.flex+' 1 0%';if(s.borderWidth||s.borderBottomWidth||s.borderLeftWidth)s.borderStyle='solid';if(s.fontVariant)s.fontVariantNumeric=s.fontVariant.join(' ');delete s.fontVariant;delete s.writingDirection;return box?{display:'flex',flexDirection:'column',flexShrink:0,position:'relative',...s}:s}
export function View({children,style,onLayout,accessibilityLabel,pointerEvents}){const ref=useRef();useLayoutEffect(()=>{if(!onLayout)return;const notify=()=>{const b=ref.current.getBoundingClientRect();onLayout({nativeEvent:{layout:{width:b.width,height:b.height}}})};const observer=new ResizeObserver(notify);observer.observe(ref.current);notify();return()=>observer.disconnect()},[!!onLayout]);return <div ref={ref} aria-label={accessibilityLabel} style={{...css(style,true),pointerEvents}}>{children}</div>}
export const Text=forwardRef(function Text({children,style,numberOfLines},ref){const s=css(style);if(s.fontSize)s.fontSize*=window.qaScale;return <span ref={ref} style={{...s,...(numberOfLines===1?{whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}:{})}}>{children}</span>});
export const TextInput=()=>null,Image=()=>null,Alert={alert(){}};
export const StyleSheet={create:s=>s,hairlineWidth:1};export const useWindowDimensions=()=>({width:innerWidth,height:innerHeight,fontScale:window.qaScale});`;

async function scheduleBundle() {
  const result = await build({ bundle: true, write: false, platform: "browser", format: "iife", jsx: "automatic",
    define: { "process.env.NODE_ENV": '"production"' },
    stdin: { resolveDir: root, loader: "tsx", contents: `import React from'react';import{createRoot}from'react-dom/client';import{PrayerTimesList}from'./apps/mobile/src/components/PrayerTimesList';createRoot(document.getElementById('root')).render(<PrayerTimesList compact={window.qaCompact} maxItems={window.qaCompact?3:undefined} highlightedPrayer={window.qaHighlight?'maghrib':undefined}/>);` },
    plugins: [{ name: "scaled-native-prayer-schedule", setup(b) {
      b.onResolve({ filter: /^react-native$|LanguageProvider$|ThemeProvider$|services\/content$|^@expo\/vector-icons$/ }, a => ({ path: a.path.split("/").at(-1)!, namespace: "fixture" }));
      b.onLoad({ filter: /.*/, namespace: "fixture" }, a => ({ loader: "tsx", resolveDir: root, contents: {
        "react-native": native,
        LanguageProvider: `import{t,translateUi}from'@hbic/shared';export const useAppLanguage=()=>({language:window.qaLanguage,isRtl:window.qaLanguage!=='en',translate:s=>translateUi(window.qaLanguage,s),t:key=>t(window.qaLanguage,key)});`,
        ThemeProvider: `import{lightTheme,darkTheme}from'${root}/apps/mobile/src/theme/theme';export const useAppTheme=()=>({theme:window.qaDark?darkTheme:lightTheme});`,
        content: `import{defaultContent}from'@hbic/shared';export const usePublishedContent=()=>({content:{...defaultContent,prayerTime:{...defaultContent.prayerTime,date:'2026-11-02',fajr:'7:00 AM',sunrise:'8:30 AM',dhuhr:'1:20 PM',asr:'3:41 PM',maghrib:'6:08 PM',isha:'7:38 PM'},iqamahTime:{...defaultContent.iqamahTime,fajrIqamah:'7:10 AM',dhuhrIqamah:'1:30 PM',asrIqamah:'4:00 PM',maghribIqamah:'6:18 PM',ishaIqamah:'8:00 PM'}},source:window.qaFallback?'bundled-fallback':'api'});`,
        "vector-icons": `import React from'react';export const MaterialCommunityIcons=({size})=><span aria-hidden='true' style={{width:size,minWidth:size,height:size,display:'inline-block'}}/>;`
      }[a.path] ?? "" }));
    } }] });
  return result.outputFiles[0].text;
}

test("prayer schedule keeps every time readable, separated and consistently formatted across widths, text scales and languages", async () => {
  const script = await scheduleBundle(), browser = await chromium.launch({ headless: true });
  mkdirSync(output, { recursive: true });
  let cases = 0;
  try {
    for (const language of ["en", "ur", "fa-AF", "ar"]) for (const width of [320, 390, 768, 1280]) for (const scale of [1, 1.3, 2]) {
      const dark = cases % 2 === 0;
      const page = await browser.newPage({ viewport: { width, height: 1200 } }), errors: string[] = [];
      page.on("pageerror", e => errors.push(e.message));
      try {
        await page.clock.install({ time: new Date("2026-11-02T23:00:00Z") });
        await page.setContent(`<style>*{box-sizing:border-box}body{margin:16px;font-family:system-ui;background:${dark ? "#031827" : "#F2FBFC"}}span{min-width:0}</style><div id='root' dir='${language === "en" ? "ltr" : "rtl"}'></div><script>window.qaScale=${scale};window.qaDark=${dark};window.qaLanguage='${language}';${script}</script>`);
        const fajr = page.locator('[aria-label]').filter({ hasText: "7:00" }).last();
        await fajr.waitFor();
        await page.waitForFunction(() => document.querySelectorAll('[aria-label*="7:00 AM"]').length === 1);
        const rows = page.locator('[aria-label]').filter({ has: page.locator('span') });
        const geometry = await rows.evaluateAll(elements => elements.map(row => ({
          label: row.getAttribute('aria-label'), row: row.getBoundingClientRect().toJSON(),
          values: [...row.querySelectorAll('span')].filter(el => /^\d{1,2}:\d{2}$/.test(el.textContent ?? "")).map(el => ({
            text: el.textContent, box: el.getBoundingClientRect().toJSON(), cell: el.parentElement!.getBoundingClientRect().toJSON(),
            period: el.nextElementSibling?.getBoundingClientRect().toJSON() ?? null, periodText: el.nextElementSibling?.textContent,
            clipped: el.scrollWidth > el.clientWidth + 1 || getComputedStyle(el).textOverflow === 'ellipsis'
          }))
        })));
        assert.equal(geometry.length, 6, `${language}/${width}/${scale}: all prayers remain present`);
        for (const [index, row] of geometry.entries()) {
          assert.deepEqual(row.values.map(value => value.text), [
            ["7:00", "7:10"], ["8:30"], ["1:20", "1:30"], ["3:41", "4:00"], ["6:08", "6:18"], ["7:38", "8:00"]
          ][index], "published values remain intact in both columns");
          for (const value of row.values) {
            assert.equal(value.clipped, false, `${language}/${width}/${scale}: ${value.text} must not truncate`);
            assert.ok(value.box.x >= row.row.x && value.box.right <= row.row.right + 1, "time stays inside row");
            assert.ok(value.period && /^(AM|PM)$/.test(value.periodText ?? ""), "time period remains visible");
            assert.ok(value.period!.right <= row.row.right + 1, "period stays inside row");
            assert.ok(value.box.height < 15 * scale * 1.6 && value.period!.height < 11 * scale * 1.6, "digits and AM/PM each occupy one complete line");
            // A time is either deliberately stacked or inline, never a partly wrapped AM/PM.
            const stacked = value.period!.y >= value.box.bottom - 1;
            assert.ok(stacked || Math.abs(value.period!.bottom - value.box.bottom) < 8 * scale, "consistent time grouping");
          }
          if (row.values.length === 2) {
            const [a, b] = row.values;
            assert.ok(a.cell.right + 11 <= b.cell.x || b.cell.right + 11 <= a.cell.x || a.cell.bottom + 11 <= b.cell.y || b.cell.bottom + 11 <= a.cell.y, "Adhan and Iqamah cells retain a clear gap");
          }
        }
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, "no screen overflow");
        assert.deepEqual(errors, []);
        if (language === "en" && [390, 1280].includes(width) && [1, 2].includes(scale) || language === "ar" && width === 390 && scale === 1.3) {
          await page.screenshot({ path: path.join(output, `adapter-${language}-${width}-${scale}-${dark ? "dark" : "light"}.png`), fullPage: true });
        }
        cases++;
      } finally { await page.close(); }
    }
    assert.equal(cases, 48);
  } finally { await browser.close(); }
});

test("compact Home, alert highlight, sunrise and unavailable data preserve their meaning in both themes", async () => {
  const script = await scheduleBundle(), browser = await chromium.launch({ headless: true });
  mkdirSync(output, { recursive: true });
  try { for (const dark of [false, true]) for (const compact of [false, true]) for (const fallback of [false, true]) {
    const page = await browser.newPage({ viewport: { width: 390, height: 1000 } });
    try {
      await page.setContent(`<style>*{box-sizing:border-box}body{margin:16px;font-family:system-ui}</style><div id='root'></div><script>window.qaScale=1;window.qaDark=${dark};window.qaLanguage='en';window.qaCompact=${compact};window.qaFallback=${fallback};window.qaHighlight=true;${script}</script>`);
      await page.locator('[aria-label*="Fajr."]').waitFor();
      assert.equal(await page.locator('[aria-label*=". Adhan,"]').count(), compact ? 3 : 6);
      const sunrise = page.locator('[aria-label*="Sunrise."]');
      assert.ok(await sunrise.innerText().then(text => text.includes("—")), "sunrise never invents an Iqamah");
      if (fallback) assert.equal(await page.getByText("--", { exact: true }).count(), compact ? 3 : 6);
      else assert.ok(await page.locator('[aria-label*="Fajr."]').getByText("7:10", { exact: true }).isVisible());
      if (!compact) assert.match(await page.locator('[aria-label*="Maghrib."]').getAttribute("aria-label") ?? "", /Opened from prayer alert/);
      if (!compact && !fallback) await page.screenshot({ path: path.join(output, `adapter-phone-${dark ? "dark" : "light"}.png`), fullPage: true });
    } finally { await page.close(); }
  }} finally { await browser.close(); }
});
