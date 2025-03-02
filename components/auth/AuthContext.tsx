// components/auth/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react'
import { auth } from '@/lib/firebase'
import { onAuthStateChanged, User, updateProfile as firebaseUpdateProfile } from 'firebase/auth'

interface AuthContextType {
    user: User | null
    updateProfile: (profile: { displayName?: string; photoURL?: string }) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null)

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user)
        })
        return () => unsubscribe()
    }, [])

    const updateProfile = async (profile: { displayName?: string; photoURL?: string }) => {
        if (user) {
            await firebaseUpdateProfile(user, profile)
            setUser({ ...user, ...profile })
        }
    }

    return (
        <AuthContext.Provider value={{ user, updateProfile }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}


