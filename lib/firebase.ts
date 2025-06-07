import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";
import { getMessaging, type Messaging, onMessage } from "firebase/messaging"; // Added for FCM
import { setLogLevel } from "firebase/app";

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

// Initialize core services (these are safe to initialize on server-side)
const auth = getAuth(app);
const db = getFirestore(app);
const rtdb = getDatabase(app);
const storage = getStorage(app);

// Initialize messaging and analytics only on the client side
let messaging: Messaging | undefined;
let analytics: Analytics | null = null;

// Configure Firebase logging to reduce verbosity
if (typeof window !== "undefined") {
  // Set Firebase logging to 'error' level to reduce console noise
  setLogLevel('error');

  try {
    messaging = getMessaging(app);
    console.log("Firebase messaging initialized.");

    if (!process.env.NEXT_PUBLIC_FCM_VAPID_KEY) {
      console.warn("NEXT_PUBLIC_FCM_VAPID_KEY is not set in environment variables. Push notifications may not work.");
    }

    onMessage(messaging, (payload) => {
      console.log("Message received in foreground.", payload);
      // Use a less intrusive notification than alert
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(payload.notification?.title || 'New Message', {
          body: payload.notification?.body,
          icon: '/favicon.ico'
        });
      }
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

// Helper functions to safely get services
export const getAuthInstance = () => auth;
export const getDbInstance = () => db;
export const getRtdbInstance = () => rtdb;
export const getStorageInstance = () => storage;
