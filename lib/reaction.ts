import { doc, updateDoc, arrayUnion, increment } from 'firebase/firestore';

export interface Reaction {
  emoji: string;
  users: string[];
  count: number;
}
/**
 * Adds a reaction to a message in the database.
 * @param db - The Firestore database instance.
 * @param messageId - The ID of the message to react to.
 * @param emoji - The emoji representing the reaction.
 * @param userId - The ID of the user adding the reaction.
 * @returns A promise that resolves when the reaction is added.
 */
export const addReaction = async (
  db: any,
  messageId: string,
  emoji: string,
  userId: string
) => {
  // Implementation for adding reactions
  const messageRef = doc(db, 'messages', messageId);
  await updateDoc(messageRef, {
    [`reactions.${emoji}.users`]: arrayUnion(userId),
    [`reactions.${emoji}.count`]: increment(1)
  });
};
