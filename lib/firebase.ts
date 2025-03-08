import { initializeApp, getApps, getApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"
import { getStorage } from "firebase/storage"
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics"

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
}

// Initialize Firebase only in the browser
let app;
let auth;
let db;
let storage;
let analytics: Analytics | null = null;

// Check if we're in the browser environment
if (typeof window !== "undefined") {
    try {
        // Initialize Firebase
        app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
        auth = getAuth(app);
        db = getFirestore(app);
        storage = getStorage(app);

        // Check if analytics is supported before initializing
        isSupported()
            .then((supported) => {
                if (supported) {
                    analytics = getAnalytics(app);
                }
            })
            .catch((error) => {
                console.error("Analytics error:", error);
            });
    } catch (error) {
        console.error("Firebase initialization error:", error);
    }
}

export { app, auth, db, storage, analytics }