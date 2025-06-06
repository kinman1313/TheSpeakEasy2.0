'use client'

import { User } from "firebase/auth"
import { createContext, useContext, useEffect, useState } from "react"
import { onAuthStateChanged, getAuth, User as FirebaseUser } from "firebase/auth" // Renamed User to FirebaseUser
import { app, rtdb } from "@/lib/firebase" // Import rtdb
import { ref, set, onDisconnect, serverTimestamp, goOnline, goOffline } from "firebase/database" // RTDB functions

// Initialize auth - getAuth is safe to call on server
const auth = getAuth(app);

// Define the shape of our context
interface AuthContextType {
    user: FirebaseUser | null // Use FirebaseUser type
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
    const [user, setUser] = useState<FirebaseUser | null>(null) // Use FirebaseUser type
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (typeof window === 'undefined') {
            setLoading(false);
            return;
        }

        if (!auth) {
            console.error("Auth not available in AuthProvider.");
            setLoading(false);
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, (authUser) => {
            setUser(authUser);
            setLoading(false);

            if (authUser) {
                // User is logged in
                previousUserUid = authUser.uid; // Store UID for logout

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

                    set(userStatusRef, presenceData).catch(error => console.error("Error setting online status:", error));

                    onDisconnect(userStatusRef).set({
                        isOnline: false,
                        lastChanged: serverTimestamp(),
                        userName: authUser.displayName || "Anonymous", // Keep info on disconnect
                        photoURL: authUser.photoURL || "",
                    }).catch(error => console.error("Error setting onDisconnect:", error));
                }

            } else {
                // User is logged out
                if (previousUserUid && rtdb) {
                    const userStatusRef = ref(rtdb, `status/${previousUserUid}`);
                    set(userStatusRef, {
                        isOnline: false,
                        lastChanged: serverTimestamp(),
                        // Optionally clear userName and photoURL or keep them
                    }).catch(error => console.error("Error setting offline status on logout:", error));
                }
                previousUserUid = null;
            }
        });

        return () => {
            if (unsubscribe) unsubscribe();
            // If there's an active user when the provider unmounts (e.g. app closing abruptly),
            // onDisconnect should handle their status. If they logged out, it's already handled.
            // No explicit offline setting needed here for the *current* user if onDisconnect is robust.
        };
    }, []); // Empty dependency array: runs once on mount

    return (
        <AuthContext.Provider value={{ user, loading }}>
            {children}
        </AuthContext.Provider>
    )
}