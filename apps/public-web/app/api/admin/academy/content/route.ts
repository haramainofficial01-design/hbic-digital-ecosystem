import { academyAdmin, AcademyError } from "../../../../../lib/academyStore";
import { assignAcademyChild, listAcademyContent, saveAcademyItem } from "../../../../../lib/academyContent";
import { sendAcademyUpdate } from "../../../../../lib/academyNotifications";
import { createHash } from "node:crypto";
import { jsonResponse, optionsResponse } from "../../../../../lib/api";

export const dynamic = "force-dynamic";
export function OPTIONS() { return optionsResponse(); }
export async function GET(request: Request) {
  try { await academyAdmin(request); return jsonResponse({ ok: true, content: await listAcademyContent(true) }); }
  catch (error) { return jsonResponse({ ok: false, error: error instanceof Error ? error.message : "Unavailable." }, { status: error instanceof AcademyError ? error.status : 500 }); }
}
export async function POST(request: Request) {
  try {
    const actor = await academyAdmin(request);
    const body = await request.json() as { kind?: unknown; item?: unknown; id?: unknown; familyId?: unknown; childId?: unknown; classId?: unknown };
    if (body.kind === "assignment") {
      await assignAcademyChild(String(body.familyId ?? ""), String(body.childId ?? ""), String(body.classId ?? ""), actor.uid);
      return jsonResponse({ ok: true });
    }
    if (body.kind !== "class" && body.kind !== "calendar" && body.kind !== "announcement") throw new AcademyError("Invalid Academy item type.");
    const item = await saveAcademyItem(body.kind, body.item, actor.uid, typeof body.id === "string" ? body.id : undefined);
    let notification: unknown = null;
    if (body.kind === "announcement" || body.kind === "calendar" && "type" in item && ["no_class", "holiday", "time_changed", "special_class"].includes(String(item.type))) {
      try {
        notification = await sendAcademyUpdate({ eventKey: createHash("sha256").update(JSON.stringify({ kind: body.kind, item })).digest("hex"),
          title: body.kind === "announcement" ? String(item.title ?? "Academy update") : `Academy schedule: ${item.title}`,
          body: "message" in item ? String(item.message ?? "") : `${"date" in item ? item.date : ""} · ${"note" in item ? item.note || item.title : item.title}`,
          classIds: "classIds" in item && Array.isArray(item.classIds) ? item.classIds : [], kind: body.kind });
      } catch (error) {
        // The content is saved even if the push provider is temporarily down.
        notification = { status: "provider_error", error: error instanceof Error ? error.message : "Notification delivery failed." };
      }
    }
    return jsonResponse({ ok: true, item, notification });
  } catch (error) { return jsonResponse({ ok: false, error: error instanceof Error ? error.message : "Unable to save Academy content." }, { status: error instanceof AcademyError ? error.status : 500 }); }
}
