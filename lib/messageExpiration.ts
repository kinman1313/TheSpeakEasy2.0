import { adminDb } from '@/lib/firebase-admin';
import { MESSAGE_EXPIRATION_OPTIONS, type ExpirationTimer } from '@/lib/types';
import { QuerySnapshot, DocumentData } from 'firebase-admin/firestore';

export class MessageExpirationService {
    private static expirationTimeouts = new Map<string, NodeJS.Timeout>();

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
     * Schedule message expiration
     */
    static scheduleMessageExpiration(
        messageId: string,
        timer: ExpirationTimer | Date
    ): void {
        this.clearMessageExpiration(messageId);

        const expirationTime = timer instanceof Date ? timer : this.calculateExpirationDate(timer);
        if (!expirationTime) return;

        const now = new Date();
        const delay = expirationTime.getTime() - now.getTime();

        if (delay > 0) {
            const timeout = setTimeout(() => {
                this.handleExpire(messageId);
            }, delay);

            this.expirationTimeouts.set(messageId, timeout);
        }
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
    private static async deleteExpiredMessage(messageId: string): Promise<void> {
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
    static async initializeExpirationTimers(): Promise<void> {
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
                        expirationDate
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
        newTimer: ExpirationTimer
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
                newTimer
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

    private static handleExpire(messageId: string): void {
        // Implementation for handling expired messages
    }
} 