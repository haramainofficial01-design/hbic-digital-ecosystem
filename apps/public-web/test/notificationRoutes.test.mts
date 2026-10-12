import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import path from "node:path";
const root = path.resolve(import.meta.dirname, "../../..");
async function route(name: string) {
  const result = await build({ bundle: true, write: false, platform: "node", format: "esm", stdin: { resolveDir: root, contents: `export * from './apps/public-web/app/api/admin/notifications/${name}/route'` }, plugins: [{ name: "isolated-auth-and-send-adapter", setup(b) {
    b.onResolve({ filter: /lib\/api$/ }, () => ({ path: "api", namespace: "fixture" }));
    b.onResolve({ filter: /lib\/notificationStore$/ }, () => ({ path: "store", namespace: "fixture" }));
    b.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: args.path === "api"
      ? `export const jsonResponse=(body,init)=>Response.json(body,init);export const optionsResponse=()=>new Response(null,{status:204});export const requireAdminSecret=async request=>request.headers.get('Authorization')==='Bearer fixture-admin'?{ok:true,actor:{email:'admin@example.invalid'}}:{ok:false,response:Response.json({ok:false},{status:401})};export const requirePrivateNotificationTestSecret=()=>({ok:false,response:Response.json({ok:false},{status:401})});`
      : `export class NotificationInputError extends Error{};export const sendPushNotification=async input=>{globalThis.__notificationRouteInputs.push(input);return{logId:'fixture-log',successCount:1}};export const sendPrivatePushTestCode=sendPushNotification;export const sendPrivatePushTest=sendPushNotification;export const checkPushNotificationReceipts=async()=>({deliveredCount:0,pendingCount:1});`, loader: "js" }));
  } }] });
  return import(`data:text/javascript;base64,${Buffer.from(`${result.outputFiles[0].text}\n// ${name}`).toString("base64")}`);
}
test("authenticated admin route omits undefined data and unauthenticated callers cannot dispatch", async () => {
  const inputs: any[] = []; (globalThis as any).__notificationRouteInputs = inputs;
  const send = await route("send"), privateTest = await route("test");
  const request = (body: object, authorized = true) => new Request("https://fixture.invalid/api", { method: "POST", headers: { "Content-Type": "application/json", ...(authorized ? { Authorization: "Bearer fixture-admin" } : {}) }, body: JSON.stringify(body) });
  try {
    assert.equal((await send.POST(request({ title: "Community", body: "Fixture", requestId: "fixture-request-0001" }))).status, 200);
    assert.equal(Object.hasOwn(inputs[0], "data"), false);
    assert.equal(inputs[0].actorKey, "admin@example.invalid");
    assert.equal((await send.POST(request({ title: "Event", body: "Fixture", route: "/events", eventId: "event-fixture" }))).status, 200);
    assert.deepEqual(inputs[1].data, { eventId: "event-fixture" });
    assert.equal((await send.POST(request({ title: "No", body: "Fixture" }, false))).status, 401);
    assert.equal((await privateTest.POST(request({ platform: "ios" }))).status, 400, "never defaults to latest registered phone");
    assert.equal((await privateTest.POST(request({ code: "123456ABCDEF" }, false))).status, 401);
    assert.equal(inputs.length, 2);
    assert.equal((await privateTest.POST(request({ code: "123456ABCDEF", requestId: "private-request-0001" }))).status, 200);
    assert.equal(inputs.length, 3);
  } finally { delete (globalThis as any).__notificationRouteInputs; }
});
