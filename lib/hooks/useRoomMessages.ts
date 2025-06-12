import { useState, useEffect, useRef, useCallback } from 'react';
import { Firestore, collection, query, orderBy, onSnapshot, enableNetwork, disableNetwork, where } from 'firebase/firestore';
import { getMessages as getCachedMessages, saveMessages as saveCachedMessages } from '../messageCache';
import { Message as AppMessage } from '../types';

interface UseRoomMessagesReturn {
    messages: AppMessage[];
    error: Error | null;
    isConnected: boolean;
    isLoading: boolean;
    retryConnection: () => void;
}

export const useRoomMessages = (
    db: Firestore | undefined,
    firebaseStatus: 'initializing' | 'ready' | 'error',
    roomId: string | null, // null for lobby, room ID for rooms, DM ID for direct messages
    roomType: 'lobby' | 'room' | 'dm' = 'lobby'
): UseRoomMessagesReturn => {
    const [messages, setMessages] = useState<AppMessage[]>([]);
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

    // Load cached messages on mount/room change
    useEffect(() => {
        if (roomId) {
            const cached = getCachedMessages(roomId);
            if (cached && cached.length > 0) {
                setMessages(cached);
            }
        }
    }, [roomId]);

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

        let q;

        if (roomType === 'lobby') {
            const messagesRef = collection(db, "messages");
            // For lobby messages: query all messages and filter client-side
            // This is because Firestore doesn't handle null queries well
            q = query(
                messagesRef,
                orderBy("createdAt", "asc")
            );
        } else if (roomType === 'room' && roomId) {
            const messagesRef = collection(db, "messages");
            q = query(
                messagesRef,
                where("roomId", "==", roomId),
                orderBy("createdAt", "asc")
            );
        } else if (roomType === 'dm' && roomId) {
            const messagesRef = collection(db, "messages");
            q = query(
                messagesRef,
                where("dmId", "==", roomId),
                orderBy("createdAt", "asc")
            );
        } else {
            setMessages([]);
            setIsLoading(false);
            return;
        }

        const unsubscribe = onSnapshot(q,
            (snapshot) => {
                try {
                    let newMessages = snapshot.docs.map((doc) => {
                        const data = doc.data();
                        // Map Firestore data to AppMessage type
                        return {
                            id: doc.id,
                            text: data.text || '',
                            imageUrl: data.imageUrl,
                            gifUrl: data.gifUrl,
                            audioUrl: data.audioUrl,
                            voiceMessageUrl: data.voiceMessageUrl,
                            fileUrl: data.fileUrl,
                            fileName: data.fileName,
                            fileSize: data.fileSize,
                            fileType: data.fileType,
                            replyToId: data.replyToId,
                            replyToMessage: data.replyToMessage,
                            threadId: data.threadId,
                            uid: data.uid || data.senderId,
                            userId: data.uid || data.senderId,
                            userName: data.userName,
                            displayName: data.displayName,
                            photoURL: data.photoURL || data.userPhotoURL,
                            createdAt: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt)) : new Date(),
                            updatedAt: data.updatedAt ? (data.updatedAt.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt)) : new Date(),
                            status: data.status || 'sent',
                            readBy: data.readBy || [],
                            isEdited: data.isEdited,
                            reactions: data.reactions,
                            expiresAt: data.expiresAt ? (data.expiresAt.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt)) : null,
                            expirationTimer: data.expirationTimer,
                            attachments: data.attachments || [],
                            roomId: data.roomId,
                            dmId: data.dmId
                        } as AppMessage;
                    });

                    if (roomType === 'lobby') {
                        newMessages = newMessages.filter(message =>
                            !message.roomId && !message.dmId
                        );
                    }

                    setMessages(newMessages);
                    if (roomId) {
                        saveCachedMessages(roomId, newMessages);
                    }
                    setError(null);
                    setIsConnected(true);
                    setIsLoading(false);
                    resetRetryCount();
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

                if (err.code === 'unavailable' || err.code === 'unauthenticated' || err.message.includes('transport errored')) {
                    console.log('Network connection issue detected, attempting to retry...');
                    retryConnection();
                } else {
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
    }, [db, firebaseStatus, roomId, roomType, retryConnection, resetRetryCount]);

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