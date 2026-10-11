export type QuranChallengeSeason = "ramadan" | "dhul-hijjah" | "community";
export interface QuranChallenge {
  id: string; title: string; season: QuranChallengeSeason; startsAt: string; endsAt: string;
  rules: string; prizeDetails: string; status: "draft" | "published";
}
export interface QuranChallengeEntry { nickname: string; seconds: number; joinedAt: string; consentVersion: 1 }
export const validChallengeId = (id: unknown): id is string => typeof id === "string" && /^[a-z0-9][a-z0-9-]{2,59}$/.test(id);
export function challengeActive(event: QuranChallenge, now = Date.now()) {
  return event.status === "published" && now >= Date.parse(event.startsAt) && now < Date.parse(event.endsAt);
}
export function validateChallenge(value: unknown): QuranChallenge {
  const e = value as QuranChallenge;
  if (!e || !validChallengeId(e.id) || !["ramadan", "dhul-hijjah", "community"].includes(e.season)
    || typeof e.title !== "string" || e.title.trim().length < 3 || e.title.length > 100
    || typeof e.rules !== "string" || e.rules.trim().length < 30 || e.rules.length > 5000
    || typeof e.prizeDetails !== "string" || e.prizeDetails.length > 1500
    || !["draft", "published"].includes(e.status)
    || !/^\d{4}-\d\d-\d\dT.*Z$/.test(e.startsAt) || !/^\d{4}-\d\d-\d\dT.*Z$/.test(e.endsAt)
    || !Number.isFinite(Date.parse(e.startsAt)) || !Number.isFinite(Date.parse(e.endsAt))
    || Date.parse(e.endsAt) <= Date.parse(e.startsAt) || Date.parse(e.endsAt) - Date.parse(e.startsAt) > 120 * 86400000)
    throw new Error("Provide a valid title, season, dates and published rules. Maximum event length is 120 days.");
  return { id: e.id, title: e.title.trim(), season: e.season, startsAt: new Date(e.startsAt).toISOString(), endsAt: new Date(e.endsAt).toISOString(),
    rules: e.rules.trim(), prizeDetails: e.prizeDetails.trim(), status: e.status };
}
export function challengeNickname(value: unknown) {
  if (typeof value !== "string") throw new Error("Choose a nickname.");
  const nickname = value.normalize("NFKC").trim().replace(/\s+/g, " ");
  if (nickname.length < 3 || nickname.length > 24 || !/^[\p{L}\p{N} _-]+$/u.test(nickname) || /\d{6}|https?|www|email/i.test(nickname))
    throw new Error("Use a 3–24 character nickname without contact details or links.");
  return nickname;
}
