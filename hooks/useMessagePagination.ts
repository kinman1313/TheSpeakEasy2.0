import { useState, useEffect, useCallback } from 'react';
import { collection, query, orderBy, limit, startAfter, getDocs } from 'firebase/firestore';

export const useMessagePagination = (db: any, roomId: string) => {
  const [messages, setMessages] = useState([]);
  const [lastDoc, setLastDoc] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);

    try {
      const messagesRef = collection(db, 'messages');
      const q = lastDoc 
        ? query(messagesRef, orderBy('createdAt', 'desc'), startAfter(lastDoc), limit(20))
        : query(messagesRef, orderBy('createdAt', 'desc'), limit(20));

      const snapshot = await getDocs(q);
      const newMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setMessages(prev => [...prev, ...newMessages]);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === 20);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  }, [db, roomId, lastDoc, loading, hasMore]);

  return { messages, loadMore, loading, hasMore };
};