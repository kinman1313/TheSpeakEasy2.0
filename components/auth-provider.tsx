"use client"
import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { onAuthStateChanged, getAuth, User as FirebaseUser } from "firebase/auth"
import { app } from "@/lib/firebase" // Assuming this is where your Firebase client init is

type User = {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
} | null

type AuthContextType = {
  user: User
  loading: boolean
  error: string | null
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  error: null,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Only initialize Firebase Auth in the browser
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }

    // Initialize auth inside useEffect
    const auth = getAuth(app);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Store the user's ID token in local storage
        const token = await firebaseUser.getIdToken();
        localStorage.setItem('token', token);

        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
        })
      } else {
        // Remove the user's ID token from local storage
        localStorage.removeItem('token');
        setUser(null)
      }
      setLoading(false)
    }, (error) => {
      setError(error.message) // Handle authentication errors
    })

    return () => unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, error }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)