import "server-only";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getFirebaseApp } from "./firebaseAdmin";
import { createQuranChallengeService, type ChallengeRepository } from "./quranChallengeService";
import { createReadCache } from "./readCache";
import { validateChallenge, type QuranChallenge } from "@hbic/shared";
export function challengeDatabase() {
  const app = getFirebaseApp(); if (!app) throw new Error("Community challenges are not configured on this deployment.");
  return getFirestore(app);
}
export async function challengeUser(request: Request) {
  const bearer = request.headers.get("authorization");
  if (!bearer?.startsWith("Bearer ")) throw new Error("Sign in with your verified account to participate.");
  const app = getFirebaseApp(); if (!app) throw new Error("Community challenges are not configured on this deployment.");
  const user = await getAuth(app).verifyIdToken(bearer.slice(7));
  if (!user.email_verified || !user.email || !/^[a-zA-Z0-9_-]{1,128}$/.test(user.uid)) throw new Error("Verify your account email before participating.");
  return user.uid;
}
const repository: ChallengeRepository = {
  transaction: job => {
    const db = challengeDatabase();
    return db.runTransaction(tx => job({ get: async path => (await tx.get(db.doc(path))).data(),
      set: (path, value) => { tx.set(db.doc(path), value); }, delete: path => { tx.delete(db.doc(path)); } }));
  }
};
export const quranChallengeService = createQuranChallengeService(repository);
const cache = createReadCache<QuranChallenge[]>(async () => {
    const docs = await challengeDatabase().collection("quranChallenges").where("status", "==", "published").limit(40).get();
    return docs.docs.flatMap(doc => { try { return [validateChallenge(doc.data())]; } catch { return []; } })
      .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
  }, 60_000);
export async function publishedQuranChallenges() {
  return cache.get();
}
export function invalidateQuranChallenges() { cache.clear(); }
