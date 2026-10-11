import { randomUUID } from "node:crypto";
import { challengeActive, challengeNickname, type QuranChallenge, type QuranChallengeEntry } from "@hbic/shared";

export interface ChallengeTransaction {
  get(path: string): Promise<any>;
  set(path: string, value: Record<string, unknown>): void;
  delete(path: string): void;
}
export interface ChallengeRepository { transaction<T>(job: (tx: ChallengeTransaction) => Promise<T>): Promise<T> }
const eventPath = (id: string) => `quranChallenges/${id}`;
const entryPath = (id: string, uid: string) => `${eventPath(id)}/participants/${uid}`;
const sessionPath = (uid: string) => `quranChallengeSessions/${uid}`;
type PrivateEntry = QuranChallengeEntry & { receipts?: { id: string; credited: number }[] };
export const maxChallengeSessionSeconds = 300;

/** Authenticated foreground time, bounded by the server's clock. This is NOT
 * proof of recitation accuracy or prize eligibility. Staff review is required. */
export function createQuranChallengeService(repo: ChallengeRepository, clock = Date.now) {
  return {
    join(id: string, uid: string, nickname: unknown, consent: unknown, adult: unknown) {
      if (consent !== true || adult !== true) throw new Error("Adults only: confirm public-nickname consent. Parents may participate under their own nickname.");
      const name = challengeNickname(nickname);
      return repo.transaction(async tx => {
        const event: QuranChallenge | undefined = await tx.get(eventPath(id));
        const old: PrivateEntry | undefined = await tx.get(entryPath(id, uid));
        if (!event || event.status !== "published" || clock() >= Date.parse(event.endsAt)) throw new Error("This event is not open for joining.");
        const entry = { nickname: name, seconds: old?.seconds ?? 0, joinedAt: old?.joinedAt ?? new Date(clock()).toISOString(), consentVersion: 1, receipts: old?.receipts ?? [] };
        tx.set(entryPath(id, uid), entry); return entry;
      });
    },
    leave(id: string, uid: string) {
      return repo.transaction(async tx => {
        const session = await tx.get(sessionPath(uid));
        tx.delete(entryPath(id, uid));
        if (session?.eventId === id) tx.delete(sessionPath(uid));
        return { left: true };
      });
    },
    start(id: string, uid: string) {
      return repo.transaction(async tx => {
        const event: QuranChallenge | undefined = await tx.get(eventPath(id));
        const entry = await tx.get(entryPath(id, uid));
        const old = await tx.get(sessionPath(uid));
        const now = clock();
        if (!event || !challengeActive(event, now) || !entry) throw new Error("Join an active published event first.");
        // Retry resumes the same server lease; starting twice cannot double-count.
        if (old?.eventId === id && old.expiresAt > now) return old as { id: string; eventId: string; startedAt: number; expiresAt: number };
        const session = { id: randomUUID(), eventId: id, startedAt: now, expiresAt: Math.min(now + maxChallengeSessionSeconds * 1000, Date.parse(event.endsAt)) };
        tx.set(sessionPath(uid), session); return session;
      });
    },
    finish(id: string, uid: string, sessionId: unknown, seconds: unknown) {
      if (typeof sessionId !== "string" || !/^[a-f0-9-]{36}$/.test(sessionId) || !Number.isInteger(seconds) || (seconds as number) < 0 || (seconds as number) > maxChallengeSessionSeconds)
        throw new Error("Invalid practice-time receipt.");
      return repo.transaction(async tx => {
        const event: QuranChallenge | undefined = await tx.get(eventPath(id));
        const entry: PrivateEntry | undefined = await tx.get(entryPath(id, uid));
        const session = await tx.get(sessionPath(uid));
        const receipt = entry?.receipts?.find(r => r.id === sessionId);
        if (!entry) throw new Error("Participation has been withdrawn; no practice time was added.");
        if (receipt) return { seconds: entry.seconds, credited: receipt.credited, replay: true };
        if (!event || event.status !== "published" || session?.id !== sessionId || session.eventId !== id) throw new Error("Practice session is no longer valid.");
        const now = clock(), elapsed = Math.max(0, Math.floor((Math.min(now, session.expiresAt, Date.parse(event.endsAt)) - session.startedAt) / 1000));
        const credited = Math.min(seconds as number, elapsed, maxChallengeSessionSeconds);
        // Bounded recovery log. Older replays fail closed because their server
        // lease no longer exists; they can never create another credit.
        tx.set(entryPath(id, uid), { ...entry, seconds: entry.seconds + credited,
          receipts: [...(entry.receipts ?? []), { id: sessionId, credited }].slice(-16) });
        tx.delete(sessionPath(uid));
        return { seconds: entry.seconds + credited, credited, replay: false };
      });
    }
  };
}
