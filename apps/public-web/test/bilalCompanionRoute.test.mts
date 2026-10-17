import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import path from "node:path";
import { defaultContent, normalizeContent } from "@hbic/shared";

async function isolatedRoute() {
  const result = await build({ bundle: true, write: false, platform: "node", format: "esm", stdin: { resolveDir: path.resolve(import.meta.dirname, "../../.."), contents: "export * from './apps/public-web/app/api/assistant/route'" }, plugins: [{ name: "public-content-fixture", setup(b) {
    b.onResolve({ filter: /lib\/(contentStore|quranRelease)$/ }, args => ({ path: args.path.split("/").at(-1)!, namespace: "fixture" }));
    b.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ loader: "js", contents: args.path === "contentStore" ? "export const getPublishedContent=async()=>{const s=globalThis.__companion; if(s.fail)throw Error('SECRET_INTERNAL_ERROR');return {content:s.content,status:{configured:s.ready}}}" : "export const isQuranPublicEnabled=()=>true" }));
  } }] });
  return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}#${Math.random()}`);
}

test("read-only route handles current public information, private handoff, fee evidence, kill switch, bounded input and rate limiting", async () => {
  const state = { content: normalizeContent(defaultContent), ready: true, fail: false, billing: true, fetches: [] as string[] };
  (globalThis as any).__companion = state;
  const previousFetch = globalThis.fetch, previousAcademy = process.env.ACADEMY_PREVIEW_ENABLED;
  process.env.ACADEMY_PREVIEW_ENABLED = "true";
  globalThis.fetch = async url => { state.fetches.push(String(url)); assert.equal(String(url), "https://hbic.ca/api/academy/billing", "No external model or private endpoint is permitted"); if (!state.billing) throw Error("offline"); return Response.json({ ok: true, monthlyCents: 6100, tuitionMode: "per_child" }); };
  try {
    const route = await isolatedRoute();
    const send = (value: unknown, ip = "fixture") => route.POST(new Request("https://hbic.ca/api/assistant", { method: "POST", headers: { "Content-Type": "application/json", "x-vercel-forwarded-for": ip }, body: JSON.stringify(value) }));
    const caps = await route.GET(); assert.equal(caps.headers.get("cache-control"), "private, no-store"); assert.equal((await caps.json()).externalAI, false);
    const contact = await send({ question: "contact the office" }); assert.equal(contact.status, 200); assert.match((await contact.json()).answer, /phone/); assert.equal(state.fetches.length, 0);
    const personal = await send({ question: "my child academy payment" }); assert.equal((await personal.json()).needsHuman, true); assert.equal(state.fetches.length, 0);
    const tuition = await send({ question: "Academy tuition" }); assert.match((await tuition.json()).answer, /61.00 CAD/); assert.equal(state.fetches.length, 1);
    await send({ question: "academy fees" }); assert.equal(state.fetches.length, 1, "public fee cache avoids repeated billing work");
    for (const input of [{ question: "x", useAI: true }, { question: "x", admin: true }, { question: "x".repeat(801) }, { question: "x", previousQuestions: Array(5).fill("q") }, null, []]) assert.equal((await send(input)).status, 400);
    assert.equal((await send({ question: "x".repeat(13_000) })).status, 400);
    const wrongType = await route.POST(new Request("https://hbic.ca/api/assistant", { method: "POST", headers: { "Content-Type": "text/plain" }, body: "hello" })); assert.equal(wrongType.status, 400);
    state.content.featureFlags.bilalCompanionEnabled = false; assert.equal((await send({ question: "contact" })).status, 503); assert.equal((await (await route.GET()).json()).enabled, false);
    state.content.featureFlags.bilalCompanionEnabled = true; state.ready = false; assert.match((await (await send({ question: "prayer times" })).json()).answer, /can’t verify/);
    state.fail = true; const unavailable = await send({ question: "contact" }); assert.equal(unavailable.status, 503); assert.doesNotMatch(await unavailable.text(), /SECRET_INTERNAL_ERROR/); state.fail = false;
    for (let i = 0; i < 60; i++) assert.equal((await send({ question: "contact" }, "rate-fixture")).status, 200);
    const rate = await send({ question: "contact" }, "rate-fixture"); assert.equal(rate.status, 429); assert.ok(Number(rate.headers.get("retry-after")) > 0);
    state.ready = true; state.billing = false; const offlineRoute = await isolatedRoute();
    const offline = await offlineRoute.POST(new Request("https://hbic.ca/api/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: "academy tuition" }) }));
    assert.match((await offline.json()).answer, /can’t verify a current fee/);
  } finally { globalThis.fetch = previousFetch; if (previousAcademy === undefined) delete process.env.ACADEMY_PREVIEW_ENABLED; else process.env.ACADEMY_PREVIEW_ENABLED = previousAcademy; delete (globalThis as any).__companion; }
});
