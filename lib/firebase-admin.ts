import { getApps, initializeApp, cert, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getStorage, type Storage } from "firebase-admin/storage";
import path from "path";

// Function to check if we're in the build phase
function isBuildPhase() {
    return process.env.NEXT_PHASE === "phase-production-build";
}

// Initialize Firebase Admin
let app: App | null = null;
let _adminDb: Firestore | null = null;
let _adminAuth: Auth | null = null;
let _adminStorage: Storage | null = null;

try {
    // Skip initialization during build
    if (!isBuildPhase()) {
        const apps = getApps();
        if (apps.length > 0) {
            app = apps[0];
        } else if (
            process.env.FIREBASE_PROJECT_ID &&
            process.env.FIREBASE_CLIENT_EMAIL &&
            process.env.FIREBASE_PRIVATE_KEY
        ) {
            app = initializeApp({
                credential: cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
                }),
            });
        } else {
            console.warn("Firebase Admin environment variables missing.");
        }

        if (app) {
            _adminDb = getFirestore(app);
            _adminAuth = getAuth(app);
            _adminStorage = getStorage(app);
        }
    } else {
        console.log("Skipping Firebase Admin initialization during build phase");
    }
} catch (error) {
    console.error("Error initializing Firebase Admin:", error);
}

// Helper function to ensure services are initialized
function ensureService<T>(service: T | null, serviceName: string): T {
    if (!service) {
        if (isBuildPhase()) {
            // During build, return a mock object that won't be used
            return {} as T;
        }
        throw new Error(`Firebase Admin ${serviceName} not initialized. Check your environment variables.`);
    }
    return service;
}

// Mock data used for Firestore, Auth, and Storage during the build phase
const mockData = {
    // User data
    presence: { status: "offline", lastSeen: null },
    email: "mock@example.com",
    displayName: "Mock User",
    photoURL: "/placeholder.svg?height=40&width=40",
    createdAt: new Date().toISOString(),
    // Add other properties you need here...
};

// Create a more complete mock query implementation
const createMockQuery = () => {
    const mockQuery = {
        where: () => mockQuery,
        orderBy: () => mockQuery,
        limit: () => mockQuery,
        startAfter: () => mockQuery,
        get: async () => ({
            docs: [
                {
                    id: "mock-id",
                    data: () => ({ ...mockData }),
                },
            ],
        }),
    };
    return mockQuery;
};

// Firestore Service (Mock or Real)
export const adminDb = {
    collection: (path: string) => {
        if (isBuildPhase()) {
            return {
                doc: (id: string) => ({
                    get: async () => ({
                        exists: true,
                        id: id || "mock-id",
                        data: () => ({ ...mockData }),
                    }),
                    update: async () => ({}),
                    set: async () => ({}),
                    delete: async () => ({}),
                }),
                where: () => createMockQuery(),
                orderBy: () => createMockQuery(),
                limit: () => createMockQuery(),
                startAfter: () => createMockQuery(),
                add: async () => ({ id: "mock-id" }),
                get: async () => ({
                    docs: [
                        {
                            id: "mock-id",
                            data: () => ({ ...mockData }),
                        },
                    ],
                }),
            };
        }
        return ensureService(_adminDb, "Firestore").collection(path);
    },
    doc: (path: string) => {
        if (isBuildPhase()) {
            return {
                get: async () => ({
                    exists: true,
                    id: "mock-id",
                    data: () => ({ ...mockData }),
                }),
                update: async () => ({}),
                set: async () => ({}),
                delete: async () => ({}),
            };
        }
        return ensureService(_adminDb, "Firestore").doc(path);
    },
};

// Firebase Admin Auth Service (Mock or Real)
export const adminAuth = {
    verifyIdToken: async (token: string) => {
        if (isBuildPhase()) {
            return { uid: "mock-uid", email: "mock@example.com" };
        }
        return ensureService(_adminAuth, "Auth").verifyIdToken(token);
    },
    verifySessionCookie: async (cookie: string, checkRevoked = true) => {
        if (isBuildPhase()) {
            return { uid: "mock-uid", email: "mock@example.com", name: "Mock User", picture: "" };
        }
        return ensureService(_adminAuth, "Auth").verifySessionCookie(cookie, checkRevoked);
    },
    createSessionCookie: async (token: string, options: { expiresIn: number }) => {
        if (isBuildPhase()) {
            return "mock-session-cookie";
        }
        return ensureService(_adminAuth, "Auth").createSessionCookie(token, options);
    },
    listUsers: async (maxResults: number) => {
        if (isBuildPhase()) {
            return { users: [] };
        }
        return ensureService(_adminAuth, "Auth").listUsers(maxResults);
    },
};

// Firebase Admin Storage Service (Mock or Real)
export const adminStorage = {
    bucket: (name?: string) => {
        if (isBuildPhase()) {
            return {
                file: () => ({
                    save: async () => ({}),
                    makePublic: async () => ({}),
                }),
            };
        }
        return ensureService(_adminStorage, "Storage").bucket(name);
    },
};

// For backward compatibility
export function initAdmin(): App | null {
    return app;
}
