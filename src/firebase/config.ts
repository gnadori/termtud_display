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

const DEFAULT_ALLOWED_ADMIN_EMAILS = [
  'nadori@akg.hu',
  'nadori@akgbudapest.onmicrosoft.com',
  'chrenko.timea@akg.hu',
  'varhegyi.barbara@akg.hu',
  'hegymegi.mariann@akg.hu',
  'tatai.reka@akg.hu',
];

export function isAuthorizedAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();

  const allowedEmailsRaw = import.meta.env.VITE_ALLOWED_ADMIN_EMAILS as string | undefined;
  const emailList =
    allowedEmailsRaw && allowedEmailsRaw.trim().length > 0
      ? allowedEmailsRaw
          .split(',')
          .map((e) => e.trim().toLowerCase())
          .filter(Boolean)
      : DEFAULT_ALLOWED_ADMIN_EMAILS;

  return emailList.includes(normalized);
}

export { app, auth, db };
