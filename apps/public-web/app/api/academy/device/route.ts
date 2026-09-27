import { createHash } from "node:crypto";
import { academyDb, academyParent, AcademyError } from "../../../../lib/academyStore";
import { jsonResponse, optionsResponse } from "../../../../lib/api";

export const dynamic = "force-dynamic";
export function OPTIONS() { return optionsResponse(); }
const tokenPattern = /^(Exponent|Expo)PushToken\[[^\]]+\]$/;
const id = (token: string) => createHash("sha256").update(token).digest("hex");

async function change(request: Request, remove: boolean) {
  try {
    const parent = await academyParent(request);
    const body = await request.json() as { token?: unknown; platform?: unknown; reminderDelivery?: unknown };
    const token = String(body.token ?? "");
    if (!tokenPattern.test(token) || token.length > 240) throw new AcademyError("A valid app notification token is required.");
    const platform = body.platform === "ios" || body.platform === "android" ? body.platform : "unknown";
    const db = academyDb();
    const familyRef = db.collection("academyFamilies").doc(parent.uid);
    const ownerRef = db.collection("academyDeviceOwners").doc(id(token));
    const deviceRef = familyRef.collection("devices").doc(id(token));
    await db.runTransaction(async (tx) => {
      const [family, owner] = await Promise.all([tx.get(familyRef), tx.get(ownerRef)]);
      if (!family.exists) throw new AcademyError("Register for Academy before enabling updates.", 404);
      if (remove) {
        if (owner.data()?.uid === parent.uid) { tx.delete(ownerRef); tx.delete(deviceRef); }
        return;
      }
      const previousUid = owner.data()?.uid;
      if (typeof previousUid === "string" && previousUid !== parent.uid) {
        tx.delete(db.collection("academyFamilies").doc(previousUid).collection("devices").doc(id(token)));
      }
      tx.set(ownerRef, { uid: parent.uid, updatedAt: new Date().toISOString() });
      tx.set(deviceRef, { token, platform, enabled: true,
        reminderDelivery: body.reminderDelivery === "server" && process.env.ACADEMY_SERVER_CASH_REMINDERS === "true" ? "server" : "local",
        updatedAt: new Date().toISOString() });
    });
    return jsonResponse({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return jsonResponse({ ok: false, error: error instanceof Error ? error.message : "Device update failed." },
      { status: error instanceof AcademyError ? error.status : 500 });
  }
}
export async function POST(request: Request) { return change(request, false); }
export async function DELETE(request: Request) { return change(request, true); }
