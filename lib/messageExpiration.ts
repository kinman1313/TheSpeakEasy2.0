import { db } from '@/lib/firebase';
import { doc, deleteDoc, updateDoc, collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { MESSAGE_EXPIRATION_OPTIONS, type ExpirationTimer } from '@/lib/types';

export class MessageExpirationService {
    private static expirationTimeouts: Map<string, NodeJS.Timeout> = new Map();

    /**
     * Calculate expiration date based on timer option
     */
    static calculateExpirationDate(timer: ExpirationTimer): Date | null {
        if (timer === 'never') return null;

        const option = MESSAGE_EXPIRATION_OPTIONS[timer];
        if (!option.duration) return null;

        if (timer === 'immediate') {
            return new Date(); // Expire immediately
        }

        return new Date(Date.now() + option.duration);
    }

    /**
     * Schedule message expiration
     */
    static scheduleMessageExpiration(
        messageId: string,
        expirationDate: Date | null,
        roomId: string,
        roomType: 'lobby' | 'room' | 'dm'
    ): void {
        // Clear existing timeout if any
        this.clearMessageExpiration(messageId);

        if (!expirationDate) return;

        const now = Date.now();
        const expirationTime = expirationDate.getTime();
        const delay = expirationTime - now;

        if (delay <= 0) {
            // Already expired, delete immediately
            this.deleteExpiredMessage(messageId, roomId, roomType);
            return;
        }

        // Schedule deletion
        const timeout = setTimeout(() => {
            this.deleteExpiredMessage(messageId, roomId, roomType);
            this.expirationTimeouts.delete(messageId);
        }, delay);

        this.expirationTimeouts.set(messageId, timeout);
    }

    /**
     * Clear scheduled expiration for a message
     */
    static clearMessageExpiration(messageId: string): void {
        const timeout = this.expirationTimeouts.get(messageId);
        if (timeout) {
            clearTimeout(timeout);
            this.expirationTimeouts.delete(messageId);
        }
    }

    /**
     * Delete an expired message
     */
    private static async deleteExpiredMessage(
        messageId: string,
        roomId: string,
        roomType: 'lobby' | 'room' | 'dm'
    ): Promise<void> {
        try {
            let collectionPath: string;

            if (roomType === 'lobby') {
                collectionPath = 'messages';
            } else if (roomType === 'room') {
                collectionPath = `rooms/${roomId}/messages`;
            } else {
                collectionPath = `directMessages/${roomId}/messages`;
            }

            const messageRef = doc(db, collectionPath, messageId);
            await deleteDoc(messageRef);

            console.log(`Expired message ${messageId} deleted from ${collectionPath}`);
        } catch (error) {
            console.error(`Error deleting expired message ${messageId}:`, error);
        }
    }

    /**
     * Initialize expiration timers for existing messages on app start
     */
    static async initializeExpirationTimers(
        roomId: string | null,
        roomType: 'lobby' | 'room' | 'dm'
    ): Promise<void> {
        try {
            let collectionPath: string;

            if (roomType === 'lobby') {
                collectionPath = 'messages';
            } else if (roomType === 'room' && roomId) {
                collectionPath = `rooms/${roomId}/messages`;
            } else if (roomType === 'dm' && roomId) {
                collectionPath = `directMessages/${roomId}/messages`;
            } else {
                return;
            }

            const messagesRef = collection(db, collectionPath);
            const q = query(messagesRef, where('expiresAt', '!=', null));
            const snapshot = await getDocs(q);

            snapshot.forEach((doc) => {
                const data = doc.data();
                const expiresAt = data.expiresAt;

                if (expiresAt) {
                    // Convert Firestore Timestamp to Date
                    const expirationDate = expiresAt instanceof Timestamp
                        ? expiresAt.toDate()
                        : new Date(expiresAt);

                    this.scheduleMessageExpiration(
                        doc.id,
                        expirationDate,
                        roomId || 'lobby',
                        roomType
                    );
                }
            });

            console.log(`Initialized ${snapshot.size} expiration timers for ${collectionPath}`);
        } catch (error) {
            console.error('Error initializing expiration timers:', error);
        }
    }

    /**
     * Update message expiration
     */
    static async updateMessageExpiration(
        messageId: string,
        newTimer: ExpirationTimer,
        roomId: string | null,
        roomType: 'lobby' | 'room' | 'dm'
    ): Promise<void> {
        try {
            let collectionPath: string;

            if (roomType === 'lobby') {
                collectionPath = 'messages';
            } else if (roomType === 'room' && roomId) {
                collectionPath = `rooms/${roomId}/messages`;
            } else if (roomType === 'dm' && roomId) {
                collectionPath = `directMessages/${roomId}/messages`;
            } else {
                return;
            }

            const messageRef = doc(db, collectionPath, messageId);
            const newExpirationDate = this.calculateExpirationDate(newTimer);

            await updateDoc(messageRef, {
                expirationTimer: newTimer,
                expiresAt: newExpirationDate ? Timestamp.fromDate(newExpirationDate) : null
            });

            // Reschedule expiration
            this.scheduleMessageExpiration(
                messageId,
                newExpirationDate,
                roomId || 'lobby',
                roomType
            );

            console.log(`Updated expiration for message ${messageId} to ${newTimer}`);
        } catch (error) {
            console.error('Error updating message expiration:', error);
        }
    }

    /**
     * Clean up all expiration timers (call on app unmount)
     */
    static cleanup(): void {
        this.expirationTimeouts.forEach((timeout) => {
            clearTimeout(timeout);
        });
        this.expirationTimeouts.clear();
        console.log('Message expiration timers cleaned up');
    }

    /**
     * Get human-readable expiration info
     */
    static getExpirationInfo(expiresAt: Date | null, timer: ExpirationTimer): string {
        if (!expiresAt || timer === 'never') return 'Never expires';

        const now = Date.now();
        const expirationTime = expiresAt.getTime();
        const timeLeft = expirationTime - now;

        if (timeLeft <= 0) return 'Expired';

        const minutes = Math.floor(timeLeft / (1000 * 60));
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `Expires in ${days} day${days > 1 ? 's' : ''}`;
        if (hours > 0) return `Expires in ${hours} hour${hours > 1 ? 's' : ''}`;
        if (minutes > 0) return `Expires in ${minutes} minute${minutes > 1 ? 's' : ''}`;
        return 'Expires in less than a minute';
    }
} 