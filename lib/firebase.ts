import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getDatabase, type Database } from "firebase/database"; // Added for RTDB
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Ensure Firebase is initialized properly
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let rtdb: Database; // Added for RTDB
let storage: FirebaseStorage;
let analytics: Analytics | null = null;

// Check if running in the browser
if (typeof window !== "undefined") {
  try {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    rtdb = getDatabase(app); // Initialize RTDB
    storage = getStorage(app);

    // Initialize Analytics only if supported
    isSupported()
      .then((supported) => {
        if (supported) {
          analytics = getAnalytics(app);
        }
      })
      .catch((error) => console.error("Analytics error:", error));
  } catch (error) {
    console.error("Firebase initialization error:", error);
    throw error; // Ensures failure is caught in logs
  }
} else {
  // Provide placeholders for Firebase services on the server to avoid "undefined" issues
  app = {} as FirebaseApp;
  auth = {} as Auth;
  db = {} as Firestore;
  rtdb = {} as Database; // Placeholder for RTDB
  storage = {} as FirebaseStorage;
}

export { app, auth, db, rtdb, storage, analytics }; // Export rtdb
