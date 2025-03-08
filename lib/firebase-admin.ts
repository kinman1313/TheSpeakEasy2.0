import { getApps, initializeApp, cert, type App } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"
import { getAuth } from "firebase-admin/auth"
import { getStorage } from "firebase-admin/storage"

// Track initialization state
let isInitialized = false;
let adminApp: App | null = null;

export function initAdmin(): App | null {
    // Return existing app if already initialized
    if (isInitialized && adminApp) {
        return adminApp;
    }

    const apps = getApps();
    if (apps.length > 0) {
        adminApp = apps[0];
        isInitialized = true;
        return adminApp;
    }

    // Check if we have the required environment variables
    if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
        // Handle missing environment variables
        if (process.env.NODE_ENV !== "production") {
            console.warn("Firebase Admin environment variables missing. Using mock implementation for development/build.");
            isInitialized = true;
            return null;
        }

        throw new Error("Firebase Admin environment variables are missing. Please check your .env file.");
    }

    // Initialize with environment variables
    try {
        adminApp = initializeApp({
            credential: cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                // The private key needs to be properly formatted as it might have escaped newlines
                privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
            }),
        });

        isInitialized = true;
        return adminApp;
    } catch (error) {
        console.error("Error initializing Firebase Admin:", error);

        // If we're not in production, return null
        if (process.env.NODE_ENV !== "production") {
            console.warn("Firebase Admin initialization failed. Using mock implementation for development/build.");
            isInitialized = true;
            return null;
        }

        throw error;
    }
}

// Initialize the admin app
initAdmin();

// Export the admin services
export const adminAuth = getAuth();
export const adminDb = getFirestore();
export const adminStorage = getStorage();