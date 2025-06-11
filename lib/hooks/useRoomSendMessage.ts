import { useState } from 'react';
import { Firestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { User as FirebaseAuthUser } from 'firebase/auth';

export type User = FirebaseAuthUser;

interface SendMessageOptions {
    voiceMessageUrl?: string;
    voiceMessageDuration?: number;
    gifUrl?: string;
}

interface UseRoomSendMessageReturn {
    sendMessage: (
        text: string,
        user: User,
        options?: SendMessageOptions
    ) => Promise<string>;
    error: Error | null;
}

export function useRoomSendMessage(
    db: Firestore,
    firebaseStatus: "initializing" | "ready" | "error",
    roomId: string | null,
    roomType: 'lobby' | 'room' | 'dm'
): UseRoomSendMessageReturn {
    const [error, setError] = useState<Error | null>(null);

    const sendMessage = async (
        text: string,
        user: User,
        options?: SendMessageOptions
    ): Promise<string> => {
        if (firebaseStatus !== "ready") {
            throw new Error("Firebase is not ready");
        }

        try {
            let messageRef;
            if (roomType === 'lobby') {
                messageRef = collection(db, 'messages');
            } else if (roomType === 'dm') {
                messageRef = collection(db, `direct-messages/${roomId}/messages`);
            } else {
                messageRef = collection(db, `rooms/${roomId}/messages`);
            }

            const messageData = {
                text,
                uid: user.uid,
                userName: user.displayName || user.email || 'Anonymous',
                createdAt: serverTimestamp(),
                ...options
            };

            const docRef = await addDoc(messageRef, messageData);
            return docRef.id;
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Failed to send message');
            setError(error);
            throw error;
        }
    };

    return { sendMessage, error };
} 