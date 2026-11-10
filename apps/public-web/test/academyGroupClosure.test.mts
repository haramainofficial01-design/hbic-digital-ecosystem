import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import path from "node:path";

test("a one-day group closure keeps boys and mixed families scheduled, and private notices stay private", async () => {
  const result = await build({ bundle: true, write: false, platform: "node", format: "esm", stdin: { resolveDir: path.resolve(import.meta.dirname, "../../.."), contents: `export * from './apps/public-web/lib/academyContent'` }, plugins: [{ name: "calendar-fixture", setup(b) {
    b.onResolve({ filter: /^(server-only|firebase-admin\/firestore|\.\/academyStore)$/ }, a => ({ path: a.path, namespace: "fixture" }));
    b.onLoad({ filter: /.*/, namespace: "fixture" }, a => ({ loader: "js", contents: a.path === "./academyStore" ? `
      export class AcademyError extends Error{};
      export const academyDb=()=>({collection:n=>({limit:()=>({get:async()=>({docs:(n==='academyCalendar'?[{id:'closure',date:'2026-11-12',type:'event',classIds:[],cancelledAttendanceGroup:'girls',title:'Girls cancelled, boys as usual',note:''}]:n==='academyAnnouncements'?[{id:'notice',classIds:['private-family-notice'],familyIds:['authorized'],publishedAt:'2026-11-09T00:00:00Z',expiresAt:'2026-11-13T06:00:00Z'}]:[]).map(item=>({id:item.id,data:()=>item}))})})})});` : a.path === "firebase-admin/firestore" ? "export const FieldValue={};" : "" }));
  }}] });
  const { listAcademyContent } = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`);
  const before = Date.now; const originalDate = Date;
  globalThis.Date = class extends Date { constructor(...args: any[]) { super(args.length ? args[0] : "2026-11-10T18:00:00Z"); } static now() { return originalDate.parse("2026-11-10T18:00:00Z"); } } as DateConstructor;
  try {
    for (const groups of [["boys"], ["girls", "boys"], ["unassigned"], []]) {
      const data = await listAcademyContent(false, [], groups, "other");
      assert.deepEqual(data.calendar.filter(x => x.date === "2026-11-12").map(x => x.type), ["class"]);
      assert.equal(data.announcements.length, 0);
      assert.ok(data.calendar.some(x => x.date === "2026-11-19" && x.type === "class"));
    }
    const girls = await listAcademyContent(false, [], ["girls"], "authorized");
    assert.deepEqual(girls.calendar.filter(x => x.date === "2026-11-12").map(x => x.type), ["no_class"]);
    assert.equal(girls.announcements.length, 1); assert.equal("familyIds" in girls.announcements[0], false);
  } finally { globalThis.Date = originalDate; Date.now = before; }
});
