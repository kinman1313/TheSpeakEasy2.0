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

// Ensure Firebase is initialized properly
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let rtdb: Database;
let storage: FirebaseStorage;
let messaging: Messaging | undefined = undefined; // Added for FCM
let analytics: Analytics | null = null;

// Check if running in the browser
if (typeof window !== "undefined") {
  try {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    rtdb = getDatabase(app);
    storage = getStorage(app);

    // Initialize Firebase Messaging
    try {
      messaging = getMessaging(app);
      console.log("Firebase Messaging initialized.");
      // Reminder for VAPID key
      if (!process.env.NEXT_PUBLIC_FCM_VAPID_KEY) {
        console.warn("NEXT_PUBLIC_FCM_VAPID_KEY is not set in environment variables. Push notifications may not work.");
      }
      // Handle foreground messages (optional, good for testing)
      onMessage(messaging, (payload) => {
        console.log("Message received in foreground.", payload);
        // Customize notification handling here (e.g., show a toast)
        // For example: new Notification(payload.notification?.title || "New Message", { body: payload.notification?.body });
        alert(`Foreground Message: ${payload.notification?.title} - ${payload.notification?.body}`);
      });
    } catch (e) {
        console.error("Could not initialize Firebase Messaging:", e);
        messaging = undefined;
    }


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
    // Do not re-throw here, as some services might still be functional or it's SSR.
    // Let individual service usages handle their undefined state if critical.
  }
} else {
  // Provide placeholders for Firebase services on the server
  app = {} as FirebaseApp; // Or initialize with config for server-side admin tasks if needed
  auth = {} as Auth;
  db = {} as Firestore;
  rtdb = {} as Database;
  storage = {} as FirebaseStorage;
  messaging = undefined; // No FCM on server
}

export { app, auth, db, rtdb, storage, messaging, analytics }; // Export messaging
