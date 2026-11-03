import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import path from "node:path";

test("staff child cancellation authenticates, restricts roles and passes the selected family, child and reason", async () => {
  const result = await build({ bundle: true, write: false, platform: "node", format: "esm",
    stdin: { loader: "ts", resolveDir: path.resolve(import.meta.dirname, "../../.."), contents: `export{POST}from'./apps/public-web/app/api/admin/academy/cancel-child/route';export{state}from'fixture-state';` },
    plugins: [{ name: "isolated-cancellation-boundary", setup(b) {
      b.onResolve({ filter: /fixture-state$|lib\/academyStore$|lib\/academyStripe$|lib\/api$/ }, a => ({ path: a.path.endsWith("academyStore") ? "store" : a.path.endsWith("academyStripe") ? "stripe" : a.path.endsWith("/api") ? "api" : "state", namespace: "fixture" }));
      b.onLoad({ filter: /.*/, namespace: "fixture" }, a => ({ loader: "ts", contents: {
        state: `export const state={role:'director',authenticated:true,calls:[]};`,
        store: `import{state}from'fixture-state';export class AcademyError extends Error{constructor(message,status=400){super(message);this.status=status}};export async function academyAdmin(){if(!state.authenticated)throw new AcademyError('Sign in',401);return{uid:'staff-fixture',role:state.role}};`,
        stripe: `import{state}from'fixture-state';export async function cancelAcademyChild(family,child,actor){state.calls.push({family,child,actor});return{effectiveAt:'2026-12-01T06:00:00Z',family:{id:family}}}`,
        api: `export const jsonResponse=(value,init)=>new Response(JSON.stringify(value),{...init,headers:{'Content-Type':'application/json',...init?.headers}});export const optionsResponse=()=>new Response(null,{status:204});`
      }[a.path]! }));
    } }] });
  const { POST, state } = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`);
  const request = (familyId = "family-fixture") => new Request("https://fixture.invalid/api/admin/academy/cancel-child", { method: "POST", body: JSON.stringify({ familyId, childId: "child-fixture", reason: "Parent requested cancellation" }) });
  state.authenticated = false; assert.equal((await POST(request())).status, 401);
  state.authenticated = true;
  for (const role of ["editor", "caretaker"]) { state.role = role; assert.equal((await POST(request())).status, 403); }
  state.role = "director"; assert.equal((await POST(request("bad/path"))).status, 400);
  assert.equal(state.calls.length, 0);
  for (const role of ["director", "superAdmin"]) {
    state.role = role; const response = await POST(request());
    assert.equal(response.status, 200); assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal((await response.json()).effectiveAt, "2026-12-01T06:00:00Z");
  }
  assert.deepEqual(state.calls[0], { family: "family-fixture", child: "child-fixture", actor: { uid: "staff-fixture", reason: "Parent requested cancellation", endNow: false } });
});
