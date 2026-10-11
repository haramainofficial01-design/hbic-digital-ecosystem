import { jsonResponse, optionsResponse, requireAdminSecret } from "../../../../../lib/api";
import { challengeDatabase, invalidateQuranChallenges, quranChallengeService } from "../../../../../lib/quranChallenges";
import { validateChallenge, validChallengeId } from "@hbic/shared";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function OPTIONS() { return optionsResponse(); }
async function authorize(request: Request) {
  const auth = await requireAdminSecret(request);
  if (!auth.ok) return auth;
  if (auth.actor.kind !== "firebase-account" || !["superAdmin", "director"].includes(auth.actor.role))
    return { ok: false as const, response: jsonResponse({ ok: false, error: "Use an approved director or super administrator's personal account." }, { status: 403 }) };
  return auth;
}
export async function GET(request: Request) {
  const auth = await authorize(request); if (!auth.ok) return auth.response;
  try {
    const id = new URL(request.url).searchParams.get("id");
    if (id) {
      if (!validChallengeId(id)) throw new Error("Invalid event.");
      const docs = await challengeDatabase().collection(`quranChallenges/${id}/participants`).orderBy("seconds", "desc").limit(100).get();
      return jsonResponse({ ok: true, participants: docs.docs.map(doc => ({ uid: doc.id, nickname: doc.data().nickname, seconds: doc.data().seconds })) }, { headers: { "Cache-Control": "no-store" } });
    }
    const docs = await challengeDatabase().collection("quranChallenges").orderBy("startsAt", "desc").limit(40).get();
    return jsonResponse({ ok: true, events: docs.docs.map(doc => validateChallenge(doc.data())) }, { headers: { "Cache-Control": "no-store" } });
  } catch { return jsonResponse({ ok: false, error: "Challenge configuration is unavailable." }, { status: 503 }); }
}
export async function POST(request: Request) {
  const auth = await authorize(request); if (!auth.ok) return auth.response;
  try {
    const body = await request.json(), db = challengeDatabase();
    if (body.action === "removeParticipant") {
      if (!validChallengeId(body.eventId) || typeof body.uid !== "string" || !/^[a-zA-Z0-9_-]{1,128}$/.test(body.uid)) throw new Error("Invalid participant.");
      await quranChallengeService.leave(body.eventId, body.uid);
      return jsonResponse({ ok: true });
    }
    const event = validateChallenge(body.event);
    if (event.status === "published" && event.prizeDetails && body.prizeApproved !== true) throw new Error("Explicitly approve the prize details as an authorized staff member before publishing.");
    await db.runTransaction(async tx => {
      const ref = db.doc(`quranChallenges/${event.id}`), previous = (await tx.get(ref)).data();
      // Do not silently change the scoring window or reward terms mid-event.
      if (previous && Date.now() >= Date.parse(previous.startsAt)
        && ["startsAt", "endsAt", "season", "rules", "prizeDetails"].some(key => previous[key] !== event[key as keyof typeof event]))
        throw new Error("An event that has started keeps its dates, rules and prize details. Unpublish to stop participation, or create a new event.");
      tx.set(ref, { ...event, updatedAt: new Date().toISOString(), updatedBy: auth.actor.uid, prizeApprovedBy: event.status === "published" && event.prizeDetails ? auth.actor.uid : null });
    });
    invalidateQuranChallenges();
    return jsonResponse({ ok: true, event });
  } catch (error) { return jsonResponse({ ok: false, error: error instanceof Error ? error.message : "Challenge could not be saved." }, { status: 400 }); }
}
