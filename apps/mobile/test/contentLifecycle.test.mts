import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { chromium, type Page } from "playwright";
import path from "node:path";
import { defaultContent } from "@hbic/shared";

const root = path.resolve(import.meta.dirname, "../../..");
// Real provider/effects with controlled cache/network and native lifecycle adapters.
// No production data, push registrations or native device claims.
const bundled = build({ bundle: true, write: false, platform: "browser", format: "iife", jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"', "__DEV__": "false" },
  stdin: { resolveDir: root, loader: "tsx", contents: `import React from'react';import{createRoot}from'react-dom/client';import{flushSync}from'react-dom';import{PublishedContentProvider,usePublishedContent}from'./apps/mobile/src/services/content';
  function Probe(){const state=usePublishedContent();window.contentState=state;window.refreshContent=state.refresh;return <output data-testid="state">{JSON.stringify({loading:state.loading,source:state.source,error:state.refreshError})}</output>}
  const root=createRoot(document.getElementById('root'));window.unmount=()=>flushSync(()=>root.unmount());flushSync(()=>root.render(<PublishedContentProvider><Probe/></PublishedContentProvider>));` },
  plugins: [{ name: "content-lifecycle-adapters", setup(builder) {
    builder.onResolve({ filter: /^react-native$|\/publishedContent$|\/applePrayerBridge$|\/wearPrayerBridge$|\/notifications$/ }, args => {
      if (args.path === "react-native" || args.resolveDir === path.join(root, "apps/mobile/src/services")) return { path: args.path.split("/").pop()!, namespace: "fixture" };
    });
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ resolveDir: root, loader: "js", contents: {
      "react-native": `const listeners=new Set();export const AppState={currentState:'active',addEventListener(_,fn){listeners.add(fn);return{remove(){listeners.delete(fn)}}}};window.appState=value=>{AppState.currentState=value;listeners.forEach(fn=>fn(value))};window.lifecycleListeners=()=>listeners.size;`,
      publishedContent: `export const readCachedPublishedContent=async()=>{window.cacheReads++;if(window.cacheReads===1)return new Promise(resolve=>window.releaseInitialCache=resolve);return window.cachedPayload};export const fetchAndCachePublishedContent=()=>{window.fetchCalls++;return new Promise((resolve,reject)=>{window.resolveFetch=resolve;window.rejectFetch=()=>reject(Error('offline'))})};`,
      applePrayerBridge: "export const publishApplePrayerSnapshot=()=>{window.applePublishes++}",
      wearPrayerBridge: "export const publishWearPrayerSnapshot=()=>{window.wearPublishes++}",
      notifications: "export const reconcilePrayerNotificationsAsync=async()=>{window.notificationReconciles++}"
    }[args.path]! }));
  } }]
}).then(result => result.outputFiles[0].text);

async function setup(page: Page) {
  await page.setContent("<div id='root'></div>");
  await page.evaluate(content => Object.assign(window, { cacheReads: 0, fetchCalls: 0, applePublishes: 0, wearPublishes: 0, notificationReconciles: 0,
    cachedPayload: null, payload: { content, cachedAt: content.updatedAt } }), defaultContent);
  await page.addScriptTag({ content: await bundled });
  await page.waitForFunction(() => typeof (window as any).releaseInitialCache === "function");
}
async function state(page: Page) { return JSON.parse(await page.getByTestId("state").innerText()); }
async function settle(page: Page) { await page.waitForFunction(() => (window as any).contentState.loading === false); }

test("a foreground refresh winning the startup race clears initial loading for every joined caller", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage(); page.setDefaultTimeout(3000); await setup(page);
    await page.evaluate(() => (window as any).appState("active"));
    assert.equal(await page.evaluate(() => (window as any).fetchCalls), 1);
    await page.evaluate(() => (window as any).releaseInitialCache(null));
    await page.evaluate(() => { void (window as any).refreshContent(); });
    assert.equal(await page.evaluate(() => (window as any).fetchCalls), 1, "Startup/manual callers join the same foreground request");
    await page.evaluate(() => (window as any).resolveFetch((window as any).payload));
    await page.waitForFunction(() => (window as any).contentState.source === "api");
    assert.deepEqual(await state(page), { loading: false, source: "api", error: null });
    assert.deepEqual(await page.evaluate(() => [(window as any).applePublishes, (window as any).wearPublishes, (window as any).notificationReconciles]), [1, 1, 1]);
    await page.evaluate(() => (window as any).unmount());
    assert.equal(await page.evaluate(() => (window as any).lifecycleListeners()), 0);
  } finally { await browser.close(); }
});

test("normal startup and coalesced manual refreshes keep content identity and finish loading", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage(); await setup(page);
    await page.evaluate(() => (window as any).releaseInitialCache(null));
    await page.waitForFunction(() => (window as any).fetchCalls === 1);
    await page.evaluate(() => (window as any).resolveFetch((window as any).payload)); await settle(page);
    assert.deepEqual(await state(page), { loading: false, source: "api", error: null });
    await page.evaluate(() => { (window as any).originalContent = (window as any).contentState.content; });
    // The provider's existing foreground cooldown remains in force.
    await page.evaluate(() => (window as any).appState("active"));
    assert.equal(await page.evaluate(() => (window as any).fetchCalls), 1);
    await page.evaluate(() => { void (window as any).refreshContent(); void (window as any).refreshContent(); });
    assert.equal(await page.evaluate(() => (window as any).fetchCalls), 2);
    await page.evaluate(() => (window as any).resolveFetch((window as any).payload)); await settle(page);
    assert.equal(await page.evaluate(() => (window as any).contentState.content === (window as any).originalContent), true);
  } finally { await browser.close(); }
});

test("a failed foreground-first refresh settles initial loading with cache or honest unavailability", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const cached of [true, false]) {
      const page = await browser.newPage(); page.setDefaultTimeout(3000); await setup(page);
      await page.evaluate(cached => { const w = window as any; w.cachedPayload = cached ? w.payload : null; w.appState("active"); w.releaseInitialCache(w.cachedPayload); }, cached);
      await page.evaluate(() => (window as any).rejectFetch());
      await settle(page); const current = await state(page);
      assert.equal(current.source, cached ? "cache" : "bundled-fallback"); assert.ok(current.error);
      assert.equal(await page.evaluate(() => (window as any).fetchCalls), 1);
      if (!cached) assert.equal(await page.evaluate(() => (window as any).contentState.content.prayerTime.fajr), "", "Unavailable time must not turn into a guessed prayer time");
      await page.close();
    }
  } finally { await browser.close(); }
});
