import { rtdb } from '@/lib/firebase';
import { ref, set, remove, onValue, serverTimestamp } from 'firebase/database';
import type { TypingIndicator } from '@/lib/types';

const TYPING_TIMEOUT = 3000; // 3 seconds before removing typing indicator
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// Added: safe type guard for Firebase-style errors that may include a code property
function hasErrorCode(err: unknown, code?: string): err is { code: string } {
    if (typeof err === 'object' && err !== null && 'code' in err) {
        const c = (err as { code?: unknown }).code;
        return typeof c === 'string' && (code ? c === code : true);
    }
    return false;
}

// Added: strongly typed representation of typing data from RTDB
interface RawTypingDataEntry {
    userName?: string;
    timestamp?: number | string | null;
}
type RawTypingData = Record<string, RawTypingDataEntry>;

export class TypingIndicatorService {
    private static typingTimeouts: Map<string, NodeJS.Timeout> = new Map();
    private static listeners: Map<string, () => void> = new Map();

    /**
     * Retry function with exponential backoff
     */
    private static async retryOperation<T>(
        operation: () => Promise<T>,
        retries: number = MAX_RETRIES,
        delay: number = RETRY_DELAY
    ): Promise<T> {
        try {
            return await operation();
        } catch (error) {
            if (retries > 0 && !hasErrorCode(error, 'PERMISSION_DENIED')) {
                console.warn(`Operation failed, retrying in ${delay}ms. Retries left: ${retries}`);
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.retryOperation(operation, retries - 1, delay * 2);
            }
            throw error;
        }
    }

    /**
     * Start typing indicator for a user in a room
     */
    static async startTyping(userId: string, userName: string, roomId: string): Promise<void> {
        if (!rtdb) {
            console.warn('RTDB not initialized');
            return;
        }

        if (!userId || !userName || !roomId) {
            console.warn('Missing required parameters for typing indicator');
            return;
        }

        try {
            await this.retryOperation(async () => {
                const typingRef = ref(rtdb, `typing/${roomId}/${userId}`);
                await set(typingRef, {
                    userName,
                    timestamp: serverTimestamp()
                });
            });

            // Clear existing timeout
            const timeoutKey = `${roomId}-${userId}`;
            const existingTimeout = this.typingTimeouts.get(timeoutKey);
            if (existingTimeout) {
                clearTimeout(existingTimeout);
            }

            // Set new timeout to auto-remove typing indicator
            const timeout = setTimeout(() => {
                this.stopTyping(userId, roomId);
                this.typingTimeouts.delete(timeoutKey);
            }, TYPING_TIMEOUT);

            this.typingTimeouts.set(timeoutKey, timeout);
        } catch (error) {
            if (hasErrorCode(error, 'PERMISSION_DENIED')) {
                console.warn('Permission denied for typing indicator. User may not be authenticated or database rules need updating.');
            } else {
                console.error('Error setting typing indicator:', error);
            }
        }
    }

    /**
     * Stop typing indicator for a user in a room
     */
    static async stopTyping(userId: string, roomId: string): Promise<void> {
        if (!rtdb) return;

        if (!userId || !roomId) {
            console.warn('Missing required parameters for stopping typing indicator');
            return;
        }

        try {
            await this.retryOperation(async () => {
                const typingRef = ref(rtdb, `typing/${roomId}/${userId}`);
                await remove(typingRef);
            });

            // Clear timeout
            const timeoutKey = `${roomId}-${userId}`;
            const existingTimeout = this.typingTimeouts.get(timeoutKey);
            if (existingTimeout) {
                clearTimeout(existingTimeout);
                this.typingTimeouts.delete(timeoutKey);
            }
        } catch (error) {
            if (hasErrorCode(error, 'PERMISSION_DENIED')) {
                console.warn('Permission denied for removing typing indicator. User may not be authenticated or database rules need updating.');
            } else {
                console.error('Error removing typing indicator:', error);
            }
        }
    }

    /**
     * Listen for typing indicators in a room
     */
    static listenToTyping(
        roomId: string,
        currentUserId: string,
        onTypingChange: (typingUsers: TypingIndicator[]) => void
    ): () => void {
        if (!rtdb) {
            console.warn('RTDB not initialized');
            return () => { };
        }

        if (!roomId || !currentUserId) {
            console.warn('Missing required parameters for typing listener');
            return () => { };
        }

        const typingRef = ref(rtdb, `typing/${roomId}`);
        const listenerKey = `typing-${roomId}`;

        // Remove existing listener if any
        this.stopListeningToTyping(roomId);

        const unsubscribe = onValue(typingRef, (snapshot) => {
            try {
                const typingData = snapshot.val() as RawTypingData | null;
                const typingUsers: TypingIndicator[] = [];

                if (typingData && typeof typingData === 'object') {
                    Object.entries(typingData).forEach(([userId, data]) => {
                        if (userId !== currentUserId && data?.userName) {
                            const rawTs = data.timestamp;
                            let tsDate: Date;
                            if (typeof rawTs === 'number') {
                                tsDate = new Date(rawTs);
                            } else if (typeof rawTs === 'string') {
                                const parsed = Date.parse(rawTs);
                                tsDate = isNaN(parsed) ? new Date() : new Date(parsed);
                            } else {
                                tsDate = new Date();
                            }
                            typingUsers.push({
                                userId,
                                userName: data.userName,
                                roomId,
                                timestamp: tsDate
                            });
                        }
                    });
                }

                onTypingChange(typingUsers);
            } catch (error) {
                console.error('Error processing typing indicators:', error);
                onTypingChange([]); // Return empty array on error
            }
        }, (error) => {
            if (hasErrorCode(error, 'PERMISSION_DENIED')) {
                console.warn('Permission denied for listening to typing indicators. User may not be authenticated or database rules need updating.');
            } else {
                console.error('Error listening to typing indicators:', error);
            }
            onTypingChange([]); // Return empty array on error
        });

        this.listeners.set(listenerKey, unsubscribe);

        // Return cleanup function
        return () => this.stopListeningToTyping(roomId);
    }

    /**
     * Stop listening to typing indicators for a room
     */
    static stopListeningToTyping(roomId: string): void {
        const listenerKey = `typing-${roomId}`;
        const unsubscribe = this.listeners.get(listenerKey);

        if (unsubscribe) {
            try {
                unsubscribe();
            } catch (error) {
                console.warn('Error removing typing listener:', error);
            }
            this.listeners.delete(listenerKey);
        }
    }

    /**
     * Clean up all typing indicators for a user (call on logout/disconnect)
     */
    static async cleanupUserTyping(userId: string): Promise<void> {
        if (!rtdb || !userId) return;

        // Clear all timeouts for this user
        Array.from(this.typingTimeouts.keys())
            .filter(key => key.includes(userId))
            .forEach(key => {
                const timeout = this.typingTimeouts.get(key);
                if (timeout) {
                    clearTimeout(timeout);
                    this.typingTimeouts.delete(key);
                }
            });

        // Try to remove typing indicators from common rooms
        // In a production app, you'd track which rooms the user was typing in
        const commonRooms = ['lobby']; // Add other common room IDs as needed
        
        for (const roomId of commonRooms) {
            try {
                await this.stopTyping(userId, roomId);
            } catch (error) {
                // Silently ignore errors during cleanup
                console.warn(`Failed to cleanup typing indicator for room ${roomId}:`, error);
            }
        }
    }

    /**
     * Debounced typing handler - call this on every keystroke
     */
    static debounceTyping = (() => {
        let timeout: NodeJS.Timeout;

        return (userId: string, userName: string, roomId: string) => {
            if (!userId || !userName || !roomId) {
                console.warn('Missing required parameters for debounced typing');
                return;
            }

            clearTimeout(timeout);

            // Start typing immediately
            this.startTyping(userId, userName, roomId);

            // Stop typing after delay
            timeout = setTimeout(() => {
                this.stopTyping(userId, roomId);
            }, TYPING_TIMEOUT);
        };
    })();
}