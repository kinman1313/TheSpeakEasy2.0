import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { trackPresence, subscribeToUserStatus } from '@/lib/presence'
import { updateUserStatus } from '@/lib/firebase/firestore'
import { UserStatus } from '@/types/user'

interface AuthContextType {
    user: User | null
    status: UserStatus
    setStatus: (newStatus: UserStatus) => Promise<void>
    loading: boolean
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    status: 'online',
    setStatus: async () => { },
    loading: true,
})

export const useAuth = () => {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}

interface AuthProviderProps {
    children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null)
    const [status, setStatusState] = useState<UserStatus>('online')
    const [loading, setLoading] = useState(true)

    const setStatus = async (newStatus: UserStatus): Promise<void> => {
        if (!user) {
            return Promise.resolve()
        }

        setStatusState(newStatus)
        await updateUserStatus(user.uid, newStatus)
        return Promise.resolve()
    }

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setUser(user)
            setLoading(false)

            if (user) {
                trackPresence()
                const statusUnsubscribe = subscribeToUserStatus(user.uid, (newStatus) => {
                    setStatusState(newStatus)
                })

                return () => {
                    statusUnsubscribe()
                }
            }
            return undefined
        })

        return unsubscribe
    }, [])

    return (
        <AuthContext.Provider value={{ user, status, setStatus, loading }}>
            {children}
        </AuthContext.Provider>
    )
} 