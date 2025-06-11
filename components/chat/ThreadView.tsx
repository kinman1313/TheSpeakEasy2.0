"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, MessageSquare, Bell, BellOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Message } from "@/components/chat/Message"
import { MessageInput } from "@/components/MessageInput"
import { type Message as MessageType } from "@/lib/types"
import { cn } from "@/lib/utils"

interface ThreadViewProps {
    threadId: string
    parentMessage: MessageType
    messages: MessageType[]
    currentUser: {
        uid: string
        displayName: string | null
        photoURL: string | null
    }
    onClose: () => void
    onSendMessage: (text: string, options?: any) => void
    onEditMessage?: (messageId: string, newText: string) => void
    onDeleteMessage?: (messageId: string) => void
    onReply?: (message: MessageType) => void
    onReaction?: (messageId: string, emoji: string) => void
    onExpire: (messageId: string, duration: number) => void
    onThreadClick: (message: MessageType) => void
    className?: string
}

export function ThreadView({
    threadId,
    parentMessage,
    messages,
    currentUser,
    onClose,
    onSendMessage,
    onEditMessage,
    onDeleteMessage,
    onReply,
    onReaction,
    onExpire,
    onThreadClick,
    className
}: ThreadViewProps) {
    const [isSubscribed, setIsSubscribed] = useState(false)

    // Subscribe to thread notifications
    useEffect(() => {
        // TODO: Implement thread notification subscription
        return () => {
            // Cleanup subscription
        }
    }, [threadId])

    const toggleSubscription = () => {
        setIsSubscribed(!isSubscribed)
        // TODO: Update subscription in database
    }

    return (
        <div className={cn(
            "flex flex-col h-full bg-background border-l",
            className
        )}>
            {/* Thread Header */}
            <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="h-8 w-8 tap-feedback"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Thread</span>
                    </div>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleSubscription}
                    className="h-8 w-8 tap-feedback"
                >
                    {isSubscribed ? (
                        <Bell className="h-4 w-4 text-primary" />
                    ) : (
                        <BellOff className="h-4 w-4 text-muted-foreground" />
                    )}
                </Button>
            </div>

            {/* Parent Message */}
            <div className="p-4 border-b bg-muted/50">
                <Message
                    message={parentMessage}
                    isCurrentUser={parentMessage.uid === currentUser.uid}
                    onEdit={onEditMessage}
                    onDelete={onDeleteMessage}
                    onExpire={onExpire}
                    onThreadClick={onThreadClick}
                    onReply={onReply}
                    onReaction={onReaction}
                    className="!p-0"
                />
            </div>

            {/* Thread Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                    <Message
                        key={message.id}
                        message={message}
                        isCurrentUser={message.uid === currentUser.uid}
                        onEdit={onEditMessage}
                        onDelete={onDeleteMessage}
                        onReply={onReply}
                        onReaction={onReaction}
                        onExpire={onExpire}
                        onThreadClick={onThreadClick}
                    />
                ))}
            </div>

            {/* Thread Input */}
            <div className="p-4 border-t">
                <MessageInput
                    onSend={onSendMessage}
                    currentUserId={currentUser.uid}
                    currentUserName={currentUser.displayName || ""}
                    roomId={threadId}
                    replyToMessage={parentMessage}
                    onCancelReply={onClose}
                />
            </div>
        </div>
    )
} 