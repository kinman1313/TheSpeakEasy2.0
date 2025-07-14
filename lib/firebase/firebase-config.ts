import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getDatabase, connectDatabaseEmulator } from 'firebase/database';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

const firebaseConfig = {
  // Your config here
};

// Singleton pattern for Firebase app
let app: any;
let auth: any;
let db: any;
let rtdb: any;
let storage: any;

export const initializeFirebase = () => {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
    rtdb = getDatabase(app);
    storage = getStorage(app);

    // Connect to emulators in development
    if (process.env.NODE_ENV === 'development' && !auth._delegate._config.emulator) {
      connectAuthEmulator(auth, 'http://localhost:9099');
      connectFirestoreEmulator(db, 'localhost', 8080);
      connectDatabaseEmulator(rtdb, 'localhost', 9000);
      connectStorageEmulator(storage, 'localhost', 9199);
    }

    return { app, auth, db, rtdb, storage };
  } catch (error) {
    console.error('Firebase initialization error:', error);
    throw error;
  }
};

export { app, auth, db, rtdb, storage };