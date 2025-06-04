// IMPORTANT: For background push notifications to work, you need a service worker.
// Create a file in your `public` directory named `firebase-messaging-sw.js`
// Add the following content to it (adjust Firebase SDK versions as needed):
/*
// public/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js'); // Or your specific version
importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-messaging-compat.js'); // Or your specific version

// Initialize the Firebase app in the service worker
// Insert your Firebase project's config object here
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID" // Optional
};

firebase.initializeApp(firebaseConfig);

// Retrieve an instance of Firebase Messaging so that it can handle background messages.
const messagingCompat = firebase.messaging();

messagingCompat.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  // Customize notification here
  const notificationTitle = payload.notification?.title || "New Message";
  const notificationOptions = {
    body: payload.notification?.body || "You have a new message.",
    icon: payload.notification?.icon || '/icons/icon-192x192.png' // Default icon
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
*/

import { messaging, db } from '@/lib/firebase';
import { getToken, deleteToken } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion, arrayRemove, setDoc, getDoc } from 'firebase/firestore';

/**
 * Requests notification permission and retrieves the FCM token.
 * If permission is granted and a token is received, it saves the token to the user's Firestore document.
 * @param userId The UID of the current user.
 * @param vapidKey Your VAPID key for FCM.
 * @returns The FCM token if permission is granted and token is retrieved, otherwise null.
 */
export async function requestNotificationPermissionAndToken(userId: string, vapidKey: string): Promise<string | null> {
  if (!messaging) {
    console.error("Firebase Messaging is not initialized.");
    // alert("Notification service is not available."); // Optional user feedback
    return null;
  }
  // VAPID key check is implicitly handled by getToken if NEXT_PUBLIC_FCM_VAPID_KEY is used directly there
  // Or, if passed explicitly as vapidKey param, ensure it's present.
  if (!vapidKey) {
     console.warn("VAPID key is missing. Cannot request notification token.");
     return null;
  }


  try {
    const currentPermission = Notification.permission;
    if (currentPermission === 'granted') {
      // Permission already granted
    } else if (currentPermission === 'default') {
      const permissionResult = await Notification.requestPermission();
      if (permissionResult !== 'granted') {
        console.log("Notification permission denied by user.");
        return null;
      }
    } else { // 'denied'
      console.log("Notification permission is denied. User needs to change browser settings.");
      return null;
    }

    // Get token
    const currentToken = await getToken(messaging, { vapidKey });
    if (currentToken) {
      console.log('FCM Token:', currentToken);
      const userDocRef = doc(db, "users", userId);
      await setDoc(userDocRef, {
        fcmTokens: arrayUnion(currentToken),
        notificationsEnabled: true
      }, { merge: true });
      console.log('Token and notification preference saved to Firestore.');
      return currentToken;
    } else {
      console.warn('No registration token available. Request permission to generate one.');
      return null;
    }
  } catch (error) {
    console.error('Error getting notification token or permission:', error);
    return null;
  }
}

/**
 * Disables notifications for the user by updating Firestore and deleting the FCM token.
 * @param userId The UID of the current user.
 * @param currentToken The specific FCM token to delete for this device/session (optional).
 */
export async function disableNotifications(userId: string, currentToken?: string | null): Promise<void> {
  if (!db) {
    throw new Error("Firestore is not initialized.");
  }
  const userDocRef = doc(db, "users", userId);
  try {
    if (currentToken && messaging) {
      await deleteToken(messaging);
      console.log('FCM token deleted from FCM service.');
      await updateDoc(userDocRef, {
        fcmTokens: arrayRemove(currentToken),
        notificationsEnabled: false
      });
      console.log('Specific FCM token removed from Firestore and notifications disabled.');
    } else {
      // Just disable generally in Firestore if no specific token to remove from FCM
      await updateDoc(userDocRef, {
        notificationsEnabled: false
      });
      console.log('Notifications disabled in Firestore (no specific token removed from FCM).');
    }
  } catch (error) {
    console.error('Error disabling notifications or deleting token:', error);
    throw error; // Re-throw to be caught by caller
  }
}

/**
 * Fetches the user's notification preferences from Firestore.
 * @param userId The UID of the current user.
 * @returns An object with notificationsEnabled and fcmTokens, or a default object if user doc doesn't exist/fails.
 */
export async function getUserNotificationPreferences(userId: string): Promise<{ notificationsEnabled: boolean; fcmTokens: string[] }> {
    if (!db || !userId) return { notificationsEnabled: false, fcmTokens: [] };
    const userDocRef = doc(db, "users", userId);
    try {
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            return {
                notificationsEnabled: data.notificationsEnabled || false,
                fcmTokens: data.fcmTokens || []
            };
        } else {
            console.log("No such user document for notification preferences! Returning default false.");
            return { notificationsEnabled: false, fcmTokens: [] }; // Default if no doc
        }
    } catch (error) {
        console.error("Error fetching user notification preferences:", error);
        return { notificationsEnabled: false, fcmTokens: [] }; // Default on error
    }
}
