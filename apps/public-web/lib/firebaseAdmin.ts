import { cert, getApps, initializeApp, type App } from "firebase-admin/app";

function normalizePrivateKey(value?: string) {
  return value?.replace(/\\n/g, "\n");
}

export function getFirebaseApp(): App | null {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const credentialJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  const hasCredentialFile = Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS);
  const hasServiceAccount = Boolean(process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY);
  if (!projectId && !credentialJson) return null;
  if (!credentialJson && !hasCredentialFile && !hasServiceAccount) return null;

  const existing = getApps()[0];
  if (existing) return existing;

  if (credentialJson) {
    const parsed = JSON.parse(credentialJson) as {
      project_id?: string;
      client_email?: string;
      private_key?: string;
    };
    return initializeApp({
      credential: cert({
        projectId: parsed.project_id || projectId,
        clientEmail: parsed.client_email,
        privateKey: normalizePrivateKey(parsed.private_key)
      })
    });
  }

  if (hasServiceAccount) {
    return initializeApp({
      credential: cert({
        projectId,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY)
      })
    });
  }

  return initializeApp({ projectId });
}
