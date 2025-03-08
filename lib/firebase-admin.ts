import { getApps, initializeApp, cert, type App } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"
import { getAuth } from "firebase-admin/auth"
import { getStorage } from "firebase-admin/storage"

// Initialize variables to hold our admin services
let adminDb: ReturnType<typeof getFirestore> | null = null;
let adminAuth: ReturnType<typeof getAuth> | null = null;
let adminStorage: ReturnType<typeof getStorage> | null = null;
let adminApp: App | null = null;

export function initAdmin(): App | null {
    // Return existing app if already initialized
    if (adminApp) {
        return adminApp;
    }

    const apps = getApps()
    if (apps.length > 0) {
        adminApp = apps[0];
        return adminApp;
    }

    // Check if we have the required environment variables
    if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
        // Handle missing environment variables
        if (process.env.NODE_ENV !== "production") {
            console.warn("Firebase Admin environment variables missing. Using mock implementation for development/build.");
            // Return null to indicate initialization failed
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

        // Initialize services only if app initialization succeeded
        adminDb = getFirestore(adminApp);
        adminAuth = getAuth(adminApp);
        adminStorage = getStorage(adminApp);

        return adminApp;
    } catch (error) {
        console.error("Error initializing Firebase Admin:", error);

        // If we're not in production, return null
        if (process.env.NODE_ENV !== "production") {
            console.warn("Firebase Admin initialization failed. Using mock implementation for development/build.");
            return null;
        }

        throw error;
    }
}

// Initialize the admin app
initAdmin();

// Export the admin services with safety checks
export const adminDb = {
    collection: (path: string) => {
        if (!adminDb) {
            throw new Error("Firebase Admin not initialized. Check your environment variables.");
        }
        return adminDb.collection(path);
    },
    // Add other methods you need
};

export const adminAuth = {
    verifyIdToken: async (token: string) => {
        if (!adminAuth) {
            throw new Error("Firebase Admin not initialized. Check your environment variables.");
        }
        return adminAuth.verifyIdToken(token);
    },
    verifySessionCookie: async (cookie: string, checkRevoked: boolean) => {
        if (!adminAuth) {
            throw new Error("Firebase Admin not initialized. Check your environment variables.");
        }
        return adminAuth.verifySessionCookie(cookie, checkRevoked);
    },
    createSessionCookie: async (token: string, options: { expiresIn: number }) => {
        if (!adminAuth) {
            throw new Error("Firebase Admin not initialized. Check your environment variables.");
        }
        return adminAuth.createSessionCookie(token, options);
    },
    listUsers: async (maxResults: number) => {
        if (!adminAuth) {
            throw new Error("Firebase Admin not initialized. Check your environment variables.");
        }
        return adminAuth.listUsers(maxResults);
    },
    // Add other methods you need
};

export const adminStorage = {
    bucket: () => {
        if (!adminStorage) {
            throw new Error("Firebase Admin not initialized. Check your environment variables.");
        }
        return adminStorage.bucket();
    },
    // Add other methods you need
};