import { MESSAGE_EXPIRATION_OPTIONS, type ExpirationTimer } from '@/lib/types';

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
     * Schedule message expiration (client-side only)
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
     * Initialize expiration timers (client-side stub)
     */
    static async initializeExpirationTimers(): Promise<void> {
        // Client-side implementation would fetch from API
        console.log('Client-side expiration timers initialized');
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

    private static handleExpire(_messageId: string): void {
        // Implementation for handling expired messages
        // In a real app, this would call an API endpoint
        console.log('Message expired (client-side handler)');
    }
} 