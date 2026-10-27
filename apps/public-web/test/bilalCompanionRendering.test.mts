import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { chromium, type Page } from "playwright";
import path from "node:path";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";

const root = path.resolve(import.meta.dirname, "../../.."), qa = mkdtempSync(path.join(tmpdir(), "hbic-companion-web-"));
async function bundle() {
  const result = await build({ bundle: true, write: false, outdir: "qa", format: "iife", platform: "browser", jsx: "automatic", define: { "process.env.NODE_ENV": '"production"' }, stdin: { resolveDir: root, loader: "tsx", contents: `import React,{useState}from'react';import{createRoot}from'react-dom/client';import{flushSync}from'react-dom';import{BilalCompanion}from'./apps/public-web/components/BilalCompanion';function Harness(){const[tick,set]=useState(0);window.route=value=>flushSync(()=>{window.pathname=value;set(x=>x+1)});return <><div className="site"><button id="background">Background action</button></div><BilalCompanion/></>}createRoot(document.getElementById('root')).render(<Harness/>);` }, plugins: [{ name: "next-router-fixture", setup(b) {
    b.onResolve({ filter: /^next\/navigation$/ }, () => ({ path: "navigation", namespace: "fixture" }));
    b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({ contents: "export const usePathname=()=>window.pathname" }));
    b.onResolve({ filter: /^next\/image$/ }, () => ({ path: "image", namespace: "image" }));
    b.onLoad({ filter: /.*/, namespace: "image" }, () => ({ contents: "import React from'react';export default function Image(props){return <img {...props}/>}", loader: "tsx", resolveDir: root }));
  } }] });
  return { js: result.outputFiles.find(f => f.path.endsWith(".js"))!.text, css: result.outputFiles.find(f => f.path.endsWith(".css"))!.text };
}
const bundled = bundle();
async function setup(page: Page, pathname = "/", seen = true) {
  const assets = await bundled;
  if (!page.url().startsWith("https://hbic.test")) { await page.route("https://hbic.test/**", route => route.fulfill({ body: "<html></html>", contentType: "text/html" })); await page.goto("https://hbic.test"); }
  await page.evaluate(seen => { if (seen) localStorage.setItem("hbic-bilal-tour", "hbic-bilal-welcome-2026-10-v1"); else localStorage.removeItem("hbic-bilal-tour"); }, seen);
  await page.setContent(`<style>*{box-sizing:border-box}body{margin:0;font-family:system-ui}.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}a{color:inherit}</style><style>${assets.css}</style><div id="root"></div>`);
  await page.evaluate(pathname => {
    Object.assign(window, { pathname, requests: [], replyError: false, pending: false });
    window.fetch = async (_, init) => {
      if (!init?.body) return new Response(JSON.stringify({ ok: true, enabled: true }));
      const w = window as any; w.requests.push(JSON.parse(String(init.body)));
      if (w.replyError) return new Response(JSON.stringify({ ok: false, error: "Please try again shortly." }), { status: 503 });
      if (w.pending) return new Promise((_, reject) => init.signal?.addEventListener("abort", () => reject(new Error("aborted"))));
      return new Response(JSON.stringify({ ok: true, answer: "Published information. <img src=x onerror=alert(1)>", sources: [{ id: "contact", title: "Contact the masjid", href: "https://hbic.ca/contact" }, { id: "bad", title: "Unsafe link", href: "javascript:alert(1)" }], mode: "published-info", asOf: "2026-10-17T16:00:00Z", contentVersion: 20, needsHuman: false, topicIds: ["contact"] }));
    };
  }, pathname);
  await page.addScriptTag({ content: assets.js });
}

test("real website widget stays inside small/large light/dark viewports, traps focus and restores the page", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const [width, height] of [[320,568], [390,844], [768,1024], [1440,900]]) for (const mode of ["light", "dark"] as const) {
      const page = await browser.newPage({ viewport: { width, height }, colorScheme: mode, reducedMotion: "reduce" }); await setup(page);
      await page.getByRole("button", { name: "Open Bilal" }).waitFor();
      assert.equal(await page.getByRole("dialog").count(), 0, "never auto-open");
      await page.getByRole("button", { name: "Open Bilal" }).click();
      const dialog = page.getByRole("dialog"); await dialog.waitFor();
      const box = await dialog.boundingBox(); assert.ok(box && box.x >= 0 && box.y >= 0 && box.x + box.width <= width + 1 && box.y + box.height <= height + 1, JSON.stringify({ width, height, box }));
      assert.equal(await page.locator(".site").evaluate(el => (el as HTMLElement).inert), true);
      await page.getByLabel("Your question", { exact: true }).fill("contact"); await page.getByRole("button", { name: "Send question" }).click();
      await page.getByText("Published information. <img src=x onerror=alert(1)>", { exact: true }).waitFor();
      assert.equal(await dialog.locator('img[src="x"]').count(), 0); assert.equal(await dialog.locator('img[src="/brand/bilal-mark.svg"]').count(), 1); assert.equal(await page.getByRole("link", { name: "Unsafe link" }).count(), 0);
      assert.equal(await page.getByRole("link", { name: "Contact the masjid", exact: true }).getAttribute("href"), "https://hbic.ca/contact");
      await dialog.getByRole("combobox").focus(); await page.keyboard.press("Tab");
      assert.equal(await dialog.getByRole("button", { name: "Quick tour", exact: true }).evaluate(el => document.activeElement === el), true);
      await page.keyboard.press("Escape"); assert.equal(await dialog.count(), 0); assert.equal(await page.locator(".site").evaluate(el => (el as HTMLElement).inert), false);
      assert.equal(await page.getByRole("button", { name: "Open Bilal" }).evaluate(el => document.activeElement === el), true);
      await page.getByRole("button", { name: "Open Bilal" }).click(); await page.getByRole("button", { name: "Clear chat", exact: true }).click();
      assert.equal(await page.getByText("Published information. <img src=x onerror=alert(1)>", { exact: true }).count(), 0);
      await page.screenshot({ path: path.join(qa, `${width}-${mode}.png`) }); await page.close();
    }
    console.log(`Website companion screenshots: ${qa}`);
  } finally { await browser.close(); }
});
test("hidden website stops tour checks, closes chat and cancels an active question", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage(); await page.clock.install(); await setup(page, "/", false);
    await page.addScriptTag({ content: "window.__name = (fn) => fn;" });
    await page.evaluate(() => {
      Object.defineProperty(document, "visibilityState", { configurable: true, get: () => (window as any).hiddenPage ? "hidden" : "visible" });
      (window as any).hiddenPage = true; document.dispatchEvent(new Event("visibilitychange"));
      const old = window.fetch; (window as any).snapshotChecks = 0;
      window.fetch = async (url, init) => { if (String(url).includes("/api/display")) (window as any).snapshotChecks++; return old(url, init); };
    });
    await page.clock.runFor(120_000); assert.equal(await page.evaluate(() => (window as any).snapshotChecks), 0);
    await page.evaluate(() => { (window as any).hiddenPage = false; document.dispatchEvent(new Event("visibilitychange")); });
    await page.getByRole("button", { name: "Open Bilal" }).click(); await page.getByRole("button", { name: "Skip tour" }).click();
    await page.clock.runFor(300); await page.getByRole("button", { name: "Open Bilal" }).click();
    await page.evaluate(() => { (window as any).pending = true; }); await page.getByRole("textbox").fill("contact"); await page.getByRole("button", { name: "Send question" }).click();
    await page.evaluate(() => { (window as any).hiddenPage = true; document.dispatchEvent(new Event("visibilitychange")); });
    await page.locator('[data-active="false"]').waitFor({ state: "attached" }); await page.clock.runFor(300);
    await page.getByRole("dialog").waitFor({ state: "hidden" }); assert.equal(await page.locator('[data-active="false"]').count(), 1);
  } finally { await browser.close(); }
});

test("existing visitor auto-tour waits for idle and a verified prayer quiet window, then persists across visits", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage(); await page.clock.install({ time: new Date("2026-10-17T18:00:00Z") }); await setup(page, "/", false);
    await page.evaluate(() => {
      const previous = window.fetch;
      (window as any).nearPrayer = true;
      window.fetch = async (url, init) => String(url).includes("/api/display") ? Response.json({ ok: true, snapshot: { availability: "available", stale: false, prayers: [{ key: "dhuhr", adhanDate: new Date(Date.now() + ((window as any).nearPrayer ? 60_000 : 3_600_000)).toISOString() }], jumuah: [] } }) : previous(url, init);
    });
    await page.clock.runFor(6600); assert.equal(await page.getByRole("dialog").count(), 0, "prayer time suppresses automatic tour");
    assert.equal(await page.evaluate(() => localStorage.getItem("hbic-bilal-tour")), null);
    await page.evaluate(() => { (window as any).nearPrayer = false; });
    await page.clock.runFor(30_000); await page.getByRole("heading", { name: "Meet Bilal" }).waitFor();
    await page.getByRole("button", { name: "Skip tour" }).click(); await page.getByRole("dialog").waitFor({ state: "hidden" });
    await page.clock.runFor(90_000); assert.equal(await page.getByRole("dialog").count(), 0);
    assert.equal(await page.evaluate(() => localStorage.getItem("hbic-bilal-tour")), "hbic-bilal-welcome-2026-10-v1");
  } finally { await browser.close(); }
});
test("route changes abort pending work; unavailable results are honest; session is not saved", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage(); await setup(page);
    await page.getByRole("button", { name: "Open Bilal" }).click();
    await page.evaluate(() => { (window as any).replyError = true; });
    await page.getByLabel("Your question", { exact: true }).fill("question"); await page.getByRole("button", { name: "Send question" }).click();
    await page.getByRole("alert").waitFor(); assert.match(await page.getByRole("alert").innerText(), /try again/);
    await page.evaluate(() => { (window as any).replyError = false; (window as any).pending = true; });
    await page.getByLabel("Your question", { exact: true }).fill("pending question"); await page.getByRole("button", { name: "Send question" }).click();
    await page.evaluate(() => (window as any).route("/quran")); assert.equal(await page.getByRole("dialog").count(), 0); assert.equal(await page.getByRole("button", { name: "Open Bilal" }).count(), 0);
    assert.equal(await page.locator(".site").evaluate(el => (el as HTMLElement).inert), false);
    for (const route of ["/quran-academy", "/donate", "/display"]) { await page.evaluate(value => (window as any).route(value), route); assert.equal(await page.getByRole("button", { name: "Open Bilal" }).count(), 0); }
    await setup(page); await page.getByRole("button", { name: "Open Bilal" }).click(); assert.equal(await page.getByText("pending question", { exact: true }).count(), 0);
  } finally { await browser.close(); }
});

test("one-time tour, replay, all languages/RTL, reduced motion and keyboard viewport stay usable", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const language of ["en", "ur", "fa-AF", "ar"]) {
      const page = await browser.newPage({ viewport: { width: 320, height: 568 }, reducedMotion: "reduce", colorScheme: "dark" });
      await setup(page, "/", false);
      await page.getByRole("button", { name: "Open Bilal" }).click();
      const dialog = page.getByRole("dialog"); await dialog.getByRole("heading", { name: "Meet Bilal" }).waitFor();
      await dialog.getByRole("combobox").selectOption(language);
      assert.equal(await dialog.evaluate(el => el.closest("[dir]")?.getAttribute("dir")), language === "en" ? "ltr" : "rtl");
      assert.equal(await dialog.locator("h2").innerText(), language === "en" ? "Bilal" : "بلال");
      for (let step = 0; step < 3; step++) {
        const primary = dialog.locator('button[class*="tourPrimary"]'); await primary.scrollIntoViewIfNeeded();
        const box = await primary.boundingBox(); assert.ok(box && box.y >= 0 && box.y + box.height <= 568);
        await primary.click();
      }
      await dialog.getByRole("textbox").waitFor();
      assert.equal(await page.evaluate(() => localStorage.getItem("hbic-bilal-tour")), "hbic-bilal-welcome-2026-10-v1");
      await dialog.locator('button[class*="iconButton"]').last().click(); await page.getByRole("dialog").waitFor({ state: "hidden" });
      await page.getByRole("button").filter({ hasText: language === "en" ? "Ask Bilal" : language === "ur" ? "بلال سے پوچھیں" : language === "ar" ? "اسأل بلال" : "از بلال بپرسید" }).click();
      assert.equal(await dialog.locator('button[class*="tourPrimary"]').count(), 0, "dismissal does not repeat tour");
      // A reduced mobile viewport models the usable keyboard area, not a physical OS keyboard.
      await page.setViewportSize({ width: 320, height: 410 }); await page.waitForTimeout(50);
      const input = dialog.getByRole("textbox"), box = await input.boundingBox(); assert.ok(box && box.y + box.height <= 410);
      await dialog.locator('button[class*="iconButton"]').first().click();
      await dialog.locator('button[class*="tourSkip"]').click(); await page.getByRole("dialog").waitFor({ state: "hidden" });
      await page.screenshot({ path: path.join(qa, `tour-${language}.png`) }); await page.close();
    }
  } finally { await browser.close(); }
});

test("refined chat motion settles, does not repeat on typing, and offers 44px primary/source targets", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const reducedMotion of ["no-preference", "reduce"] as const) {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion }); await setup(page);
      await page.getByRole("button", { name: "Open Bilal" }).click();
      const dialog = page.getByRole("dialog"); await page.getByRole("heading", { name: "Assalamu alaikum!" }).waitFor();
      await page.waitForTimeout(350);
      assert.equal(await dialog.evaluate(el => el.getAnimations({ subtree: true }).filter(a => a.playState === "running").length), 0);
      for (const name of ["Quick tour", "Close chat", "Today’s prayer times", "Quran Academy", "Donation options", "Contact the masjid"]) {
        const box = await dialog.getByRole("button", { name, exact: true }).boundingBox(); assert.ok(box && box.height >= 44 && box.width >= 44, name);
      }
      await dialog.getByRole("textbox").fill("contact");
      assert.equal(await dialog.evaluate(el => el.getAnimations({ subtree: true }).filter(a => a.playState === "running").length), 0, "typing never restarts entry motion");
      await dialog.getByRole("button", { name: "Send question" }).click();
      const source = dialog.getByRole("link", { name: "Contact the masjid", exact: true }); await source.waitFor();
      const box = await source.boundingBox(); assert.ok(box && box.height >= 44);
      await page.waitForTimeout(350); assert.equal(await dialog.evaluate(el => el.getAnimations({ subtree: true }).filter(a => a.playState === "running").length), 0);
      await dialog.getByRole("combobox").selectOption("ar"); await dialog.getByRole("heading", { name: "السلام عليكم!" }).waitFor();
      assert.equal(await dialog.getByRole("textbox").inputValue(), "");
      assert.equal(await dialog.getByText("Published information. <img src=x onerror=alert(1)>", { exact: true }).count(), 0, "language changes clear session-only old-language answers");
      await page.close();
    }
  } finally { await browser.close(); }
});
