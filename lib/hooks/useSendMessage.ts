import { useState } from 'react';
import { Firestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { User as FirebaseAuthUser } from 'firebase/auth'; // Firebase Auth User type

// Re-define or import User if it's a custom type, otherwise FirebaseAuthUser is fine
// For this context, FirebaseAuthUser (renamed to User for clarity if preferred) is suitable
export type User = FirebaseAuthUser;

interface UseSendMessageReturn {
  sendMessage: (text: string, user: User) => Promise<void>;
  isSending: boolean;
  error: Error | null;
}

export const useSendMessage = (
  db: Firestore | undefined,
  firebaseStatus: 'initializing' | 'ready' | 'error'
): UseSendMessageReturn => {
  const [isSending, setIsSending] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const sendMessage = async (text: string, user: User): Promise<void> => {
    if (firebaseStatus !== 'ready' || !db) {
      const err = new Error("Firebase is not ready or database is unavailable.");
      console.error("Error sending message:", err);
      setError(err);
      // Optionally, re-throw the error if the caller needs to handle it directly
      // throw err;
      return;
    }

    if (!text.trim() || !user) {
      // Should be handled by UI, but good to have a check
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      await addDoc(collection(db, "messages"), {
        text: text,
        userId: user.uid,
        userName: user.displayName || "Anonymous",
        userPhotoURL: user.photoURL,
        timestamp: serverTimestamp(),
      });
    } catch (err: any) {
      console.error("Error sending message:", err);
      setError(err);
      // Optionally, re-throw
      // throw err;
    } finally {
      setIsSending(false);
    }
  };

  return { sendMessage, isSending, error };
};
