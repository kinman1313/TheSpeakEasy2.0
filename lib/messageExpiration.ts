import { adminDb } from '@/lib/firebase-admin';
import { MESSAGE_EXPIRATION_OPTIONS, type ExpirationTimer } from '@/lib/types';
import { QuerySnapshot, DocumentData, QueryDocumentSnapshot } from 'firebase-admin/firestore';

export class MessageExpirationService {
    private static expirationTimeouts: Map<string, NodeJS.Timeout> = new Map();

    /**
     * Calculate expiration date based on timer option
     */
    static calculateExpirationDate(timer: ExpirationTimer): Date | null {
        if (timer === 'never') return null;

        const option = MESSAGE_EXPIRATION_OPTIONS[timer];
        if (!option.duration) return null;

        // Enforce minimum duration
        const minDuration = option.minDuration;
        if (minDuration && option.duration < minDuration) {
            console.warn(`Duration ${option.duration}ms is less than minimum ${minDuration}ms for timer ${timer}`);
            return new Date(Date.now() + minDuration);
        }

        return new Date(Date.now() + option.duration);
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
            const messageRef = adminDb.collection("messages").doc(messageId);
            await messageRef.delete();

            console.log(`Expired message ${messageId} deleted`);
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
            const messagesRef = adminDb.collection("messages");
            const q = messagesRef.where('expiresAt', '!=', null);
            const snapshot = await q.get() as QuerySnapshot<DocumentData>;

            for (const doc of snapshot.docs) {
                const data = doc.data();
                const expiresAt = data.expiresAt;

                if (expiresAt) {
                    const expirationDate = new Date(expiresAt);
                    this.scheduleMessageExpiration(
                        doc.id,
                        expirationDate,
                        roomId || 'lobby',
                        roomType
                    );
                }
            }

            console.log(`Initialized ${snapshot.docs.length} expiration timers`);
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
            const messageRef = adminDb.collection("messages").doc(messageId);
            const newExpirationDate = this.calculateExpirationDate(newTimer);

            await messageRef.update({
                expirationTimer: newTimer,
                expiresAt: newExpirationDate ? newExpirationDate.toISOString() : null
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