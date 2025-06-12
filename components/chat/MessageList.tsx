"use client"

import { useState, useEffect, useRef, useContext } from 'react'
import { Message } from './Message'
import { ThreadView } from './ThreadView'
import { TypingIndicator } from './TypingIndicator'
import { type Message as MessageType } from '@/lib/types'
import { ThreadNotificationService } from '@/lib/threadNotifications'
import { AuthContext } from '@/components/auth/AuthContext'
import { MessageExpirationService } from '@/lib/messageExpiration'

interface MessageListProps {
    messages: MessageType[]
    onReply: (message: MessageType) => void
    onDelete: (messageId: string) => void
    onExpire: (messageId: string, duration: number) => void
    onSendMessage: (content: string, threadId?: string) => void
    roomId: string
    onEdit: (messageId: string, newText: string) => void
    onReaction: (messageId: string, emoji: string) => void
}

export function MessageList({
    messages,
    onReply,
    onDelete,
    onExpire,
    onSendMessage,
    roomId,
    onEdit,
    onReaction
}: MessageListProps): JSX.Element | null {
    const [selectedThread, setSelectedThread] = useState<MessageType | null>(null)
    const { user } = useContext(AuthContext)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (selectedThread && user) {
            const unsubscribe = ThreadNotificationService.listenToThreadMessages(
                selectedThread.threadId!,
                (message) => {
                    // Handle new thread message
                    if (message.uid !== user.uid) {
                        // Show notification or update UI
                    }
                }
            )

            return () => {
                unsubscribe()
            }
        }
        // Explicitly return undefined when condition is not met
        return undefined
    }, [selectedThread, user])

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    useEffect(() => {
        if (messages.length > 0) {
            MessageExpirationService.initializeExpirationTimers()
        }

        // Cleanup on unmount
        return () => {
            MessageExpirationService.cleanup()
        }
    }, [messages.length])

    const handleThreadClick = (message: MessageType) => {
        setSelectedThread(message)
    }

    const handleBackToChat = () => {
        setSelectedThread(null)
    }

    if (selectedThread && user) {
        return (
            <ThreadView
                threadId={selectedThread.threadId!}
                parentMessage={selectedThread}
                messages={messages.filter(m => m.threadId === selectedThread.threadId)}
                currentUser={{
                    uid: user.uid,
                    displayName: user.displayName,
                    photoURL: user.photoURL
                }}
                onClose={handleBackToChat}
                onSendMessage={(content) => onSendMessage(content, selectedThread.threadId)}
                onDeleteMessage={onDelete}
                onReply={onReply}
                onExpire={onExpire}
                onThreadClick={handleThreadClick}
            />
        )
    }

    if (!user) {
        return null
    }

    return (
        <div
            className="flex-1 overflow-y-auto p-4 space-y-4 prevent-screenshot"
            onContextMenu={e => e.preventDefault()}
            onCopy={e => e.preventDefault()}
        >
            {messages.map((message) => (
                <Message
                    key={message.id}
                    message={message}
                    onReply={onReply}
                    onDelete={onDelete}
                    onExpire={onExpire}
                    onThreadClick={handleThreadClick}
                    isCurrentUser={message.uid === user.uid}
                    onEdit={onEdit}
                    onReaction={onReaction}
                />
            ))}
            <TypingIndicator
                roomId={roomId}
                currentUserId={user.uid}
            />
            <div ref={messagesEndRef} />
        </div>
    )
} 