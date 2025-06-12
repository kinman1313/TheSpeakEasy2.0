import { useState } from 'react';
import { User as FirebaseAuthUser } from 'firebase/auth';

export type User = FirebaseAuthUser;

interface SendMessageOptions {
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
    fileType?: string;
    imageUrl?: string;
    voiceMessageUrl?: string;
    voiceMessageDuration?: number;
    gifUrl?: string;
    replyToId?: string;
    expirationTimer?: string;
    threadId?: string;
    attachments?: any[];
    [key: string]: any;
}

interface UseRoomSendMessageReturn {
    sendMessage: (
        text: string,
        user: User,
        options?: SendMessageOptions
    ) => Promise<string>;
    error: Error | null;
    isSending: boolean;
}

export function useRoomSendMessage(
    db: any, // Not used in API-based approach
    firebaseStatus: "initializing" | "ready" | "error",
    roomId: string | null,
    roomType: 'lobby' | 'room' | 'dm'
): UseRoomSendMessageReturn {
    const [error, setError] = useState<Error | null>(null);
    const [isSending, setIsSending] = useState(false);

    const sendMessage = async (
        text: string,
        user: User,
        options?: SendMessageOptions
    ): Promise<string> => {
        if (firebaseStatus !== "ready") {
            throw new Error("Firebase is not ready");
        }

        setIsSending(true);
        setError(null);

        try {
            const token = await user.getIdToken();

            // Determine the correct API endpoint
            let apiUrl: string;
            let requestBody: any = {
                text: text.trim(),
                attachments: options?.attachments || []
            };

            if (roomType === 'lobby') {
                apiUrl = '/api/messages';
                requestBody.roomId = 'lobby'; // Special case for lobby
            } else if (roomType === 'dm') {
                apiUrl = `/api/direct-messages/${roomId}/messages`;
                // DM messages don't need roomId in body
            } else {
                apiUrl = `/api/rooms/${roomId}/messages`;
                requestBody.roomId = roomId;
            }

            // Add file attachments if present
            if (options?.fileUrl) {
                requestBody.attachments.push({
                    type: 'file',
                    url: options.fileUrl,
                    fileName: options.fileName,
                    fileSize: options.fileSize,
                    fileType: options.fileType
                });
            }

            if (options?.imageUrl) {
                requestBody.attachments.push({
                    type: 'image',
                    url: options.imageUrl
                });
            }

            if (options?.voiceMessageUrl) {
                requestBody.attachments.push({
                    type: 'voice',
                    url: options.voiceMessageUrl,
                    duration: options.voiceMessageDuration
                });
            }

            if (options?.gifUrl) {
                requestBody.attachments.push({
                    type: 'gif',
                    url: options.gifUrl
                });
            }

            // Add reply context
            if (options?.replyToId) {
                requestBody.replyToId = options.replyToId;
            }

            // Add expiration timer
            if (options?.expirationTimer && options.expirationTimer !== 'never') {
                requestBody.expirationTimer = options.expirationTimer;
            }

            console.log('Sending message to:', apiUrl, requestBody);

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}: Failed to send message`);
            }

            const result = await response.json();
            return result.id;
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Failed to send message');
            setError(error);
            throw error;
        } finally {
            setIsSending(false);
        }
    };

    return { sendMessage, error, isSending };
} 