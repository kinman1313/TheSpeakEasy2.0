'use client'

import { User } from "firebase/auth"
import { createContext, useContext, useEffect, useState } from "react"
import { onAuthStateChanged, getAuth } from "firebase/auth"
import { app } from "@/lib/firebase" // Assuming this is where your Firebase client init is

// Initialize auth only in the browser
const auth = typeof window !== 'undefined' ? getAuth(app) : null;

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

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Only run this effect in the browser
        if (typeof window === 'undefined' || !auth) {
            setLoading(false); // Set loading to false for server-side rendering
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user)
            setLoading(false)
        })

        return () => {
            if (unsubscribe) unsubscribe();
        }
    }, [])

    return (
        <AuthContext.Provider value={{ user, loading }}>
            {children}
        </AuthContext.Provider>
    )
}