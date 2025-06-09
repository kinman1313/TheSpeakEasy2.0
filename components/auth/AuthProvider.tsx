'use client'

import { createContext, useContext, useEffect, useState } from "react"
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth"
import { rtdb, auth, db } from "@/lib/firebase"
import { ref, set, onDisconnect, serverTimestamp, goOnline } from "firebase/database"
import { doc, setDoc, getDoc } from "firebase/firestore"

// Define the shape of our context
interface AuthContextType {
    user: FirebaseUser | null
    loading: boolean
}

// Create the context with a default value
const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
})

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<FirebaseUser | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        console.log("AuthProvider: Starting initialization...")

        if (typeof window === 'undefined') {
            console.log("AuthProvider: Server-side, setting loading to false")
            setLoading(false);
            return;
        }

        if (!auth) {
            console.error("AuthProvider: Firebase auth not available, setting loading to false");
            setLoading(false);
            return;
        }

        console.log("AuthProvider: Firebase auth is available, setting up listener...")

        // Clear any stuck authentication state
        const clearAuthCache = () => {
            try {
                localStorage.removeItem('firebase:authUser:' + process.env.NEXT_PUBLIC_FIREBASE_API_KEY + ':[DEFAULT]')
                sessionStorage.clear()
                console.log("Cleared Firebase auth cache")
            } catch (error) {
                console.warn("Could not clear auth cache:", error)
            }
        }

        // Timeout to prevent infinite loading
        const authTimeout = setTimeout(() => {
            console.warn("🚨 AuthProvider: 8-second timeout reached! Forcing loading to false")
            console.warn("This usually means Firebase auth failed to initialize properly")
            clearAuthCache()
            setLoading(false)
        }, 8000)

        let unsubscribe: (() => void) | null = null;

        try {
            unsubscribe = onAuthStateChanged(auth, (authUser) => {
                clearTimeout(authTimeout)
                console.log("Auth state changed:", authUser ? "logged in" : "logged out")

                setUser(authUser)
                setLoading(false)

                if (authUser) {
                    // User is logged in

                    // Create/update user document in Firestore
                    if (db) {
                        const userRef = doc(db, "users", authUser.uid);
                        getDoc(userRef).then(docSnap => {
                            if (!docSnap.exists()) {
                                // User document doesn't exist, create it
                                const userData = {
                                    uid: authUser.uid,
                                    email: authUser.email,
                                    displayName: authUser.displayName || "",
                                    photoURL: authUser.photoURL || "",
                                    chatColor: "#00f3ff",
                                    settings: {
                                        enterToSend: true,
                                        showTypingIndicators: true,
                                        showReadReceipts: true,
                                        notificationsEnabled: true,
                                    },
                                    createdAt: new Date(),
                                    updatedAt: new Date()
                                };

                                setDoc(userRef, userData).then(() => {
                                    console.log("User document created in Firestore");
                                }).catch(error => {
                                    console.error("Error creating user document:", error);
                                });
                            } else {
                                // User exists, optionally update last login
                                setDoc(userRef, {
                                    lastLoginAt: new Date()
                                }, { merge: true }).catch(error => {
                                    console.error("Error updating user last login:", error);
                                });
                            }
                        }).catch(error => {
                            console.error("Error checking user document:", error);
                        });
                    }

                    // Only handle presence if rtdb is available
                    if (rtdb) {
                        const userStatusRef = ref(rtdb, `status/${authUser.uid}`);

                        goOnline(rtdb); // Ensure connection is active

                        const presenceData = {
                            isOnline: true,
                            lastChanged: serverTimestamp(),
                            userName: authUser.displayName || "Anonymous",
                            photoURL: authUser.photoURL || "",
                        };

                        set(userStatusRef, presenceData).catch(error =>
                            console.error("Error setting online status:", error)
                        );

                        onDisconnect(userStatusRef).set({
                            isOnline: false,
                            lastChanged: serverTimestamp(),
                            userName: authUser.displayName || "Anonymous", // Keep info on disconnect
                            photoURL: authUser.photoURL || "",
                        }).catch(error =>
                            console.error("Error setting onDisconnect:", error)
                        );
                    }

                } else {
                    // User is logged out
                    // Note: We don't need to manually set offline status here
                    // The onDisconnect handler we set up when the user logged in
                    // will automatically handle setting them as offline
                }
            });
        } catch (error) {
            console.error("🚨 AuthProvider: Critical error initializing Firebase Auth:", error);
            console.error("Error details:", {
                message: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined
            });
            clearTimeout(authTimeout);
            clearAuthCache();
            setLoading(false);
        }

        return () => {
            clearTimeout(authTimeout);
            if (unsubscribe) unsubscribe();
            // If there's an active user when the provider unmounts (e.g. app closing abruptly),
            // onDisconnect should handle their status. If they logged out, it's already handled.
            // No explicit offline setting needed here for the *current* user if onDisconnect is robust.
        };
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading }}>
            {children}
        </AuthContext.Provider>
    )
}