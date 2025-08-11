import { useState, useEffect, useCallback } from 'react';
import {
  Firestore,
  collection,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
  where,
  DocumentData,
  QueryDocumentSnapshot
} from 'firebase/firestore';

interface MessageData extends DocumentData {
  id: string;
  createdAt?: unknown; // Firestore Timestamp | Date | number (kept broad if not normalized yet)
  roomId?: string;
}

const PAGE_SIZE = 20;

export const useMessagePagination = (db: Firestore, roomId: string) => {
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore || !roomId) return;
    setLoading(true);
    try {
      const messagesRef = collection(db, 'messages');
      const baseQueryConstraints = [
        where('roomId', '==', roomId),
        orderBy('createdAt', 'desc'),
        limit(PAGE_SIZE)
      ] as const;

      const q = lastDoc
        ? query(messagesRef, ...baseQueryConstraints, startAfter(lastDoc))
        : query(messagesRef, ...baseQueryConstraints);

      const snapshot = await getDocs(q);
      const newMessages: MessageData[] = snapshot.docs.map(d => ({
        id: d.id,
        ...(d.data() as DocumentData)
      }));

      setMessages(prev => [...prev, ...newMessages]);
      setLastDoc(snapshot.docs.length ? snapshot.docs[snapshot.docs.length - 1] : null);
      setHasMore(snapshot.docs.length === PAGE_SIZE);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  }, [roomId, lastDoc, loading, hasMore, db]);

  // Reset when roomId changes
  useEffect(() => {
    setMessages([]);
    setLastDoc(null);
    setHasMore(true);
  }, [roomId]);

  return { messages, loadMore, loading, hasMore };
};