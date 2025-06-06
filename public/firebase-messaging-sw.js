importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: self.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: self.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: self.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: self.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: self.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: self.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: self.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage(function (payload) {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    const notificationTitle = payload.notification?.title || 'New Notification';
    const notificationOptions = {
        body: payload.notification?.body,
        icon: '/favicon.svg',
        data: payload.data || {},
    };
    self.registration.showNotification(notificationTitle, notificationOptions);
}); 