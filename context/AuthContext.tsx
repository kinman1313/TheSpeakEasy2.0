import { createContext, useContext, useEffect, useState } from 'react';
import { User, UserStatus } from '../../types/user';
import { auth } from '../../lib/firebase/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { subscribeToUserStatus, trackPresence } from '../../lib/presence';
import { updateUserStatus } from '../../lib/firebase/firestore';

export const AuthContext = createContext({
    user: null,
    status: 'offline',
    setStatus: async () => { },
    loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [status, setStatus] = useState<UserStatus>('offline');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                // Initialize presence tracking
                trackPresence();

                // Subscribe to own status changes
                const unsubscribeStatus = subscribeToUserStatus(firebaseUser.uid, (newStatus) => {
                    setStatus(newStatus);
                });

                return () => {
                    unsubscribeStatus();
                };
            } else {
                setUser(null);
                setStatus('offline');
            }
            setLoading(false);
        });

        return () => {
            unsubscribeAuth();
        };
    }, []);

    const handleSetStatus = async (newStatus: UserStatus) => {
        if (!user) return;
        await updateUserStatus(user.id, newStatus);
    };

    return (
        <AuthContext.Provider value={{ user, status, setStatus: handleSetStatus, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext); 