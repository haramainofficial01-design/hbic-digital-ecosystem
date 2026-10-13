/** Real artwork/component rendering, not an ASR or native-device qualification. */
import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { build } from "esbuild";
import { chromium } from "playwright";

const root = path.resolve(import.meta.dirname, "../../..");
test("the Quran mark is identical across app and website, bounded and transparent", async () => {
  const app = await readFile(path.join(root, "apps/mobile/assets/brand/hbic-quran-mark.png"));
  const web = await readFile(path.join(root, "apps/public-web/public/hbic-quran-mark.png"));
  assert.equal(createHash("sha256").update(app).digest("hex"), createHash("sha256").update(web).digest("hex"));
  assert.ok(app.length < 150_000);
  assert.equal(app.readUInt32BE(16), 512); assert.equal(app.readUInt32BE(20), 512);
  assert.equal(app[25], 6, "RGBA transparency must survive packaging");
});

test("actual native/web brand components remain crisp and fit compact light/dark headings", async () => {
  const result = await build({ write: false, bundle: true, platform: "browser", format: "iife", jsx: "automatic", loader: { ".png": "dataurl" },
    stdin: { resolveDir: root, loader: "tsx", contents: `import React from'react';import{createRoot}from'react-dom/client';
import{QuranBrandMark as NativeMark}from'./apps/mobile/src/quran/QuranBrandMark';import{QuranBrandMark as WebMark}from'./apps/public-web/components/QuranBrandMark';
createRoot(document.getElementById('root')).render(<><h1>Quran & Recite</h1>{[24,32,48,88].map(size=><div key={size} className="sample"><NativeMark size={size}/><span>Quran & Recite</span></div>)}<div className="sample" style={{'--quran-mark-size':'44px'}}><WebMark/><span>Quran & Recite</span></div></>);` },
    plugins: [{ name: "explicit-brand-layout-adapters", setup(b) {
      b.onResolve({ filter: /^(react-native|next\/image)$/ }, args => ({ path: args.path, namespace: "qa" }));
      b.onLoad({ filter: /.*/, namespace: "qa" }, args => ({ contents: args.path === "react-native"
        ? `import React from'react';export const View=({style,children})=><div style={style}>{children}</div>;export const Image=({source,style})=><img src={source} alt="" style={style}/>`
        : `import React from'react';export default function Image({src,...props}){return <img {...props} src={window.qaMark}/>}`, loader: "tsx", resolveDir: root }));
    } }] });
  const asset = await readFile(path.join(root, "apps/public-web/public/hbic-quran-mark.png"));
  const browser = await chromium.launch({ headless: true });
  const output = path.join(root, "output/quran-development/branding"); await mkdir(output, { recursive: true });
  try {
    for (const dark of [false, true]) for (const width of [320, 390, 900]) {
      const page = await browser.newPage({ viewport: { width, height: 640 } });
      try {
        await page.setContent(`<style>*{box-sizing:border-box}body{margin:0;padding:18px;background:${dark ? "#102F3A" : "#F2FBFC"};color:${dark ? "#E8F1EE" : "#102C36"};font:600 16px system-ui}h1{font-size:24px}.sample{display:flex;gap:12px;align-items:center;margin:18px 0;min-width:0}.sample>span:last-child{min-width:0;overflow-wrap:anywhere}img{display:block;object-fit:contain}</style><div id="root"></div><script>window.qaMark='data:image/png;base64,${asset.toString("base64")}';${result.outputFiles[0].text}</script>`);
        await page.getByRole("heading", { name: "Quran & Recite" }).waitFor();
        await page.waitForFunction(() => [...document.images].every(img => img.complete && img.naturalWidth === 512));
        assert.equal(await page.locator("img").count(), 5);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        assert.equal(await page.getByRole("img").count(), 0, "Decorative mark must not repeat its adjacent heading to screen readers");
        if (width === 390) await page.screenshot({ path: path.join(output, `quran-brand-${dark ? "dark" : "light"}.png`) });
      } finally { await page.close(); }
    }
  } finally { await browser.close(); }
});
