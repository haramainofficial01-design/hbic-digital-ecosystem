import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { build } from "esbuild";

async function isolatedRoute() {
  const result = await build({ bundle: true, write: false, platform: "node", format: "esm", stdin: {
    resolveDir: path.resolve(import.meta.dirname, "../../.."),
    contents: "export * from './apps/public-web/app/api/admin/content/publish/route'"
  }, plugins: [{ name: "private-publication-fixture", setup(b) {
    b.onResolve({ filter: /lib\/(api|contentStore|notificationStore)$/ }, args => ({ path: args.path.split("/").at(-1)!, namespace: "fixture" }));
    b.onResolve({ filter: /^next\/cache$/ }, () => ({ path: "cache", namespace: "fixture" }));
    b.onResolve({ filter: /^@hbic\/shared$/ }, () => ({ path: "shared", namespace: "fixture" }));
    b.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ loader: "js", contents: {
      api: `export const jsonResponse=(body,init)=>Response.json(body,init);export const optionsResponse=()=>new Response(null,{status:204});export const requireAdminSecret=async request=>request.headers.get('Authorization')==='Bearer fixture-admin'?{ok:true}:{ok:false,response:Response.json({ok:false},{status:401})};`,
      contentStore: `export const publishDraftContent=async expected=>{globalThis.__ratingPublication.saved.push(expected);return{content:{version:2,publishedAt:'2026-10-13T17:00:00Z'},publication:{revision:'fixture-revision'},status:{mode:'fixture'}}};`,
      notificationStore: `export const sendContentUpdateSignal=async input=>{globalThis.__ratingPublication.signals.push(input);return{status:'accepted',successCount:1,failureCount:0}};`,
      cache: `export const revalidatePath=path=>globalThis.__ratingPublication.revalidated.push(path);`,
      shared: `export const publicRevalidationPaths=['/','/prayer'];export const createWidgetPrayerSnapshot=()=>({scheduleRevision:'fixture-schedule'});`
    }[args.path] ?? "" }));
  } }] });
  return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`);
}

test("authenticated rating-only publication saves and revalidates without any device push; ordinary propagation is unchanged", async () => {
  const state = { saved: [] as unknown[], signals: [] as unknown[], revalidated: [] as string[] };
  (globalThis as any).__ratingPublication = state;
  const route = await isolatedRoute();
  const request = (body: unknown, authorized = true) => new Request("https://fixture.invalid/api", {
    method: "POST", headers: { "Content-Type": "application/json", ...(authorized ? { Authorization: "Bearer fixture-admin" } : {}) }, body: JSON.stringify(body)
  });
  try {
    const silent = await route.POST(request({ signalDevices: false, expectedPublishedVersion: 1 }));
    assert.equal(silent.status, 200);
    assert.equal((await silent.json()).propagation.status, "skipped_by_request");
    assert.deepEqual(state.saved, [{ expectedDraftUpdatedAt: undefined, expectedPublishedVersion: 1 }]);
    assert.deepEqual(state.revalidated, ["/", "/prayer"]);
    assert.equal(state.signals.length, 0);
    assert.equal((await route.POST(request({ expectedPublishedVersion: 2 }))).status, 200);
    assert.equal(state.signals.length, 1, "ordinary content publication still signals devices");
    assert.equal((await route.POST(request({ signalDevices: true }))).status, 200);
    assert.equal(state.signals.length, 2);
    assert.equal((await route.POST(request({ signalDevices: false }, false))).status, 401);
    assert.equal((await route.POST(request({ signalDevices: "false" }))).status, 400);
    assert.equal((await route.POST(request(null))).status, 400);
    assert.equal((await route.POST(request([]))).status, 400);
    assert.equal(state.saved.length, 3);
    assert.equal(state.signals.length, 2, "invalid or unauthorized requests never publish/dispatch");
  } finally { delete (globalThis as any).__ratingPublication; }
});
