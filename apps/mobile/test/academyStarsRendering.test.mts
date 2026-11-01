import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { chromium } from "playwright";
import path from "node:path";
const root = path.resolve(import.meta.dirname, "../../..");

test("native adapter: names, photos, registration, locale and monthly rollover at phone/tablet widths", async () => {
  const bundle = await build({ bundle: true, write: false, platform: "browser", format: "iife", jsx: "automatic", define: { "process.env.EXPO_PUBLIC_API_URL": '"https://hbic.ca"', "process.env.NODE_ENV": '"production"' },
    stdin: { resolveDir: root, loader: "tsx", contents: `import React from'react';import{createRoot}from'react-dom/client';import{flushSync}from'react-dom';import{AcademyStars}from'./apps/mobile/src/components/AcademyStars';const root=createRoot(document.getElementById('root'));window.render=()=>flushSync(()=>root.render(<AcademyStars months={window.months} onRegister={()=>window.registered++}/>));window.render();` },
    plugins: [{ name: "native-adapter", setup(b) {
      b.onResolve({ filter: /^(react-native)$|ThemeProvider$|LanguageProvider$|LocalizedText$|AppButton$/ }, a => ({ path: a.path.split("/").at(-1)!, namespace: "fixture" }));
      b.onLoad({ filter: /.*/, namespace: "fixture" }, a => ({ loader: "tsx", resolveDir: root, contents: {
        "react-native": `import React from'react';const flatten=s=>Array.isArray(s)?Object.assign({},...s.map(flatten)):s||{};const css=s=>{const x={...flatten(s)};if(x.lineHeight)x.lineHeight+='px';return x};export const View=({children,style})=><div style={{display:'flex',flexDirection:'column',...css(style)}}>{children}</div>;export const Text=({children,style,accessibilityRole})=><div role={accessibilityRole==='header'?'heading':undefined} style={css(style)}>{children}</div>;export const Image=({source,style})=><img src={source.uri} style={{objectFit:'cover',...css(style)}}/>;export const StyleSheet={create:x=>x};export const AppState={addEventListener:()=>({remove(){}})};export const Linking={openURL:async(url)=>{window.openedUrl=url}};export const useWindowDimensions=()=>({width:innerWidth});`,
        ThemeProvider: `import{lightTheme,darkTheme}from'${root}/apps/mobile/src/theme/theme';export const useAppTheme=()=>({theme:window.dark?darkTheme:lightTheme});`,
        LanguageProvider: `export const useAppLanguage=()=>({language:window.language});`,
        LocalizedText: `export{Text,Image}from'react-native';`,
        AppButton: `import React from'react';export const AppButton=({label,onPress})=><button onClick={onPress} style={{padding:16,whiteSpace:'normal'}}>{label}</button>;`
      }[a.path] ?? "" }));
    } }] });
  const browser = await chromium.launch({ headless: true });
  try {
    for (const [width, dark, language] of [[320, false, "en"], [390, true, "ur"], [900, false, "fa"], [1440, true, "ar"]] as const) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      await page.clock.install({ time: new Date("2026-11-20T12:00:00Z") });
      await page.route("https://hbic.ca/api/academy/stars/**", route => route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="700"><rect width="600" height="700" fill="#12304a"/></svg>' }));
      await page.setContent('<style>*{box-sizing:border-box}body{margin:16px;font-family:system-ui}</style><div id="root"></div>');
      await page.evaluate(({ dark, language }) => Object.assign(window, { dark, language, registered: 0, months: [{ month: "2026-10", highlightUrl: "https://www.instagram.com/p/Example123/", winners: [{ side: "brothers", name: "Test learner A", photoEnabled: true }, { side: "sisters", name: "Test learner B", photoEnabled: true }] }] }), { dark, language });
      await page.addScriptTag({ content: bundle.outputFiles[0].text });
      assert.equal(await page.locator("img").count(), 2, "October photos remain before new winners");
      await page.getByRole("button", { name: "Watch the class celebration" }).click();
      assert.equal(await page.evaluate(() => (window as any).openedUrl), "https://www.instagram.com/p/Example123/", "opens the approved reel without an app rebuild");
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.getByRole("button", { name: "Register for HBIC Qur’an Academy" }).click();
      assert.equal(await page.evaluate(() => (window as any).registered), 1);
      await page.evaluate(() => { (window as any).months = [...(window as any).months, { month: "2026-11", winners: [{ side: "sisters", name: "Test learner C", photoEnabled: true }] }]; (window as any).render(); });
      assert.equal(await page.locator("img").count(), 1, "superseded months retain names only");
      assert.ok(await page.getByText("Test learner A", { exact: true }).isVisible());
      await page.close();
    }
  } finally { await browser.close(); }
});
