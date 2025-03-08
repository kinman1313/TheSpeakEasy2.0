import { getApps, initializeApp, cert, type App } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"
import { getAuth } from "firebase-admin/auth"
import { getStorage } from "firebase-admin/storage"

// Create mock implementations for build time
const mockDb = {
    collection: () => ({
        doc: () => ({
            get: async () => ({ exists: false, data: () => ({}) }),
            update: async () => ({}),
            set: async () => ({}),
        }),
        where: () => ({
            orderBy: () => ({
                get: async () => ({ docs: [] }),
            }),
        }),
        add: async () => ({ id: "mock-id" }),
    }),
};

const mockAuth = {
    verifyIdToken: async () => ({ uid: "mock-uid", email: "mock@example.com" }),
    verifySessionCookie: async () => ({ uid: "mock-uid", email: "mock@example.com" }),
    createSessionCookie: async () => "mock-session-cookie",
    listUsers: async () => ({ users: [] }),
};

const mockStorage = {
    bucket: () => ({
        file: () => ({
            save: async () => ({}),
            makePublic: async () => ({}),
        }),
    }),
};

// Track initialization state
let isInitialized = false;
let adminApp: App | null = null;

export function initAdmin(): App | null {
    // Skip initialization during build
    if (process.env.NEXT_PHASE === "phase-production-build") {
        console.log("Skipping Firebase Admin initialization during build phase");
        return null;
    }

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
        console.warn("Firebase Admin environment variables missing.");
        isInitialized = true;
        return null;
    }

    // Initialize with environment variables
    try {
        adminApp = initializeApp({
            credential: cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
            }),
        });

        isInitialized = true;
        return adminApp;
    } catch (error) {
        console.error("Error initializing Firebase Admin:", error);
        isInitialized = true;
        return null;
    }
}

// Initialize the admin app
const app = initAdmin();

// Export the admin services with fallbacks for build time
export const adminAuth = app ? getAuth() : (mockAuth as ReturnType<typeof getAuth>);
export const adminDb = app ? getFirestore() : (mockDb as ReturnType<typeof getFirestore>);
export const adminStorage = app ? getStorage() : (mockStorage as ReturnType<typeof getStorage>);