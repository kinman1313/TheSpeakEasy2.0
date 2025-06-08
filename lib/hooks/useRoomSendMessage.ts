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
    ) => Promise<void>;
    isSending: boolean;
    error: Error | null;
}

export const useRoomSendMessage = (
    db: Firestore | undefined,
    firebaseStatus: 'initializing' | 'ready' | 'error',
    roomId: string | null, // null for lobby, room ID for rooms, DM ID for direct messages
    roomType: 'lobby' | 'room' | 'dm' = 'lobby'
): UseRoomSendMessageReturn => {
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

        // If it's a voice or GIF message, text can be empty. Otherwise, text is required.
        if (!options?.voiceMessageUrl && !options?.gifUrl && !text.trim()) {
            console.warn("Attempted to send an empty message without voice or GIF content.");
            return;
        }
        if (!user) {
            setError(new Error("User not authenticated."));
            return;
        }

        // For room and DM messages, roomId is required
        if ((roomType === 'room' || roomType === 'dm') && !roomId) {
            setError(new Error("Room ID is required for room and direct messages."));
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
            gifUrl?: string;
            roomId?: string | null;
            dmId?: string | null;
        } = {
            text: text,
            userId: user.uid,
            userName: user.displayName || "Anonymous",
            userPhotoURL: user.photoURL,
            timestamp: serverTimestamp(),
        };

        // Set appropriate room/DM identifiers
        if (roomType === 'room') {
            messageData.roomId = roomId;
            messageData.dmId = null;
        } else if (roomType === 'dm') {
            messageData.roomId = null;
            messageData.dmId = roomId;
        }
        // For lobby, don't set roomId or dmId fields to maintain backward compatibility

        if (options?.voiceMessageUrl) {
            messageData.voiceMessageUrl = options.voiceMessageUrl;
        }
        if (options?.voiceMessageDuration !== undefined) {
            messageData.voiceMessageDuration = options.voiceMessageDuration;
        }
        if (options?.gifUrl) {
            messageData.gifUrl = options.gifUrl;
        }

        try {
            // Send message to global messages collection with appropriate metadata
            await addDoc(collection(db, "messages"), messageData);

            // For room messages, also update the room's updatedAt timestamp via API
            if (roomType === 'room' && roomId) {
                try {
                    const token = await user.getIdToken();
                    await fetch(`/api/rooms/${roomId}/messages`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            text: text,
                            attachments: [],
                        })
                    });
                } catch (apiError) {
                    console.warn('Failed to update room timestamp via API:', apiError);
                    // Don't fail the message send if room update fails
                }
            }

            // For DM messages, update the DM's updatedAt timestamp
            if (roomType === 'dm' && roomId && db) {
                try {
                    const { doc, updateDoc } = await import('firebase/firestore');
                    const dmRef = doc(db, "directMessages", roomId);
                    await updateDoc(dmRef, {
                        updatedAt: serverTimestamp(),
                    });
                } catch (dmUpdateError) {
                    console.warn('Failed to update DM timestamp:', dmUpdateError);
                    // Don't fail the message send if DM update fails
                }
            }

        } catch (err: any) {
            console.error("Error sending message:", err);
            setError(err);
        } finally {
            setIsSending(false);
        }
    };

    return { sendMessage, isSending, error };
}; 