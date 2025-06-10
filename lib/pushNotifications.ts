import { getApps } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';
// Note: firebaseConfig should be exported from @/lib/firebase
// For now using a placeholder - you'll need to ensure it's properly exported

let messaging: Messaging | null = null;

export interface NotificationResult {
    permission: NotificationPermission;
    token?: string;
    error?: string;
}

export class PushNotificationService {
    private static instance: PushNotificationService;
    private vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

    static getInstance(): PushNotificationService {
        if (!this.instance) {
            this.instance = new PushNotificationService();
        }
        return this.instance;
    }

    /**
     * Initialize Firebase Cloud Messaging
     */
    async initializeMessaging(): Promise<boolean> {
        try {
            // Check if we're in a browser environment
            if (typeof window === 'undefined') {
                console.log('Push notifications not available in server environment');
                return false;
            }

            // Check if service workers are supported
            if (!('serviceWorker' in navigator)) {
                console.warn('Service workers not supported');
                return false;
            }

            // Initialize Firebase app if not already done
            // Note: You'll need to import and use your actual firebaseConfig here
            const app = getApps().length > 0 ? getApps()[0] : null;
            if (!app) {
                console.error('Firebase app not initialized. Please ensure firebase is properly configured.');
                return false;
            }

            // Initialize messaging
            messaging = getMessaging(app);

            console.log('Firebase Cloud Messaging initialized');
            return true;
        } catch (error) {
            console.error('Error initializing Firebase Cloud Messaging:', error);
            return false;
        }
    }

    /**
 * Request notification permission and get FCM token
 */
    async requestPermission(): Promise<NotificationResult> {
        try {
            if (!messaging) {
                const initialized = await this.initializeMessaging();
                if (!initialized) {
                    return {
                        permission: 'denied' as NotificationPermission,
                        error: 'Failed to initialize messaging'
                    };
                }
            }

            // Check current permission status
            if (Notification.permission === 'denied') {
                return {
                    permission: 'denied' as NotificationPermission,
                    error: 'Notifications are blocked. Please enable them in browser settings.'
                };
            }

            // Request permission if not already granted
            if (Notification.permission !== 'granted') {
                const permission = await Notification.requestPermission();
                if (permission !== 'granted') {
                    return {
                        permission: permission as NotificationPermission,
                        error: 'Notification permission not granted'
                    };
                }
            }

            // Get FCM token
            if (!this.vapidKey) {
                console.warn('VAPID key not found. Add NEXT_PUBLIC_FIREBASE_VAPID_KEY to your environment variables.');
                return {
                    permission: 'granted' as NotificationPermission,
                    error: 'VAPID key not configured'
                };
            }

            const token = await getToken(messaging!, {
                vapidKey: this.vapidKey
            });

            if (!token) {
                return {
                    permission: 'granted' as NotificationPermission,
                    error: 'Failed to get FCM token'
                };
            }

            console.log('FCM token obtained:', token);
            return {
                permission: 'granted' as NotificationPermission,
                token
            };
        } catch (error) {
            console.error('Error requesting notification permission:', error);
            return {
                permission: 'denied' as NotificationPermission,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Listen for foreground messages
     */
    onForegroundMessage(callback: (payload: any) => void): (() => void) | null {
        if (!messaging) {
            console.warn('Messaging not initialized');
            return null;
        }

        try {
            const unsubscribe = onMessage(messaging, (payload) => {
                console.log('Foreground message received:', payload);
                callback(payload);
            });

            return unsubscribe;
        } catch (error) {
            console.error('Error setting up foreground message listener:', error);
            return null;
        }
    }

    /**
     * Show a local notification (fallback for foreground messages)
     */
    showLocalNotification(title: string, options: NotificationOptions = {}): void {
        if (!('Notification' in window) || Notification.permission !== 'granted') {
            console.warn('Notifications not available or not permitted');
            return;
        }

        try {
            const notification = new Notification(title, {
                icon: '/icons/notification-icon.png',
                badge: '/icons/badge-icon.png',
                tag: 'chat-message',
                ...options
            });

            // Auto-close after 5 seconds
            setTimeout(() => {
                notification.close();
            }, 5000);

            // Handle click events
            notification.onclick = () => {
                window.focus();
                notification.close();
            };
        } catch (error) {
            console.error('Error showing local notification:', error);
        }
    }

    /**
     * Store FCM token for the user
     */
    async storeFCMToken(userId: string, token: string): Promise<void> {
        try {
            // Store token in Firestore for server-side message sending
            const { db } = await import('@/lib/firebase');
            const { doc, setDoc } = await import('firebase/firestore');

            await setDoc(doc(db, 'userTokens', userId), {
                fcmToken: token,
                updatedAt: new Date(),
                userAgent: navigator.userAgent
            }, { merge: true });

            console.log('FCM token stored for user:', userId);
        } catch (error) {
            console.error('Error storing FCM token:', error);
        }
    }

    /**
     * Remove FCM token when user logs out
     */
    async removeFCMToken(userId: string): Promise<void> {
        try {
            const { db } = await import('@/lib/firebase');
            const { doc, deleteDoc } = await import('firebase/firestore');

            await deleteDoc(doc(db, 'userTokens', userId));
            console.log('FCM token removed for user:', userId);
        } catch (error) {
            console.error('Error removing FCM token:', error);
        }
    }

    /**
     * Check if notifications are supported and enabled
     */
    isNotificationSupported(): boolean {
        return (
            typeof window !== 'undefined' &&
            'Notification' in window &&
            'serviceWorker' in navigator
        );
    }

    /**
     * Get current notification permission status
     */
    getPermissionStatus(): NotificationPermission {
        if (!this.isNotificationSupported()) {
            return 'denied' as NotificationPermission;
        }
        return Notification.permission as NotificationPermission;
    }
}

// Export singleton instance
export const pushNotificationService = PushNotificationService.getInstance(); 