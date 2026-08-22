export const EVENT_CODE = (import.meta.env.VITE_EVENT_CODE || 'GRAD26').trim();
export const EVENT_NAME = (import.meta.env.VITE_EVENT_NAME || 'Graduation 2026').trim();
export const SCHOOL_NAME = (import.meta.env.VITE_SCHOOL_NAME || 'Your School Name').trim();
export const ADMISSION_EXAMPLE = (import.meta.env.VITE_ADMISSION_EXAMPLE || 'e.g. 12345').trim();
export const EMAIL_EXAMPLE = (import.meta.env.VITE_EMAIL_EXAMPLE || 'e.g. student@school.lk').trim();
export const PHONE_EXAMPLE = (import.meta.env.VITE_PHONE_EXAMPLE || 'e.g. 4567').trim();

export const firebaseConfig = {
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
  firebaseConfig.appId &&
  !firebaseConfig.apiKey.includes('your_')
);
