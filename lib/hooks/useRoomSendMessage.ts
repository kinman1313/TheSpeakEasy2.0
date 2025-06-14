import { useState } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';

export type User = FirebaseUser;

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
        user: FirebaseUser,
        options: SendMessageOptions
    ) => Promise<string | null>;
    error: Error | null;
    isSending: boolean;
}

export function useRoomSendMessage(
    _db: any, // Not used in API-based approach, prefixed with underscore to indicate intentionally unused
    _firebaseStatus: "initializing" | "ready" | "error", // Not used in API-based approach
    roomId: string | null,
    roomType: 'lobby' | 'room' | 'dm'
): UseRoomSendMessageReturn {
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const sendMessage = async (
        text: string,
        user: FirebaseUser,
        options: SendMessageOptions = {}
    ): Promise<string | null> => {
        if (isSending) {
            console.warn('Message send already in progress');
            return null;
        }

        setIsSending(true);
        setError(null);

        try {
            if (!user?.uid) {
                throw new Error("User not authenticated");
            }

            if (!text?.trim() && !options.fileUrl && !options.imageUrl && !options.voiceMessageUrl && !options.gifUrl) {
                throw new Error("Message content is required");
            }

            const token = await user.getIdToken();

            // Determine API endpoint based on room type
            let apiUrl: string;
            if (roomType === 'lobby') {
                apiUrl = '/api/messages';
            } else if (roomType === 'dm' && roomId) {
                apiUrl = `/api/direct-messages/${roomId}/messages`;
            } else if (roomType === 'room' && roomId) {
                apiUrl = `/api/rooms/${roomId}/messages`;
            } else {
                throw new Error("Invalid room configuration");
            }

            // Prepare request body
            const requestBody: any = {
                text: text?.trim() || "",
                roomId: roomType === 'room' ? roomId : undefined,
                dmId: roomType === 'dm' ? roomId : undefined,
                status: 'sending' // Set initial status
            };

            // Add optional fields
            if (options.fileUrl) {
                requestBody.fileUrl = options.fileUrl;
                requestBody.fileName = options.fileName;
                requestBody.fileSize = options.fileSize;
                requestBody.fileType = options.fileType;
            }

            if (options.imageUrl) {
                requestBody.imageUrl = options.imageUrl;
            }

            if (options.voiceMessageUrl) {
                requestBody.voiceMessageUrl = options.voiceMessageUrl;
                requestBody.voiceMessageDuration = options.voiceMessageDuration;
            }

            if (options.gifUrl) {
                requestBody.gifUrl = options.gifUrl;
            }

            if (options.replyToId) {
                requestBody.replyToId = options.replyToId;
            }

            if (options.threadId) {
                requestBody.threadId = options.threadId;
            }

            if (options.attachments) {
                requestBody.attachments = options.attachments;
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

                // Handle specific error cases
                if (response.status === 401) {
                    throw new Error("Authentication failed. Please log in again.");
                } else if (response.status === 403) {
                    throw new Error("Permission denied. You don't have access to this resource.");
                } else if (response.status === 429) {
                    throw new Error("Rate limit exceeded. Please wait a moment before sending another message.");
                } else {
                    throw new Error(errorData.error || `HTTP ${response.status}: Failed to send message`);
                }
            }

            const result = await response.json();
            console.log('Message sent successfully:', result.id);

            // Update message status to 'sent' after successful API call
            if (result.id) {
                // The message status will be updated via Firestore listener
                // No need to manually update here as the real-time listener will handle it
            }

            return result.id;
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Failed to send message');
            console.error('Send message error:', error);
            setError(error);
            throw error;
        } finally {
            setIsSending(false);
        }
    };

    return { sendMessage, error, isSending };
} 