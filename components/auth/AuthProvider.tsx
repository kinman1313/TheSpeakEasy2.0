"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { auth, rtdb } from "@/lib/firebase"
import { onAuthStateChanged, type User } from "firebase/auth"
import { ref, set, onDisconnect, serverTimestamp, goOnline } from "firebase/database" // RTDB functions - removed unused goOffline

// Define the shape of our context
interface AuthContextType {
    user: User | null
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
    const [user, setUser] = useState<User | null>(null) // Use User type
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (typeof window === 'undefined' || !auth || !rtdb) {
            setLoading(false);
            if (!rtdb) console.error("Realtime Database not available in AuthProvider.");
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, (authUser) => {
            setUser(authUser);
            setLoading(false);

            if (authUser) {
                // User is logged in
                previousUserUid = authUser.uid; // Store UID for logout
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

            } else {
                // User is logged out
                if (previousUserUid) {
                    const userStatusRef = ref(rtdb, `status/${previousUserUid}`);
                    set(userStatusRef, {
                        isOnline: false,
                        lastChanged: serverTimestamp(),
                        // Optionally clear userName and photoURL or keep them
                    }).catch(error => console.error("Error setting offline status on logout:", error));
                }
                // goOffline(rtdb); // Mark client as offline. Important for RTDB connection management.
                                  // Consider if this should be here or if onDisconnect is sufficient.
                                  // If multiple users share a client, goOffline might be too aggressive.
                                  // For a typical single-user client, this is okay.
                                  // Let's defer to onDisconnect for now, as it's user-specific.
                                  // If the app closes, onDisconnect handles it. If user logs out, we manually set.
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