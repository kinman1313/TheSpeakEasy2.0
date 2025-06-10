import { rtdb } from '@/lib/firebase';
import { ref, set, remove, onValue, off, serverTimestamp } from 'firebase/database';
import type { TypingIndicator } from '@/lib/types';

const TYPING_TIMEOUT = 3000; // 3 seconds before removing typing indicator

export class TypingIndicatorService {
    private static typingTimeouts: Map<string, NodeJS.Timeout> = new Map();
    private static listeners: Map<string, any> = new Map();

    /**
     * Start typing indicator for a user in a room
     */
    static async startTyping(userId: string, userName: string, roomId: string): Promise<void> {
        if (!rtdb) {
            console.warn('RTDB not initialized');
            return;
        }

        try {
            const typingRef = ref(rtdb, `typing/${roomId}/${userId}`);
            await set(typingRef, {
                userName,
                timestamp: serverTimestamp()
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
            console.error('Error setting typing indicator:', error);
        }
    }

    /**
     * Stop typing indicator for a user in a room
     */
    static async stopTyping(userId: string, roomId: string): Promise<void> {
        if (!rtdb) return;

        try {
            const typingRef = ref(rtdb, `typing/${roomId}/${userId}`);
            await remove(typingRef);

            // Clear timeout
            const timeoutKey = `${roomId}-${userId}`;
            const existingTimeout = this.typingTimeouts.get(timeoutKey);
            if (existingTimeout) {
                clearTimeout(existingTimeout);
                this.typingTimeouts.delete(timeoutKey);
            }
        } catch (error) {
            console.error('Error removing typing indicator:', error);
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

        const typingRef = ref(rtdb, `typing/${roomId}`);
        const listenerKey = `typing-${roomId}`;

        // Remove existing listener if any
        this.stopListeningToTyping(roomId);

        const listener = onValue(typingRef, (snapshot) => {
            const typingData = snapshot.val();
            const typingUsers: TypingIndicator[] = [];

            if (typingData) {
                Object.entries(typingData).forEach(([userId, data]: [string, any]) => {
                    // Don't include current user in typing indicators
                    if (userId !== currentUserId && data.userName) {
                        typingUsers.push({
                            userId,
                            userName: data.userName,
                            roomId,
                            timestamp: new Date(data.timestamp || Date.now())
                        });
                    }
                });
            }

            onTypingChange(typingUsers);
        });

        this.listeners.set(listenerKey, { ref: typingRef, listener });

        // Return cleanup function
        return () => this.stopListeningToTyping(roomId);
    }

    /**
     * Stop listening to typing indicators for a room
     */
    static stopListeningToTyping(roomId: string): void {
        const listenerKey = `typing-${roomId}`;
        const listenerData = this.listeners.get(listenerKey);

        if (listenerData) {
            off(listenerData.ref, listenerData.listener);
            this.listeners.delete(listenerKey);
        }
    }

    /**
     * Clean up all typing indicators for a user (call on logout/disconnect)
     */
    static async cleanupUserTyping(userId: string): Promise<void> {
        if (!rtdb) return;

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

        // Note: In a real app, you'd need to track which rooms the user was typing in
        // For now, this is a basic cleanup that removes timeouts
    }

    /**
     * Debounced typing handler - call this on every keystroke
     */
    static debounceTyping = (() => {
        let timeout: NodeJS.Timeout;

        return (userId: string, userName: string, roomId: string) => {
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