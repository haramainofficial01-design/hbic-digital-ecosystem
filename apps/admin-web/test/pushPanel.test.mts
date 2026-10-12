import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { build } from "esbuild";
import { chromium } from "playwright";
const root = path.resolve(import.meta.dirname, "../../..");
test("admin private test targets only paired device, busy controls prevent double send and receipts are labelled honestly", async () => {
  const built = await build({ write: false, bundle: true, platform: "browser", format: "iife", jsx: "automatic", define: { "process.env.NODE_ENV": '"production"' }, stdin: { resolveDir: root, loader: "tsx", contents: `import React from'react';import{createRoot}from'react-dom/client';import{PushPanel}from'./apps/admin-web/components/AdminDashboard';window.requests=[];window.fail=false;window.confirm=()=>true;crypto.randomUUID=()=> 'fixture-unique-request-1234';async function request(path,init){const body=JSON.parse(init.body);window.requests.push({path,body});if(window.fail)throw Error('Temporary network error');if(path.endsWith('/receipts'))return{result:{acceptedCount:1,deliveredCount:1,failedCount:0,pendingCount:0,status:'delivered'}};return{result:{logId:'fixture-log',acceptedCount:1,failureCount:0,pendingCount:1,status:'accepted'}}}createRoot(document.getElementById('root')).render(<PushPanel adminRequest={request} disabled={false}/>);` }, plugins: [{ name: "unrelated-panels-not-under-test", setup(b) {
    b.onResolve({ filter: /\.\/(FirebaseAdminAuth|AcademyPanel|QuranChallengesPanel)$/ }, args => ({ path: args.path.split("/").at(-1)!, namespace: "fixture" }));
    b.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: `export const ${args.path}=()=>null`, loader: "js" }));
  } }] });
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
    page.on("pageerror", error => { throw new Error(`Admin fixture render: ${error.message}`); });
    await page.setContent(`<style>*{box-sizing:border-box}body{margin:0;font-family:system-ui}.card{padding:18px;border:1px solid #ccc}.field{display:grid;margin:8px 0}input,textarea,select{max-width:100%;min-height:44px}button{min-height:44px}</style><div id="root"></div><script>window.process={env:{}};${built.outputFiles[0].text}</script>`);
    const testButton = page.getByRole("button", { name: "Send Test to My Device", exact: true });
    assert.equal(await testButton.isDisabled(), true);
    await page.getByLabel("My device test code").fill("123456ABCDEF");
    await testButton.click();
    const calls = await page.evaluate(() => (window as any).requests);
    assert.equal(calls.length, 1); assert.equal(calls[0].path, "/api/admin/notifications/test");
    assert.equal(calls[0].body.code, "123456ABCDEF"); assert.equal(Object.hasOwn(calls[0].body, "token"), false);
    await page.getByRole("button", { name: "Check delivery" }).click();
    await page.getByRole("status").filter({ hasText: "Delivered: 1" }).waitFor();
    await page.getByText("Accepted = Expo queued it. Delivered = APNs/FCM receipt. Banner, sound and tap behavior must be checked on the phone.", { exact: true }).waitFor();
    await page.evaluate(() => { (window as any).fail = true; });
    await page.getByRole("button", { name: "Send notification", exact: true }).click();
    await page.getByText("Temporary network error", { exact: true }).waitFor();
    await page.evaluate(() => { (window as any).fail = false; });
    await page.getByRole("button", { name: "Send notification", exact: true }).click();
    const sends = await page.evaluate(() => (window as any).requests.filter((request: any) => request.path.endsWith("/send")));
    assert.equal(sends.length, 2); assert.equal(sends[0].body.requestId, sends[1].body.requestId, "retry same send request");
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  } finally { await browser.close(); }
});
