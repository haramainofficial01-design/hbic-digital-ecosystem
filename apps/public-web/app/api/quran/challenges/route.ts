import { jsonResponse, optionsResponse } from "../../../../lib/api";
import { challengeDatabase, challengeUser, publishedQuranChallenges, quranChallengeService } from "../../../../lib/quranChallenges";
import { validChallengeId } from "@hbic/shared";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function OPTIONS() { return optionsResponse(); }
export async function GET(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return jsonResponse({ ok: true, events: (await publishedQuranChallenges()).filter(e => Date.parse(e.endsAt) > Date.now()) }, { headers: { "Cache-Control": "public, s-maxage=60, max-age=30" } });
    if (!validChallengeId(id)) return jsonResponse({ ok: false, error: "Invalid event." }, { status: 400 });
    const event = (await publishedQuranChallenges()).find(e => e.id === id);
    if (!event) return jsonResponse({ ok: false, error: "Event unavailable." }, { status: 404 });
    const participants = await challengeDatabase().collection(`quranChallenges/${id}/participants`).orderBy("seconds", "desc").limit(20).get();
    // No UID, email, recordings, recognized words or mistake history is public.
    const rows = participants.docs.map((doc, i) => ({ rank: i + 1, nickname: doc.data().nickname, seconds: doc.data().seconds }));
    let me = null;
    if (request.headers.has("authorization")) {
      const uid = await challengeUser(request), saved = await challengeDatabase().doc(`quranChallenges/${id}/participants/${uid}`).get();
      if (saved.exists) me = { nickname: saved.data()!.nickname, seconds: saved.data()!.seconds };
    }
    return jsonResponse({ ok: true, event, rows, me }, { headers: { "Cache-Control": "private, no-store" } });
  } catch { return jsonResponse({ ok: false, error: "Community challenges are unavailable. Sign in with a verified account for personal standings." }, { status: 503 }); }
}
export async function POST(request: Request) {
  try {
    if (Number(request.headers.get("content-length")) > 4096) throw new Error("Request is too large.");
    const uid = await challengeUser(request), body = await request.json();
    if (!validChallengeId(body.eventId)) throw new Error("Invalid event.");
    const { eventId } = body;
    switch (body.action) {
      case "join": return jsonResponse({ ok: true, entry: await quranChallengeService.join(eventId, uid, body.nickname, body.consent, body.adult) });
      case "leave": return jsonResponse({ ok: true, ...await quranChallengeService.leave(eventId, uid) });
      case "start": return jsonResponse({ ok: true, session: await quranChallengeService.start(eventId, uid) });
      case "finish": return jsonResponse({ ok: true, ...await quranChallengeService.finish(eventId, uid, body.sessionId, body.seconds) });
      default: throw new Error("Unknown action.");
    }
  } catch (error) { return jsonResponse({ ok: false, error: error instanceof Error ? error.message : "Challenge action failed." }, { status: 400 }); }
}
