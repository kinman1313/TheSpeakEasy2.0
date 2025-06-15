import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";
import { getMessaging, type Messaging, onMessage } from "firebase/messaging"; // Added for FCM
import { setLogLevel } from "firebase/app";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'demo-api-key',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'demo-project.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'demo-project',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'demo-project.appspot.com',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '123456789',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:123456789:web:abcdef123456',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || 'G-XXXXXXXXXX',
};

// Check if we're in a build environment and Firebase config is missing
const isBuildTime = typeof window === 'undefined' && process.env.NODE_ENV === 'production';
const hasValidFirebaseConfig = process.env.NEXT_PUBLIC_FIREBASE_API_KEY && 
                              process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

// Only initialize Firebase if we have valid config or we're not in build time
let app: any = null;
let auth: any = null;
let db: any = null;
let rtdb: any = null;
let storage: any = null;

if (!isBuildTime || hasValidFirebaseConfig) {
  try {
    // Initialize Firebase
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

    // Initialize core services (these are safe to initialize on server-side)
    auth = getAuth(app);
    db = getFirestore(app);
    rtdb = getDatabase(app);
    storage = getStorage(app);
  } catch (error) {
    console.warn('Firebase initialization failed:', error);
    // Create dummy services for build time
    if (isBuildTime) {
      app = null;
      auth = null;
      db = null;
      rtdb = null;
      storage = null;
    }
  }
}

// Initialize messaging and analytics only on the client side
let messaging: Messaging | undefined;
let analytics: Analytics | null = null;

// Configure Firebase logging to reduce verbosity
if (typeof window !== "undefined" && app) {
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
