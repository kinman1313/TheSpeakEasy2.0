"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import type { User } from "firebase/auth"

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
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)
    const [isInitialized, setIsInitialized] = useState(false)

    useEffect(() => {
        let unsubscribe: (() => void) | undefined;

        const initializeAuth = async () => {
            try {
                // Dynamic imports to avoid SSR issues
                const [
                    { auth, rtdb },
                    { onAuthStateChanged },
                    { ref, set, onDisconnect, serverTimestamp, goOnline }
                ] = await Promise.all([
                    import("@/lib/firebase"),
                    import("firebase/auth"),
                    import("firebase/database")
                ]);

                if (!auth || !rtdb) {
                    console.error("Firebase services not available");
                    setLoading(false);
                    setIsInitialized(true);
                    return;
                }

                unsubscribe = onAuthStateChanged(auth, (authUser) => {
                    setUser(authUser);
                    setLoading(false);
                    setIsInitialized(true);

                    if (authUser) {
                        // User is logged in
                        previousUserUid = authUser.uid;
                        const userStatusRef = ref(rtdb, `status/${authUser.uid}`);

                        goOnline(rtdb);

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
                            userName: authUser.displayName || "Anonymous",
                            photoURL: authUser.photoURL || "",
                        }).catch(error => 
                            console.error("Error setting onDisconnect:", error)
                        );

                    } else {
                        // User is logged out
                        if (previousUserUid) {
                            const userStatusRef = ref(rtdb, `status/${previousUserUid}`);
                            set(userStatusRef, {
                                isOnline: false,
                                lastChanged: serverTimestamp(),
                            }).catch(error => 
                                console.error("Error setting offline status on logout:", error)
                            );
                        }
                        previousUserUid = null;
                    }
                });
            } catch (error) {
                console.error("Error initializing auth:", error);
                setLoading(false);
                setIsInitialized(true);
            }
        };

        initializeAuth();

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading }}>
            {children}
        </AuthContext.Provider>
    )
}