// Import Firebase scripts for service worker
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Initialize Firebase in service worker
// Note: You'll need to replace these with your actual Firebase config values
const firebaseConfig = {
    apiKey: "your-api-key",
    authDomain: "your-auth-domain",
    projectId: "your-project-id",
    storageBucket: "your-storage-bucket",
    messagingSenderId: "your-messaging-sender-id",
    appId: "your-app-id"
};

firebase.initializeApp(firebaseConfig);

// Initialize Firebase Cloud Messaging
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
    console.log('Background message received:', payload);

    const { notification, data } = payload;

    // Customize notification
    const notificationTitle = notification?.title || 'New Message';
    const notificationOptions = {
        body: notification?.body || 'You have a new message',
        icon: '/icons/notification-icon.png',
        badge: '/icons/badge-icon.png',
        tag: 'chat-message',
        requireInteraction: true,
        actions: [
            {
                action: 'open',
                title: 'Open Chat'
            },
            {
                action: 'close',
                title: 'Dismiss'
            }
        ],
        data: data
    };

    // Show notification
    self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    console.log('Notification click received:', event);

    event.notification.close();

    if (event.action === 'open' || !event.action) {
        // Open the app when notification is clicked
        event.waitUntil(
            clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
                // If app is already open, focus it
                for (const client of clientList) {
                    if (client.url.includes(self.location.origin) && 'focus' in client) {
                        return client.focus();
                    }
                }

                // If app is not open, open it
                if (clients.openWindow) {
                    return clients.openWindow('/');
                }
            })
        );
    }
});

// Handle push events (optional, for custom handling)
self.addEventListener('push', (event) => {
    console.log('Push event received:', event);

    if (event.data) {
        try {
            const payload = event.data.json();
            console.log('Push payload:', payload);

            // You can add custom logic here if needed
            // The Firebase messaging will handle most cases automatically
        } catch (error) {
            console.error('Error parsing push payload:', error);
        }
    }
});

// Service worker installation
self.addEventListener('install', (event) => {
    console.log('Firebase messaging service worker installed');
    self.skipWaiting();
});

// Service worker activation
self.addEventListener('activate', (event) => {
    console.log('Firebase messaging service worker activated');
    event.waitUntil(self.clients.claim());
}); 