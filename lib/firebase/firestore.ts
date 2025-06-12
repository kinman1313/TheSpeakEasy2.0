import { db } from './firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { UserStatus } from '../../types/user';

export interface FirestoreUser {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    status: UserStatus;
    // ... existing fields ...
}

export async function updateUserStatus(userId: string, status: UserStatus): Promise<void> {
    try {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
            status,
            lastActive: serverTimestamp(),
        });
    } catch (error) {
        console.error('Error updating user status:', error);
        throw error;
    }
} 