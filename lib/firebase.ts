import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getDatabase, type Database } from "firebase/database";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";
import { getMessaging, type Messaging, onMessage } from "firebase/messaging"; // Added for FCM

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize services
const auth = getAuth(app);
const db = getFirestore(app);
const rtdb = getDatabase(app);
const storage = getStorage(app);

// Initialize messaging and analytics only on the client side
let messaging: Messaging | undefined;
let analytics: Analytics | null = null;

if (typeof window !== "undefined") {
  try {
    messaging = getMessaging(app);
    console.log("Firebase Messaging initialized.");

    if (!process.env.NEXT_PUBLIC_FCM_VAPID_KEY) {
      console.warn("NEXT_PUBLIC_FCM_VAPID_KEY is not set in environment variables. Push notifications may not work.");
    }

    onMessage(messaging, (payload) => {
      console.log("Message received in foreground.", payload);
      alert(`Foreground Message: ${payload.notification?.title} - ${payload.notification?.body}`);
    });

    // Initialize Analytics if supported
    isSupported()
      .then((supported) => {
        if (supported) {
          analytics = getAnalytics(app);
        }
      })
      .catch((error) => console.error("Analytics error:", error));
  } catch (error) {
    console.error("Error initializing Firebase services:", error);
  }
}

export { app, auth, db, rtdb, storage, messaging, analytics }; // Export messaging
