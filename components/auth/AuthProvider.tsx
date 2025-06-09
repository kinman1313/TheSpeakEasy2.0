'use client'

import { createContext, useContext, useEffect, useState } from "react"
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth"
import { rtdb, auth } from "@/lib/firebase"
import { ref, set, onDisconnect, serverTimestamp, goOnline } from "firebase/database"

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

// Store the previous user's UID to correctly update status on logout
let previousUserUid: string | null = null;

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<FirebaseUser | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (typeof window === 'undefined') {
            setLoading(false);
            return;
        }

        if (!auth) {
            console.error("Auth not available");
            setLoading(false);
            return;
        }

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
            console.warn("Auth timeout - clearing cache and forcing loading to false")
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
                    previousUserUid = authUser.uid;

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
                    if (previousUserUid && rtdb) {
                        const userStatusRef = ref(rtdb, `status/${previousUserUid}`);
                        set(userStatusRef, {
                            isOnline: false,
                            lastChanged: serverTimestamp(),
                            // Optionally clear userName and photoURL or keep them
                        }).catch(error =>
                            console.error("Error setting offline status:", error)
                        );
                    }
                    previousUserUid = null;
                }
            });
        } catch (error) {
            console.error("Error initializing Firebase Auth:", error);
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