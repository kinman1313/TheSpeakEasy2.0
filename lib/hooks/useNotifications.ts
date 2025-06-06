import { useEffect, useState, useCallback } from 'react';
import { messaging } from '@/lib/firebase';
import { getToken, onMessage, deleteToken, isSupported, Messaging } from 'firebase/messaging';
import { doc, setDoc, deleteField, updateDoc, getFirestore } from 'firebase/firestore';
import { useAuth } from '@/components/auth/AuthProvider';

const VAPID_KEY = process.env.NEXT_PUBLIC_FCM_VAPID_KEY;

export function useNotifications() {
    const { user } = useAuth();
    const [permission, setPermission] = useState<NotificationPermission>('default');
    const [token, setToken] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isSupportedState, setIsSupportedState] = useState<boolean>(false);

    // Check if FCM is supported
    useEffect(() => {
        isSupported().then(setIsSupportedState);
    }, []);

    // Request permission and get token
    const enableNotifications = useCallback(async () => {
        setError(null);
        if (!isSupportedState) {
            setError('Push notifications are not supported in this browser.');
            return null;
        }
        if (!messaging) {
            setError('Firebase messaging is not initialized.');
            return null;
        }
        if (!user) {
            setError('User not authenticated.');
            return null;
        }
        try {
            const perm = await Notification.requestPermission();
            setPermission(perm);
            if (perm !== 'granted') {
                setError('Notification permission not granted.');
                return null;
            }
            const fcmToken = await getToken(messaging as Messaging, { vapidKey: VAPID_KEY });
            if (fcmToken) {
                setToken(fcmToken);
                // Save token to Firestore
                const db = getFirestore();
                await setDoc(
                    doc(db, 'users', user.uid),
                    { notificationTokens: { [fcmToken]: true } },
                    { merge: true }
                );
            }
            return fcmToken;
        } catch (err: any) {
            setError(err.message || 'Failed to enable notifications.');
            return null;
        }
    }, [user, isSupportedState]);

    // Disable notifications (delete token)
    const disableNotifications = useCallback(async () => {
        setError(null);
        if (!isSupportedState) {
            setError('Push notifications are not supported in this browser.');
            return;
        }
        if (!messaging) {
            setError('Firebase messaging is not initialized.');
            return;
        }
        if (!user || !token) {
            setError('User or token not available.');
            return;
        }
        try {
            await deleteToken(messaging as Messaging);
            setToken(null);
            // Remove token from Firestore
            const db = getFirestore();
            await updateDoc(doc(db, 'users', user.uid), {
                [`notificationTokens.${token}`]: deleteField(),
            });
        } catch (err: any) {
            setError(err.message || 'Failed to disable notifications.');
        }
    }, [user, token, isSupportedState]);

    // Listen for foreground messages
    useEffect(() => {
        if (!messaging || !isSupportedState) return;
        const unsubscribe = onMessage(messaging as Messaging, (payload) => {
            // You can show a toast or notification here
            // Example: toast({ title: payload.notification?.title, description: payload.notification?.body });
            console.log('Foreground message received:', payload);
        });
        return () => {
            unsubscribe();
        };
    }, [isSupportedState]);

    // Get current permission on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            setPermission(Notification.permission);
        }
    }, []);

    return {
        permission,
        token,
        error,
        isSupported: isSupportedState,
        enableNotifications,
        disableNotifications,
    };
} 