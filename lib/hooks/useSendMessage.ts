import { useState } from 'react';
import { Firestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { User as FirebaseAuthUser } from 'firebase/auth'; // Firebase Auth User type

// Re-define or import User if it's a custom type, otherwise FirebaseAuthUser is fine
// For this context, FirebaseAuthUser (renamed to User for clarity if preferred) is suitable
export type User = FirebaseAuthUser;

interface SendMessageOptions {
  voiceMessageUrl?: string;
  voiceMessageDuration?: number;
}

interface UseSendMessageReturn {
  sendMessage: (
    text: string,
    user: User,
    options?: SendMessageOptions
  ) => Promise<void>;
  isSending: boolean;
  error: Error | null;
}

export const useSendMessage = (
  db: Firestore | undefined,
  firebaseStatus: 'initializing' | 'ready' | 'error'
): UseSendMessageReturn => {
  const [isSending, setIsSending] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const sendMessage = async (
    text: string,
    user: User,
    options?: SendMessageOptions
  ): Promise<void> => {
    if (firebaseStatus !== 'ready' || !db) {
      const err = new Error("Firebase is not ready or database is unavailable.");
      console.error("Error sending message:", err);
      setError(err);
      return;
    }

    // If it's a voice message, text can be empty. Otherwise, text is required.
    if (!options?.voiceMessageUrl && !text.trim()) {
      console.warn("Attempted to send an empty message without voice content.");
      // setError(new Error("Cannot send an empty message.")); // Or just return silently
      return;
    }
    if (!user) {
      setError(new Error("User not authenticated."));
      return;
    }

    setIsSending(true);
    setError(null);

    const messageData: {
      text: string;
      userId: string;
      userName: string;
      userPhotoURL: string | null;
      timestamp: Object;
      voiceMessageUrl?: string;
      voiceMessageDuration?: number;
    } = {
      text: text, // Can be empty or placeholder like "[Voice Message]"
      userId: user.uid,
      userName: user.displayName || "Anonymous",
      userPhotoURL: user.photoURL,
      timestamp: serverTimestamp(),
    };

    if (options?.voiceMessageUrl) {
      messageData.voiceMessageUrl = options.voiceMessageUrl;
    }
    if (options?.voiceMessageDuration !== undefined) { // Duration can be 0, so check for undefined
      messageData.voiceMessageDuration = options.voiceMessageDuration;
    }

    try {
      await addDoc(collection(db, "messages"), messageData);
    } catch (err: any) {
      console.error("Error sending message:", err);
      setError(err);
    } finally {
      setIsSending(false);
    }
  };

  return { sendMessage, isSending, error };
};
