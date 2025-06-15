"use client"

import { useState, useRef, useEffect, useContext } from "react"
import Image from "next/image"
import { formatDistanceToNow } from "date-fns"
import { Edit, Trash2, Reply, Download, ExternalLink, Clock, MessageSquare, Bell, BellOff, Check, CheckCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AudioPlayer } from "@/components/chat/AudioPlayer"
import { formatFileSize, getFileIcon } from "@/lib/storage"
import { MessageExpirationService } from "@/lib/messageExpiration"
import { type Message as MessageType, type MessageStatus } from "@/lib/types"
import { cn } from "@/lib/utils"
import { MessageStatus as MessageStatusComponent } from "@/components/chat/MessageStatus"
import { MESSAGE_EXPIRATION_OPTIONS } from "@/lib/types"
import { AuthContext } from '@/components/auth/AuthContext'
import { ThreadNotificationService } from '@/lib/threadNotifications'
import { toast } from 'react-hot-toast'
import { MessageReactions } from "@/components/chat/MessageReactions"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface MessageProps {
    message: MessageType
    isCurrentUser: boolean
    onEdit?: (messageId: string, newText: string) => void
    onDelete?: (messageId: string) => void
    onReply?: (message: MessageType) => void
    onReaction?: (messageId: string, emoji: string) => void
    onExpire: (messageId: string, duration: number) => void
    onThreadClick: (message: MessageType) => void
    isThreadView?: boolean
    className?: string
}

const MessageStatus = ({ status }: { status: MessageStatus }) => {
    switch (status) {
        case 'sending':
            return <span className="text-xs text-muted-foreground">Sending...</span>
        case 'sent':
            return <Check className="h-3 w-3 text-muted-foreground" />
        case 'delivered':
            return <CheckCheck className="h-3 w-3 text-muted-foreground" />
        case 'read':
            return <CheckCheck className="h-3 w-3 text-blue-500" />
        default:
            return null
    }
}

export function Message({
    message,
    isCurrentUser,
    onEdit,
    onDelete,
    onReply,
    onReaction,
    onExpire,
    onThreadClick,
    isThreadView = false,
    className
}: MessageProps) {
    const { user } = useContext(AuthContext)
    const [isEditing, setIsEditing] = useState(false)
    const [editText, setEditText] = useState(message.text)
    const [expirationInfo, setExpirationInfo] = useState<string>('')
    const editInputRef = useRef<HTMLInputElement>(null)
    const [isSubscribed, setIsSubscribed] = useState(false)
    const [showActions, setShowActions] = useState(false)
    const [isMobile, setIsMobile] = useState(false)

    // Detect mobile device
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768)
        }
        
        checkMobile()
        window.addEventListener('resize', checkMobile)
        
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    // Update expiration info
    useEffect(() => {
        if (message.expiresAt) {
            const updateExpirationInfo = () => {
                let expirationDate: Date;
                if (message.expiresAt instanceof Date) {
                    expirationDate = message.expiresAt;
                } else if (typeof message.expiresAt === 'string') {
                    expirationDate = new Date(message.expiresAt);
                } else {
                    return; // Skip if not a valid date
                }

                const info = MessageExpirationService.getExpirationInfo(
                    expirationDate,
                    message.expirationTimer || 'never'
                )
                setExpirationInfo(info)
            }

            updateExpirationInfo()
            const interval = setInterval(updateExpirationInfo, 60000) // Update every minute

            return () => clearInterval(interval)
        }

        // No cleanup needed if no expiration
        return undefined
    }, [message.expiresAt, message.expirationTimer])

    // Focus edit input when editing starts
    useEffect(() => {
        if (isEditing && editInputRef.current) {
            editInputRef.current.focus()
        }
    }, [isEditing])

    useEffect(() => {
        if (user && message.threadId) {
            ThreadNotificationService.getThreadSubscriptionStatus(message.threadId, user.uid)
                .then(setIsSubscribed)
                .catch(console.error)
        }
    }, [user, message.threadId])

    const handleEdit = () => {
        if (onEdit && editText.trim() !== message.text) {
            onEdit(message.id, editText.trim())
        }
        setIsEditing(false)
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleEdit()
        } else if (e.key === 'Escape') {
            setEditText(message.text)
            setIsEditing(false)
        }
    }

    const handleFileDownload = (url: string, fileName: string) => {
        const link = document.createElement('a')
        link.href = url
        link.download = fileName
        link.target = '_blank'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    const handleSubscribeToggle = async () => {
        if (!user || !message.threadId) return

        try {
            if (isSubscribed) {
                await ThreadNotificationService.unsubscribeFromThread(message.threadId, user.uid)
                toast.success('Unsubscribed from thread notifications')
            } else {
                await ThreadNotificationService.subscribeToThread(message.threadId, user.uid)
                toast.success('Subscribed to thread notifications')
            }
            setIsSubscribed(!isSubscribed)
        } catch (error) {
            console.error('Error toggling thread subscription:', error)
            toast.error('Failed to update thread subscription')
        }
    }

    const handleExpire = (duration: number) => {
        onExpire(message.id, duration)
        toast.success(`Message will expire in ${duration} minutes`)
    }

    const handleReaction = (messageId: string, emoji: string) => {
        if (!user) return;
        onReaction && onReaction(messageId, emoji);
    };

    const renderFileAttachment = () => {
        if (!message.fileUrl) return null

        const isImage = message.fileType?.startsWith('image/')
        const isVideo = message.fileType?.startsWith('video/')
        const isAudio = message.fileType?.startsWith('audio/')

        if (isImage) {
            return (
                <div className="mt-2 max-w-sm">
                    <Image
                        src={message.fileUrl}
                        alt={message.fileName || 'Shared image'}
                        width={300}
                        height={200}
                        className="rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => window.open(message.fileUrl, '_blank')}
                    />
                </div>
            )
        }

        if (isVideo) {
            return (
                <div className="mt-2 max-w-sm">
                    <video
                        controls
                        className="rounded-lg max-w-full"
                        preload="metadata"
                    >
                        <source src={message.fileUrl} type={message.fileType} />
                        Your browser does not support the video tag.
                    </video>
                </div>
            )
        }

        if (isAudio) {
            return (
                <div className="mt-2">
                    <AudioPlayer src={message.fileUrl} mp3Url={message.mp3Url} />
                </div>
            )
        }

        // Generic file attachment
        return (
            <div className="mt-2 p-3 bg-muted rounded-lg border max-w-sm">
                <div className="flex items-center gap-3">
                    <span className="text-2xl">{getFileIcon(message.fileType || '')}</span>
                    <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                            {message.fileName || 'Unknown file'}
                        </p>
                        {message.fileSize && (
                            <p className="text-xs text-muted-foreground">
                                {formatFileSize(message.fileSize)}
                            </p>
                        )}
                    </div>
                    <div className="flex gap-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(message.fileUrl, '_blank')}
                            title="Open file"
                        >
                            <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleFileDownload(message.fileUrl!, message.fileName || 'file')}
                            title="Download file"
                        >
                            <Download className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    const renderReplyTo = () => {
        if (!message.replyToMessage) return null

        return (
            <div className="mb-2 p-2 bg-muted/50 rounded border-l-2 border-primary/50">
                <div className="flex items-center gap-2 mb-1">
                    <Reply className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">
                        {message.replyToMessage.userName}
                    </span>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                    {message.replyToMessage.text || '📎 Attachment'}
                </p>
            </div>
        )
    }

    const renderMessageStatus = () => {
        if (!isCurrentUser) return null

        return (
            <div className="flex items-center gap-1 mt-1">
                <MessageStatusComponent status={message.status || 'sent'} />
                {message.readBy.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                        Read by {message.readBy.length}
                    </span>
                )}
            </div>
        )
    }

    return (
        <div
            data-message-id={message.id}
            className={cn(
                `relative group p-4 rounded-lg tap-feedback message-bubble backdrop-blur-sm message-snap message-spacing message-transition`,
                isCurrentUser
                    ? 'bg-blue-100 dark:bg-blue-900 ml-auto bg-opacity-70 dark:bg-opacity-60'
                    : 'bg-gray-100 dark:bg-gray-800 bg-opacity-70 dark:bg-opacity-60',
                'mb-4',
                className
            )}
            style={{
                maxWidth: '60%',
                minWidth: 'fit-content',
                width: message.text && message.text.length < 30 ? 'fit-content' : undefined,
                scrollSnapAlign: 'start',
                scrollMargin: '1rem',
            }}
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => setShowActions(false)}
        >
            {/* Message Header */}
            <div className="flex items-center justify-between mb-2 tap-feedback">
                <div className="flex items-center space-x-2 tap-feedback">
                    <span className="font-semibold">{message.userName}</span>
                    <span className="text-sm text-gray-500">
                        {formatDistanceToNow(
                            message.createdAt instanceof Date
                                ? message.createdAt
                                : new Date(message.createdAt),
                            { addSuffix: true }
                        )}
                    </span>
                </div>
                <MessageStatus status={message.status} />
            </div>

            {/* Message Content */}
            <div className={cn("flex-1 min-w-0", isCurrentUser && "text-right")}>
                {/* Reply indicator */}
                {renderReplyTo()}

                {/* Message Text */}
                {isEditing ? (
                    <input
                        ref={editInputRef}
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onKeyDown={handleKeyPress}
                        onBlur={handleEdit}
                        className="w-full px-2 py-1 text-sm bg-background border rounded"
                        placeholder="Edit message..."
                        aria-label="Edit message"
                    />
                ) : (
                    message.text && (
                        <p
                            className={cn(
                                "text-base break-words",
                                isCurrentUser && "text-right"
                            )}
                            style={{ color: message.chatColor || '#fff' }}
                        >
                            {message.text}
                        </p>
                    )
                )}

                {/* File attachments */}
                <div className={cn(isCurrentUser && "flex justify-end")}>
                    {renderFileAttachment()}
                </div>

                {/* Message Status */}
                {renderMessageStatus()}

                {/* Legacy image support */}
                {message.imageUrl && (
                    <div className={cn("mt-2", isCurrentUser && "flex justify-end")}>
                        <Image
                            src={message.imageUrl}
                            alt="Shared content"
                            width={300}
                            height={200}
                            className="rounded-lg object-cover max-w-sm h-auto cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => window.open(message.imageUrl, '_blank')}
                        />
                    </div>
                )}

                {/* GIF support */}
                {message.gifUrl && (
                    <div className={cn("mt-2", isCurrentUser && "flex justify-end")}>
                        <Image
                            src={message.gifUrl}
                            alt="GIF"
                            width={300}
                            height={200}
                            className="rounded-lg max-w-sm h-auto"
                            unoptimized
                        />
                    </div>
                )}

                {/* Audio message */}
                {message.audioUrl && (
                    <div className="mt-2">
                        <AudioPlayer src={message.audioUrl} mp3Url={message.mp3Url} />
                    </div>
                )}

                {/* Voice message */}
                {message.voiceMessageUrl && (
                    <div className="mt-2">
                        <AudioPlayer src={message.voiceMessageUrl} mp3Url={message.mp3Url} />
                    </div>
                )}
            </div>

            {/* Reactions - Always visible and accessible */}
            <div className="mt-3 flex items-center justify-between">
                <MessageReactions
                    messageId={message.id}
                    reactions={message.reactions || {}}
                    currentUserId={user?.uid || ""}
                    onReact={handleReaction}
                    onRemoveReaction={handleReaction}
                />

                {/* Quick action buttons for mobile */}
                <div className="flex gap-1 md:hidden">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onReply && onReply(message)}
                        className="h-8 px-2 text-xs touch-manipulation"
                    >
                        <Reply className="h-3 w-3 mr-1" />
                        Reply
                    </Button>
                    {isCurrentUser && onEdit && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsEditing(true)}
                            className="h-8 px-2 text-xs touch-manipulation"
                        >
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                        </Button>
                    )}
                </div>
            </div>

            {/* Message Actions - Always visible on mobile, hover on desktop */}
            <div className={cn(
                "absolute top-2 right-2 flex space-x-1 bg-white dark:bg-gray-900 rounded-lg shadow-lg p-1 transition-opacity",
                // Always show on mobile (< md), show on hover for desktop
                showActions || "md:opacity-0 md:group-hover:opacity-100"
            )}>
                {/* Desktop actions */}
                <button
                    onClick={() => onReply && onReply(message)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full tap-feedback hidden md:block"
                    title="Reply"
                >
                    <Reply className="w-4 h-4" />
                </button>
                {isCurrentUser && onEdit && (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full tap-feedback hidden md:block"
                        title="Edit"
                    >
                        <Edit className="w-4 h-4" />
                    </button>
                )}
                {isCurrentUser && (
                    <>
                        <button
                            onClick={() => onDelete && onDelete(message.id)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-red-500 tap-feedback"
                            title="Delete"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full tap-feedback"
                                    title="Set expiration"
                                >
                                    <Clock className="w-4 h-4" />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                {Object.entries(MESSAGE_EXPIRATION_OPTIONS).map(([key, option]) => (
                                    <DropdownMenuItem
                                        key={key}
                                        onClick={() => {
                                            if (key === 'never') {
                                                handleExpire(0)
                                            } else if (option.duration) {
                                                const minutes = option.duration / (1000 * 60)
                                                handleExpire(minutes)
                                            }
                                        }}
                                    >
                                        {option.label}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </>
                )}
                {message.threadId && !isThreadView && (
                    <>
                        <button
                            onClick={() => onThreadClick(message)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full tap-feedback"
                            title="View thread"
                        >
                            <MessageSquare className="w-4 h-4" />
                        </button>
                        <button
                            onClick={handleSubscribeToggle}
                            className={`p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full tap-feedback ${isSubscribed ? 'text-blue-500' : ''
                                }`}
                            title={isSubscribed ? 'Unsubscribe from thread' : 'Subscribe to thread'}
                        >
                            {isSubscribed ? (
                                <Bell className="w-4 h-4" />
                            ) : (
                                <BellOff className="w-4 h-4" />
                            )}
                        </button>
                    </>
                )}
            </div>

            {/* Expiration Info */}
            {expirationInfo && (
                <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{expirationInfo}</span>
                </div>
            )}
        </div>
    )
} 