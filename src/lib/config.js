export const EVENT_CODE = 'GRAD26';

export const EVENT_NAME = 'Graduation 2026';

export const SCHOOL_NAME = 'Lyceum International School Gampaha';

export const ADMISSION_EXAMPLE = 'e.g. G01234';

export const EMAIL_EXAMPLE = 'Email used for payment receipt';

export const PHONE_EXAMPLE = 'Last 4 digits of payment phone';

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
