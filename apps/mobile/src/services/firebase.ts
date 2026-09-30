import { getApps, initializeApp } from "firebase/app";
import { getAuth, initializeAuth, type Auth } from "firebase/auth";
// Metro resolves Firebase's React Native entry, whose export is absent from
// the package's browser-oriented TypeScript declaration.
// @ts-expect-error React Native-only Firebase Auth export
import { getReactNativePersistence } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID
};

export const firebaseApp = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

// React Native has no web-style session storage: plain getAuth() keeps the
// parent signed in only in memory, so every relaunch used to start signed
// out. Persist the Firebase user in AsyncStorage so verification (and sign-in)
// survives restarts — the Academy screen reloads the cached user and
// force-refreshes the token on launch/foreground instead of trusting it.
let auth: Auth;
try {
  auth = initializeAuth(firebaseApp, { persistence: getReactNativePersistence(AsyncStorage) });
} catch {
  auth = getAuth(firebaseApp);
}
export { auth };
