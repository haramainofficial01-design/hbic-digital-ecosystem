import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { build } from "esbuild";
import { chromium } from "playwright";

test("real admin controls publish activation/disable silently, reject incomplete IDs, and preserve ordinary content signalling", async () => {
  const root = path.resolve(import.meta.dirname, "../../..");
  const result = await build({ write: false, bundle: true, platform: "browser", format: "iife", jsx: "automatic",
    define: { "process.env.NODE_ENV": '"production"', "process.env.NEXT_PUBLIC_API_URL": '"http://fixture.invalid"' },
    stdin: { resolveDir: root, loader: "tsx", contents: `
      import React from 'react';import{createRoot}from'react-dom/client';
      import{AdminDashboard}from'./apps/admin-web/components/AdminDashboard';
      import{normalizeContent,toPublicContent}from'@hbic/shared';
      let draft=normalizeContent(normalizeContent());let live={...draft,status:'published',version:1};
      window.qa={saves:[],publications:[],signals:0};
      window.fetch=async(url,init={})=>{
        const route=new URL(url).pathname;const body=init.body?JSON.parse(init.body):{};
        if(route==='/api/content/published')return Response.json({content:toPublicContent(live),backend:{mode:'fixture'}});
        if(route==='/api/admin/content/draft'){
          if(init.method==='POST'){window.qa.saves.push(body);draft=normalizeContent(body.content)}
          return Response.json({ok:true,content:draft,draftUpdatedAt:'fixture-draft',backend:{mode:'fixture'}});
        }
        if(route==='/api/admin/content/publish'){
          window.qa.publications.push(body);if(body.signalDevices!==false)window.qa.signals++;
          live={...draft,status:'published',version:live.version+1};
          return Response.json({ok:true,content:live,publication:{updatedAt:'fixture-draft'},backend:{mode:'fixture'},
            propagation:{status:body.signalDevices===false?'skipped_by_request':'accepted',successCount:0}});
        }
        throw Error('Unexpected network request in private rating QA: '+route);
      };
      createRoot(document.getElementById('root')).render(<AdminDashboard/>);` },
    plugins: [{ name: "private-admin-session", setup(builder) {
      builder.onResolve({ filter: /\.\/(FirebaseAdminAuth|AcademyPanel|QuranChallengesPanel)$/ }, args => ({ path: args.path, namespace: "fixture" }));
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ loader: "tsx", resolveDir: root, contents:
        args.path.endsWith("FirebaseAdminAuth")
          ? "import{useEffect}from'react';export function FirebaseAdminAuth({onSession}){useEffect(()=>onSession('Bearer private-fixture'),[onSession]);return null}"
          : `export function ${args.path.split("/").at(-1)}(){return null}`
      }));
    } }] });
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    page.on("dialog", dialog => dialog.accept());
    await page.setContent('<div id="root"></div>');
    await page.addScriptTag({ content: result.outputFiles[0].text });
    await page.getByRole("button", { name: "Load protected draft", exact: true }).click();
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    const campaignId = page.getByLabel("Campaign ID", { exact: true });
    await campaignId.fill("");
    assert.equal(await campaignId.inputValue(), "", "incomplete edits must not silently become a different campaign");
    await page.getByRole("button", { name: "Save Draft", exact: true }).click();
    await page.getByText("Enter a valid rating campaign ID before saving.", { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => (window as any).qa.saves.length), 0);
    await campaignId.fill("hbic-rating-2026-10");
    await page.getByLabel("Enable one-time invitation", { exact: true }).selectOption("enabled");
    await page.getByRole("button", { name: "Publish Changes", exact: true }).click();
    await page.getByText(/Published v2 and verified.*no push was sent/).waitFor();
    assert.equal(await page.evaluate(() => (window as any).qa.publications[0].signalDevices), false);
    assert.equal(await page.evaluate(() => (window as any).qa.saves[0].content.settings.ratingCampaign.enabled), true);
    await page.getByLabel("Enable one-time invitation", { exact: true }).selectOption("disabled");
    await page.getByRole("button", { name: "Publish Changes", exact: true }).click();
    await page.getByText(/Published v3 and verified.*no push was sent/).waitFor();
    assert.equal(await page.evaluate(() => (window as any).qa.signals), 0);
    assert.equal(await page.evaluate(() => (window as any).qa.saves[1].content.settings.ratingCampaign.enabled), false);
    await page.getByLabel("Phone", { exact: true }).fill("587-917-0334");
    await page.getByLabel("Enable one-time invitation", { exact: true }).selectOption("enabled");
    await page.getByRole("button", { name: "Publish Changes", exact: true }).click();
    await page.getByText(/Published v4, verified on the public API, and signalled/).waitFor();
    assert.equal(await page.evaluate(() => (window as any).qa.publications[2].signalDevices), true);
    assert.equal(await page.evaluate(() => (window as any).qa.signals), 1);
  } finally { await browser.close(); }
});
