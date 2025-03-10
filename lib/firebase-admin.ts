import { getApps, initializeApp, cert, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getStorage, type Storage } from "firebase-admin/storage";

// Function to check if we're in the build phase
function isBuildPhase() {
    return process.env.NEXT_PHASE === "phase-production-build";
}

// Mock data used for Firestore, Auth, and Storage during the build phase
const mockData = {
    presence: { status: "offline", lastSeen: null },
    email: "mock@example.com",
    displayName: "Mock User",
    photoURL: "/placeholder.svg?height=40&width=40",
    createdAt: new Date().toISOString(),
};

// Lazy initialization of Firebase Admin
let _app: App | undefined;
let _adminDb: Firestore | undefined;
let _adminAuth: Auth | undefined;
let _adminStorage: Storage | undefined;

// Get or initialize the Firebase app
export function getAdminApp(): App {
    if (isBuildPhase()) {
        return {} as App;
    }

    if (!_app) {
        const apps = getApps();
        if (apps.length > 0) {
            _app = apps[0];
        } else if (
            process.env.FIREBASE_PROJECT_ID &&
            process.env.FIREBASE_CLIENT_EMAIL &&
            process.env.FIREBASE_PRIVATE_KEY
        ) {
            try {
                _app = initializeApp({
                    credential: cert({
                        projectId: process.env.FIREBASE_PROJECT_ID,
                        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
                    }),
                });
            } catch (error) {
                console.error("Error initializing Firebase Admin:", error);
                throw new Error("Failed to initialize Firebase Admin");
            }
        } else {
            throw new Error("Firebase Admin environment variables missing.");
        }
    }

    return _app;
}

// Get or initialize Firestore
export function getAdminDb(): Firestore {
    if (isBuildPhase()) {
        return {} as Firestore;
    }

    if (!_adminDb) {
        _adminDb = getFirestore(getAdminApp());
    }

    return _adminDb;
}

// Get or initialize Auth
export function getAdminAuth(): Auth {
    if (isBuildPhase()) {
        return {} as Auth;
    }

    if (!_adminAuth) {
        _adminAuth = getAuth(getAdminApp());
    }

    return _adminAuth;
}

// Get or initialize Storage
export function getAdminStorage(): Storage {
    if (isBuildPhase()) {
        return {} as Storage;
    }

    if (!_adminStorage) {
        _adminStorage = getStorage(getAdminApp());
    }

    return _adminStorage;
}

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

// Firestore Service with Lazy Loading or Mock
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
        return getAdminDb().collection(path);
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
        return getAdminDb().doc(path);
    },
};

// Firebase Admin Auth Service with Lazy Loading or Mock
export const adminAuth = {
    verifyIdToken: async (token: string) => {
        if (isBuildPhase()) {
            return { uid: "mock-uid", email: "mock@example.com" };
        }
        return getAdminAuth().verifyIdToken(token);
    },
    verifySessionCookie: async (cookie: string, checkRevoked = true) => {
        if (isBuildPhase()) {
            return { uid: "mock-uid", email: "mock@example.com", name: "Mock User", picture: "" };
        }
        return getAdminAuth().verifySessionCookie(cookie, checkRevoked);
    },
    createSessionCookie: async (token: string, options: { expiresIn: number }) => {
        if (isBuildPhase()) {
            return "mock-session-cookie";
        }
        return getAdminAuth().createSessionCookie(token, options);
    },
    listUsers: async (maxResults: number) => {
        if (isBuildPhase()) {
            return { users: [] };
        }
        return getAdminAuth().listUsers(maxResults);
    },
};

// Firebase Admin Storage Service with Lazy Loading or Mock
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
        return getAdminStorage().bucket(name);
    },
};

// For backward compatibility
export function initAdmin(): App | undefined {
    if (isBuildPhase()) {
        return undefined;
    }
    return getAdminApp();
}