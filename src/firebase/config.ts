import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, OAuthProvider, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.appId
);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

if (isFirebaseConfigured) {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  auth = getAuth(app);
  db = getFirestore(app);
}

export function createMicrosoftProvider(): OAuthProvider {
  const provider = new OAuthProvider('microsoft.com');
  const tenantId = import.meta.env.VITE_MICROSOFT_TENANT_ID;
  if (tenantId) {
    provider.setCustomParameters({
      tenant: tenantId,
      prompt: 'select_account',
    });
  } else {
    provider.setCustomParameters({
      prompt: 'select_account',
    });
  }
  return provider;
}

export function isAuthorizedAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();

  const allowedEmailsRaw = import.meta.env.VITE_ALLOWED_ADMIN_EMAILS as string | undefined;
  if (allowedEmailsRaw && allowedEmailsRaw.trim().length > 0) {
    const list = allowedEmailsRaw
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    if (list.includes(normalized)) return true;
  }

  const allowedDomainRaw = import.meta.env.VITE_ALLOWED_ADMIN_DOMAIN as string | undefined;
  if (allowedDomainRaw && allowedDomainRaw.trim().length > 0) {
    const domains = allowedDomainRaw
      .split(',')
      .map((d) => d.trim().toLowerCase().replace(/^@/, ''))
      .filter(Boolean);
    if (domains.some((domain) => normalized.endsWith(`@${domain}`))) {
      return true;
    }
    if (!allowedEmailsRaw) return false;
  }

  // Ha sem domain, sem email lista nincs beállítva, bármely sikeres Microsoft belépés engedélyezett
  if (!allowedDomainRaw && !allowedEmailsRaw) {
    return true;
  }

  return false;
}

export { app, auth, db };
