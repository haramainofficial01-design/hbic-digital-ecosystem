import { getApps, initializeApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

let cachedAuth: Auth | null | undefined;

export function getAdminAuth(): Auth | null {
  if (cachedAuth !== undefined) return cachedAuth;
  if (typeof window === "undefined" || !firebaseConfig.apiKey || !firebaseConfig.projectId) return null;
  try {
    const firebaseApp = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    cachedAuth = getAuth(firebaseApp);
  } catch {
    cachedAuth = null;
  }
  return cachedAuth;
}
