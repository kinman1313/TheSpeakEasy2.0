"use client"

import type { User } from "firebase/auth"
import type { ReactNode } from "react"

import { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react"
import { onAuthStateChanged, signInWithPopup, signOut, GoogleAuthProvider, updateProfile } from "firebase/auth"
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { toast } from "sonner"

interface UserProfile {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
  settings?: {
    theme?: "light" | "dark"
    enterToSend?: boolean
    showTypingIndicators?: boolean
    showReadReceipts?: boolean
    notificationsEnabled?: boolean
  }
  lastSeen?: Date
  status?: "online" | "offline" | "away"
}

interface AuthContextType {
  user: User | null
  userProfile: UserProfile | null
  loading: boolean
  signIn: () => Promise<void>
  signOut: () => Promise<void>
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  loading: true,
  signIn: async () => {},
  signOut: async () => {},
  updateUserProfile: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch or create user profile in Firestore
  const syncUserProfile = useCallback(async (user: User) => {
    try {
      const userRef = doc(db, "users", user.uid)
      const userSnap = await getDoc(userRef)

      if (userSnap.exists()) {
        // Update existing user
        const userData = userSnap.data() as UserProfile
        setUserProfile(userData)

        // Update last seen
        await updateDoc(userRef, {
          lastSeen: new Date(),
          status: "online",
        })
      } else {
        // Create new user
        const newUser: UserProfile = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          settings: {
            theme: "dark",
            enterToSend: true,
            showTypingIndicators: true,
            showReadReceipts: true,
            notificationsEnabled: true,
          },
          lastSeen: new Date(),
          status: "online",
        }

        await setDoc(userRef, newUser)
        setUserProfile(newUser)
      }
    } catch (error) {
      console.error("Error syncing user profile:", error)
      toast.error("Could not sync user profile")
    }
  }, [])

  // Handle auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user)

      if (user) {
        await syncUserProfile(user)
      } else {
        setUserProfile(null)
      }

      setLoading(false)
    })

    return () => {
      unsubscribe()
      // Update user status to offline when unmounting
      if (user) {
        const userRef = doc(db, "users", user.uid)
        updateDoc(userRef, {
          status: "offline",
          lastSeen: new Date(),
        }).catch(console.error)
      }
    }
  }, [user, syncUserProfile])

  const handleSignIn = useCallback(async () => {
    try {
      const provider = new GoogleAuthProvider()
      const result = await signInWithPopup(auth, provider)
      toast.success("Successfully signed in!")

      // Sync user profile after successful sign in
      await syncUserProfile(result.user)
    } catch (error) {
      console.error("Error signing in:", error)
      toast.error("Could not sign in. Please try again.")
    }
  }, [syncUserProfile])

  const handleSignOut = useCallback(async () => {
    if (!user) return

    try {
      // Update user status before signing out
      const userRef = doc(db, "users", user.uid)
      await updateDoc(userRef, {
        status: "offline",
        lastSeen: new Date(),
      })

      await signOut(auth)
      toast.success("Successfully signed out!")
    } catch (error) {
      console.error("Error signing out:", error)
      toast.error("Could not sign out. Please try again.")
    }
  }, [user])

  const handleUpdateUserProfile = useCallback(
    async (data: Partial<UserProfile>) => {
      if (!user) return

      try {
        const userRef = doc(db, "users", user.uid)

        // Update Firestore profile
        await updateDoc(userRef, {
          ...data,
          updatedAt: new Date(),
        })

        // Update Firebase Auth profile if necessary
        if (data.displayName || data.photoURL) {
          await updateProfile(user, {
            displayName: data.displayName || user.displayName,
            photoURL: data.photoURL || user.photoURL,
          })
        }

        // Update local state
        setUserProfile((prev) => (prev ? { ...prev, ...data } : null))

        toast.success("Profile updated successfully!")
      } catch (error) {
        console.error("Error updating profile:", error)
        toast.error("Could not update profile. Please try again.")
      }
    },
    [user],
  )

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      user,
      userProfile,
      loading,
      signIn: handleSignIn,
      signOut: handleSignOut,
      updateUserProfile: handleUpdateUserProfile,
    }),
    [user, userProfile, loading, handleSignIn, handleSignOut, handleUpdateUserProfile],
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-blue"></div>
      </div>
    )
  }

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

