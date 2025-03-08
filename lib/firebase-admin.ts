import { getApps, initializeApp, cert, type App } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"
import { getAuth } from "firebase-admin/auth"
import { getStorage } from "firebase-admin/storage"

export function initAdmin(): App {
    const apps = getApps()

    // Return existing app if already initialized
    if (apps.length > 0) {
        return apps[0]
    }

    // Check if we have the required environment variables
    if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
        // Handle missing environment variables
        if (process.env.NODE_ENV !== "production") {
            console.warn("Firebase Admin environment variables missing. Using mock implementation for development/build.")
            // Return a mock implementation that won't break the build
            return {} as App
        }

        throw new Error("Firebase Admin environment variables are missing. Please check your .env file.")
    }

    // Initialize with environment variables
    try {
        return initializeApp({
            credential: cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                // The private key needs to be properly formatted as it might have escaped newlines
                privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
            }),
        })
    } catch (error) {
        console.error("Error initializing Firebase Admin:", error)

        // If we're not in production, return a mock implementation
        if (process.env.NODE_ENV !== "production") {
            console.warn("Firebase Admin initialization failed. Using mock implementation for development/build.")
            return {} as App
        }

        throw error
    }
}

// Initialize the admin app
const adminApp = initAdmin()

// Export the admin services
export const adminDb = getFirestore(adminApp)
export const adminAuth = getAuth(adminApp)
export const adminStorage = getStorage(adminApp)