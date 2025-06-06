import { useState } from 'react';
import { Firestore, doc, runTransaction } from 'firebase/firestore'; // Removed unused FieldValue import

interface UseToggleReactionReturn {
  toggleReaction: (messageId: string, emoji: string, userId: string) => Promise<void>;
  isUpdating: boolean;
  error: Error | null;
}

export const useToggleReaction = (
  db: Firestore | undefined,
  firebaseStatus: 'initializing' | 'ready' | 'error'
): UseToggleReactionReturn => {
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const toggleReaction = async (messageId: string, emoji: string, userId: string): Promise<void> => {
    if (firebaseStatus !== 'ready' || !db) {
      const err = new Error("Firebase is not ready or database is unavailable.");
      console.error("Error toggling reaction:", err);
      setError(err);
      return;
    }

    if (!messageId || !emoji || !userId) {
      const err = new Error("Message ID, emoji, and User ID are required to toggle reaction.");
      console.error(err.message);
      setError(err);
      return;
    }

    setIsUpdating(true);
    setError(null);

    const messageRef = doc(db, "messages", messageId);

    try {
      await runTransaction(db, async (transaction) => {
        const messageDoc = await transaction.get(messageRef);
        if (!messageDoc.exists()) {
          throw new Error("Message document does not exist!");
        }

        const data = messageDoc.data();
        // Ensure reactions is treated as an object, even if undefined in data
        const currentReactions = data.reactions || {};

        const usersForEmoji = currentReactions[emoji] || [];
        const userIndex = usersForEmoji.indexOf(userId);

        if (userIndex !== -1) {
          // User has reacted, remove reaction
          usersForEmoji.splice(userIndex, 1);
          if (usersForEmoji.length === 0) {
            delete currentReactions[emoji]; // Remove emoji if no users left
          } else {
            currentReactions[emoji] = usersForEmoji;
          }
        } else {
          // User has not reacted, add reaction
          currentReactions[emoji] = [...usersForEmoji, userId];
        }

        // Update the document with the new reactions map
        transaction.set(messageRef, { reactions: currentReactions }, { merge: true });
      });
    } catch (err: any) {
      console.error("Error toggling reaction:", err);
      setError(err);
      // Optionally re-throw or handle more specifically
    } finally {
      setIsUpdating(false);
    }
  };

  return { toggleReaction, isUpdating, error };
};
