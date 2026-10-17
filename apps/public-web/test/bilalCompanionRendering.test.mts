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
  } }] });
  return { js: result.outputFiles.find(f => f.path.endsWith(".js"))!.text, css: result.outputFiles.find(f => f.path.endsWith(".css"))!.text };
}
const bundled = bundle();
async function setup(page: Page, pathname = "/") {
  const assets = await bundled;
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
      await page.getByRole("button", { name: "Open Bilal Companion" }).waitFor();
      assert.equal(await page.getByRole("dialog").count(), 0, "never auto-open");
      await page.getByRole("button", { name: "Open Bilal Companion" }).click();
      const dialog = page.getByRole("dialog"); await dialog.waitFor();
      const box = await dialog.boundingBox(); assert.ok(box && box.x >= 0 && box.y >= 0 && box.x + box.width <= width + 1 && box.y + box.height <= height + 1, JSON.stringify({ width, height, box }));
      assert.equal(await page.locator(".site").evaluate(el => (el as HTMLElement).inert), true);
      await page.getByLabel("Your question", { exact: true }).fill("contact"); await page.getByRole("button", { name: "Send question" }).click();
      await page.getByText("Published information. <img src=x onerror=alert(1)>", { exact: true }).waitFor();
      assert.equal(await dialog.locator("img").count(), 0); assert.equal(await page.getByRole("link", { name: "Unsafe link" }).count(), 0);
      assert.equal(await page.getByRole("link", { name: "Contact the masjid", exact: true }).getAttribute("href"), "https://hbic.ca/contact");
      await dialog.getByRole("link", { name: "Contact the office", exact: true }).focus(); await page.keyboard.press("Tab");
      assert.equal(await dialog.getByRole("button", { name: "Clear chat", exact: true }).evaluate(el => document.activeElement === el), true);
      await page.keyboard.press("Escape"); assert.equal(await dialog.count(), 0); assert.equal(await page.locator(".site").evaluate(el => (el as HTMLElement).inert), false);
      assert.equal(await page.getByRole("button", { name: "Open Bilal Companion" }).evaluate(el => document.activeElement === el), true);
      await page.getByRole("button", { name: "Open Bilal Companion" }).click(); await page.getByRole("button", { name: "Clear chat", exact: true }).click();
      assert.equal(await page.getByText("Published information. <img src=x onerror=alert(1)>", { exact: true }).count(), 0);
      await page.screenshot({ path: path.join(qa, `${width}-${mode}.png`) }); await page.close();
    }
    console.log(`Website companion screenshots: ${qa}`);
  } finally { await browser.close(); }
});
test("route changes abort pending work; unavailable results are honest; session is not saved", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage(); await setup(page);
    await page.getByRole("button", { name: "Open Bilal Companion" }).click();
    await page.evaluate(() => { (window as any).replyError = true; });
    await page.getByLabel("Your question", { exact: true }).fill("question"); await page.getByRole("button", { name: "Send question" }).click();
    await page.getByRole("alert").waitFor(); assert.match(await page.getByRole("alert").innerText(), /try again/);
    await page.evaluate(() => { (window as any).replyError = false; (window as any).pending = true; });
    await page.getByLabel("Your question", { exact: true }).fill("pending question"); await page.getByRole("button", { name: "Send question" }).click();
    await page.evaluate(() => (window as any).route("/quran")); assert.equal(await page.getByRole("dialog").count(), 0); assert.equal(await page.getByRole("button", { name: "Open Bilal Companion" }).count(), 0);
    assert.equal(await page.locator(".site").evaluate(el => (el as HTMLElement).inert), false);
    for (const route of ["/quran-academy", "/donate", "/display"]) { await page.evaluate(value => (window as any).route(value), route); assert.equal(await page.getByRole("button", { name: "Open Bilal Companion" }).count(), 0); }
    await setup(page); await page.getByRole("button", { name: "Open Bilal Companion" }).click(); assert.equal(await page.getByText("pending question", { exact: true }).count(), 0);
  } finally { await browser.close(); }
});
