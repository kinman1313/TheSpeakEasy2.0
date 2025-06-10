"use client"

import { useState, useRef, useEffect } from "react"
import Image from "next/image"
import { formatDistanceToNow } from "date-fns"
import { Edit, Trash2, Reply, Download, ExternalLink, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AudioPlayer } from "@/components/chat/AudioPlayer"
import { formatFileSize, getFileIcon } from "@/lib/storage"
import { MessageExpirationService } from "@/lib/messageExpiration"
import { type Message as MessageType } from "@/lib/types"
import { cn } from "@/lib/utils"

interface MessageProps {
    message: MessageType
    isCurrentUser: boolean
    onEdit?: (messageId: string, newText: string) => void
    onDelete?: (messageId: string) => void
    onReply?: (message: MessageType) => void
    onReaction?: (messageId: string, emoji: string) => void
    className?: string
}

export function Message({
    message,
    isCurrentUser,
    onEdit,
    onDelete,
    onReply,
    onReaction,
    className
}: MessageProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [editText, setEditText] = useState(message.text)
    const [expirationInfo, setExpirationInfo] = useState<string>('')
    const editInputRef = useRef<HTMLInputElement>(null)

    // Update expiration info
    useEffect(() => {
        if (message.expiresAt && message.expirationTimer) {
            const updateExpirationInfo = () => {
                const info = MessageExpirationService.getExpirationInfo(
                    message.expiresAt || null,
                    message.expirationTimer!
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

    const formatTimestamp = (date: Date) => {
        return formatDistanceToNow(new Date(date), { addSuffix: true })
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
                    <AudioPlayer src={message.fileUrl} />
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

    const renderReactions = () => {
        if (!message.reactions) return null

        const reactionEntries = Object.entries(message.reactions)
        if (reactionEntries.length === 0) return null

        return (
            <div className="flex flex-wrap gap-1 mt-2">
                {reactionEntries.map(([emoji, userIds]) => (
                    <button
                        key={emoji}
                        onClick={() => onReaction?.(message.id, emoji)}
                        className="flex items-center gap-1 px-2 py-1 bg-muted hover:bg-muted/80 rounded-full text-xs transition-colors"
                    >
                        <span>{emoji}</span>
                        <span className="text-muted-foreground">{userIds.length}</span>
                    </button>
                ))}
            </div>
        )
    }

    return (
        <div className={cn(
            "group flex gap-3 p-2 md:p-3 hover:bg-accent/50 transition-colors",
            isCurrentUser && "flex-row-reverse",
            className
        )}>
            {/* Avatar */}
            <div className="flex-shrink-0">
                {message.photoURL ? (
                    <Image
                        src={message.photoURL}
                        alt={message.displayName || message.userName}
                        width={32}
                        height={32}
                        className="rounded-full"
                    />
                ) : (
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                        <span className="text-primary-foreground text-sm font-semibold">
                            {(message.displayName || message.userName || 'U').charAt(0).toUpperCase()}
                        </span>
                    </div>
                )}
            </div>

            {/* Message Content */}
            <div className={cn("flex-1 min-w-0", isCurrentUser && "text-right")}>
                {/* Header */}
                <div className={cn(
                    "flex items-center gap-2 mb-1",
                    isCurrentUser && "flex-row-reverse"
                )}>
                    <span className="font-semibold text-sm">
                        {message.displayName || message.userName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                        {formatTimestamp(message.createdAt)}
                    </span>
                    {message.isEdited && (
                        <span className="text-xs text-muted-foreground">(edited)</span>
                    )}
                    {expirationInfo && expirationInfo !== 'Never expires' && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{expirationInfo}</span>
                        </div>
                    )}
                </div>

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
                        <p className={cn(
                            "text-sm break-words",
                            isCurrentUser && "text-right"
                        )}>
                            {message.text}
                        </p>
                    )
                )}

                {/* File attachments */}
                <div className={cn(isCurrentUser && "flex justify-end")}>
                    {renderFileAttachment()}
                </div>

                {/* Legacy image support */}
                {message.imageUrl && (
                    <div className={cn("mt-2", isCurrentUser && "flex justify-end")}>
                        <Image
                            src={message.imageUrl}
                            alt="Shared content"
                            width={300}
                            height={200}
                            className="rounded-lg object-cover max-w-sm cursor-pointer hover:opacity-90 transition-opacity"
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
                            className="rounded-lg max-w-sm"
                            unoptimized
                        />
                    </div>
                )}

                {/* Audio message */}
                {message.audioUrl && (
                    <div className="mt-2">
                        <AudioPlayer src={message.audioUrl} />
                    </div>
                )}

                {/* Voice message */}
                {message.voiceMessageUrl && (
                    <div className="mt-2">
                        <AudioPlayer src={message.voiceMessageUrl} />
                    </div>
                )}

                {/* Reactions */}
                {renderReactions()}
            </div>

            {/* Message Actions - Simplified for now */}
            <div className={cn(
                "opacity-0 group-hover:opacity-100 transition-opacity flex gap-1",
                isCurrentUser && "order-first"
            )}>
                {onReply && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => onReply(message)}
                        title="Reply"
                    >
                        <Reply className="h-3 w-3" />
                    </Button>
                )}
                {isCurrentUser && onEdit && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => setIsEditing(true)}
                        title="Edit"
                    >
                        <Edit className="h-3 w-3" />
                    </Button>
                )}
                {isCurrentUser && onDelete && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                        onClick={() => onDelete(message.id)}
                        title="Delete"
                    >
                        <Trash2 className="h-3 w-3" />
                    </Button>
                )}
            </div>
        </div>
    )
} 