import { db } from '@/lib/firebase/firebase';
import { UserStatus } from '@/types/user';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth } from '@/lib/firebase/firebase';

// Track user presence in Firestore
export function trackPresence() {
    onAuthStateChanged(auth, async (user) => {
        if (!user) return;

        const userRef = doc(db, 'users', user.uid);
        const statusRef = doc(db, 'status', user.uid);

        // Set initial status
        await setDoc(statusRef, {
            status: 'online' as UserStatus,
            lastChanged: serverTimestamp(),
        });

        // Update Firestore when connection state changes
        const unsubscribe = onSnapshot(doc(db, '.info/connected'), async (snapshot) => {
            if (snapshot.data()?.connected) {
                // Reconnect: set status to online
                await setDoc(statusRef, {
                    status: 'online' as UserStatus,
                    lastChanged: serverTimestamp(),
                }, { merge: true });
            } else {
                // Offline: set status to offline
                await setDoc(statusRef, {
                    status: 'offline' as UserStatus,
                    lastChanged: serverTimestamp(),
                }, { merge: true });
            }
        });

        // Cleanup on logout
        return () => {
            unsubscribe();
            setDoc(statusRef, {
                status: 'offline' as UserStatus,
                lastChanged: serverTimestamp(),
            }, { merge: true });
        };
    });
}

// Subscribe to a user's status changes
export function subscribeToUserStatus(userId: string, callback: (status: UserStatus) => void) {
    const statusRef = doc(db, 'status', userId);
    return onSnapshot(statusRef, (doc) => {
        callback(doc.data()?.status || 'offline');
    });
} 