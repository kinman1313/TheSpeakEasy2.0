"use client"
import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { onAuthStateChanged, getAuth } from "firebase/auth"
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
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Only initialize Firebase Auth in the browser
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }

    // Initialize auth inside useEffect
    const auth = getAuth(app);

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
        })
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)