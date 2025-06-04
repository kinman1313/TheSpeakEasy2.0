import { useState, useEffect } from 'react';
import { Firestore, collection, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';

// Define Message interface (can be moved to a shared types file if used elsewhere)
export interface Message {
  id: string;
  text: string;
  userId: string;
  userName: string;
  userPhotoURL?: string;
  timestamp: Timestamp; // Firestore Timestamp
  reactions?: { [emoji: string]: string[] };
  voiceMessageUrl?: string; // Added for voice messages
  voiceMessageDuration?: number; // Added for voice message duration in seconds
}

interface UseMessagesReturn {
  messages: Message[];
  error: Error | null;
}

export const useMessages = (
  db: Firestore | undefined,
  firebaseStatus: 'initializing' | 'ready' | 'error'
): UseMessagesReturn => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (firebaseStatus !== 'ready' || !db) {
      if (messages.length > 0) setMessages([]); // Clear messages if status is no longer ready
      return;
    }

    setError(null);
    const messagesRef = collection(db, "messages");
    const q = query(messagesRef, orderBy("timestamp", "asc"));

    const unsubscribe = onSnapshot(q,
      (snapshot) => {
        const newMessages = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Message[];
        setMessages(newMessages);
      },
      (err) => {
        console.error("Error subscribing to messages:", err);
        setError(err);
        setMessages([]);
      }
    );

    return () => unsubscribe();
  }, [db, firebaseStatus]); // Corrected dependencies

  return { messages, error };
};
