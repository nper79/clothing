import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

// Check if Firebase is configured
const isFirebaseConfigured = () => {
  return import.meta.env.VITE_FIREBASE_API_KEY &&
         import.meta.env.VITE_FIREBASE_PROJECT_ID;
};

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "demo-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "demo.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "demo-project",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "demo-project.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "demo-app-id",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "demo-measurement-id"
};

let app;
let auth: any = null;
let googleProvider: any = null;

try {
  // Initialize Firebase only if configured
  if (isFirebaseConfigured()) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();

    // Configure Google Provider
    googleProvider.setCustomParameters({
      prompt: 'select_account'
    });
  } else {
    console.warn('Firebase not configured. Using mock authentication.');
  }
} catch (error) {
  console.error('Failed to initialize Firebase:', error);
}

export { auth, googleProvider, isFirebaseConfigured };
export default app;