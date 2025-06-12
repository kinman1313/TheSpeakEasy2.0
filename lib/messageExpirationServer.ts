import { getAdminDb } from '@/lib/firebase-admin';
import { MESSAGE_EXPIRATION_OPTIONS, type ExpirationTimer } from '@/lib/types';
import { QuerySnapshot, DocumentData } from 'firebase-admin/firestore';

export class MessageExpirationServerService {
    /**
     * Calculate expiration date based on timer option
     */
    static calculateExpirationDate(timer: ExpirationTimer | Date): Date | null {
        if (timer instanceof Date) return timer;
        if (timer === 'never') return null;

        const now = new Date();
        const minutes = timer === '5m' ? 5 : timer === '1h' ? 60 : 24 * 60;
        now.setMinutes(now.getMinutes() + minutes);
        return now;
    }

    /**
     * Validate expiration timer
     */
    static validateExpirationTimer(timer: ExpirationTimer): boolean {
        const option = MESSAGE_EXPIRATION_OPTIONS[timer];
        if (!option) return false;

        // Check if duration meets minimum requirement
        if (option.minDuration && option.duration < option.minDuration) {
            console.warn(`Invalid duration ${option.duration}ms for timer ${timer}. Minimum is ${option.minDuration}ms`);
            return false;
        }

        return true;
    }

    /**
     * Initialize expiration timers for existing messages on server start
     */
    static async initializeExpirationTimers(): Promise<void> {
        try {
            const adminDb = getAdminDb();
            const messagesRef = adminDb.collection("messages");
            const q = messagesRef.where('expiresAt', '!=', null);
            const snapshot = await q.get() as QuerySnapshot<DocumentData>;

            console.log(`Found ${snapshot.docs.length} messages with expiration timers`);
        } catch (error) {
            console.error('Error initializing expiration timers:', error);
        }
    }

    /**
     * Update message expiration
     */
    static async updateMessageExpiration(
        messageId: string,
        newTimer: ExpirationTimer
    ): Promise<void> {
        try {
            const adminDb = getAdminDb();
            const messageRef = adminDb.collection("messages").doc(messageId);
            const newExpirationDate = this.calculateExpirationDate(newTimer);

            await messageRef.update({
                expirationTimer: newTimer,
                expiresAt: newExpirationDate ? newExpirationDate.toISOString() : null
            });

            console.log(`Updated expiration for message ${messageId} to ${newTimer}`);
        } catch (error) {
            console.error('Error updating message expiration:', error);
        }
    }

    /**
     * Delete expired message
     */
    static async deleteExpiredMessage(messageId: string): Promise<void> {
        try {
            const adminDb = getAdminDb();
            const messageRef = adminDb.collection("messages").doc(messageId);
            await messageRef.delete();
            console.log(`Deleted expired message ${messageId}`);
        } catch (error) {
            console.error('Error deleting expired message:', error);
        }
    }
} 