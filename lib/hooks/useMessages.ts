import { useState, useEffect, useRef, useCallback } from 'react';
import { Firestore, collection, query, orderBy, onSnapshot, Timestamp, enableNetwork, disableNetwork } from 'firebase/firestore';

// Define Message interface (can be moved to a shared types file if used elsewhere)
export interface Message {
  id: string;
  text: string;
  uid: string;
  userId: string;
  userName: string;
  userPhotoURL?: string;
  timestamp: Timestamp; // Firestore Timestamp
  reactions?: { [emoji: string]: string[] };
  voiceMessageUrl?: string;
  voiceMessageDuration?: number;
  gifUrl?: string;
  status: string;
  readBy: string[];
  isEdited?: boolean;
  expiresAt?: Date | null;
  expirationTimer?: string;
}

interface UseMessagesReturn {
  messages: Message[];
  error: Error | null;
  isConnected: boolean;
  isLoading: boolean;
  retryConnection: () => void;
}

export const useMessages = (
  db: Firestore | undefined,
  firebaseStatus: 'initializing' | 'ready' | 'error'
): UseMessagesReturn => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [isConnected, setIsConnected] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const unsubscribeRef = useRef<(() => void) | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const maxRetries = 3;
  const baseRetryDelay = 1000; // 1 second

  const retryConnection = useCallback(() => {
    if (retryCount < maxRetries && db && firebaseStatus === 'ready') {
      setRetryCount(prev => prev + 1);
      setError(null);
      setIsLoading(true);

      // Exponential backoff: 1s, 2s, 4s
      const delay = baseRetryDelay * Math.pow(2, retryCount);

      retryTimeoutRef.current = setTimeout(() => {
        console.log(`Retrying Firebase connection (attempt ${retryCount + 1}/${maxRetries})`);

        // Force reconnection by disabling and re-enabling network
        disableNetwork(db).then(() => {
          return enableNetwork(db);
        }).then(() => {
          setIsConnected(true);
          setIsLoading(false);
        }).catch((err) => {
          console.error('Error reconnecting to Firebase:', err);
          setError(err);
          setIsConnected(false);
          setIsLoading(false);
        });
      }, delay);
    } else {
      setIsLoading(false);
      if (retryCount >= maxRetries) {
        setError(new Error(`Failed to connect after ${maxRetries} attempts. Please check your internet connection.`));
      }
    }
  }, [db, firebaseStatus, retryCount, maxRetries, baseRetryDelay]);

  const resetRetryCount = useCallback(() => {
    setRetryCount(0);
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    // Cleanup function
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (firebaseStatus !== 'ready' || !db) {
      if (messages.length > 0) setMessages([]);
      setIsConnected(false);
      setIsLoading(false);
      resetRetryCount();
      return;
    }

    setError(null);
    setIsLoading(true);
    resetRetryCount();

    const messagesRef = collection(db, "messages");
    const q = query(messagesRef, orderBy("timestamp", "asc"));

    const unsubscribe = onSnapshot(q,
      (snapshot) => {
        try {
          const newMessages = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Message[];

          setMessages(newMessages);
          setError(null);
          setIsConnected(true);
          setIsLoading(false);
          resetRetryCount(); // Reset retry count on successful connection
        } catch (err) {
          console.error("Error processing message snapshot:", err);
          setError(err as Error);
          setIsLoading(false);
        }
      },
      (err) => {
        console.error("Firestore listener error:", err);
        setError(err);
        setIsConnected(false);
        setIsLoading(false);

        // Check if it's a network-related error
        if (err.code === 'unavailable' || err.code === 'unauthenticated' || err.message.includes('transport errored')) {
          console.log('Network connection issue detected, attempting to retry...');
          retryConnection();
        } else {
          // For other errors, don't retry automatically
          setMessages([]);
        }
      }
    );

    unsubscribeRef.current = unsubscribe;

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [db, firebaseStatus, retryConnection, resetRetryCount]);

  // Manual retry function for UI
  const manualRetry = useCallback(() => {
    setRetryCount(0);
    retryConnection();
  }, [retryConnection]);

  return {
    messages,
    error,
    isConnected,
    isLoading,
    retryConnection: manualRetry
  };
};
