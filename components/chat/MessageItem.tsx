"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { formatDistanceToNow } from "date-fns"
import { Reply, Edit, Trash2, Clock } from "lucide-react"
import { User } from "firebase/auth"

interface MessageItemProps {
    message: any
    currentUser: User | null
    onEdit?: (messageId: string, newText: string) => void
    onDelete?: (messageId: string) => void
    onReply?: (message: any) => void
    onExpire?: (messageId: string, duration: number) => void
}

export function MessageItem({ message, currentUser, onEdit, onDelete, onReply, onExpire }: MessageItemProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [editText, setEditText] = useState(message.text || "")
    const isCurrentUser = currentUser?.uid === message.uid
    const canEdit = isCurrentUser
    const canDelete = isCurrentUser

    const handleEdit = () => {
        if (onEdit && editText.trim()) {
            onEdit(message.id, editText.trim())
            setIsEditing(false)
        }
    }

    const handleDelete = () => {
        if (onDelete && window.confirm("Are you sure you want to delete this message?")) {
            onDelete(message.id)
        }
    }

    const handleReply = () => {
        if (onReply) {
            onReply(message)
        }
    }

    const handleExpire = (duration: number) => {
        if (onExpire) {
            onExpire(message.id, duration)
        }
    }

    return (
        <div className="flex gap-3 p-3 hover:bg-slate-800/50 rounded-lg group">
            <Avatar className="h-8 w-8">
                <AvatarImage src={message.photoURL} alt={message.userName} />
                <AvatarFallback>{message.userName?.[0]?.toUpperCase() || "?"}</AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-white">{message.userName}</span>
                    <span className="text-xs text-slate-400">
                        {formatDistanceToNow(new Date(message.createdAt?.seconds * 1000 || Date.now()), { addSuffix: true })}
                    </span>
                </div>

                {isEditing ? (
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="flex-1 bg-slate-700 text-white px-2 py-1 rounded"
                            placeholder="Edit your message..."
                            aria-label="Edit message text"
                            onKeyDown={(e) => {
                                if (e.key === "Enter") handleEdit()
                                if (e.key === "Escape") setIsEditing(false)
                            }}
                        />
                        <Button size="sm" onClick={handleEdit}>Save</Button>
                        <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
                    </div>
                ) : (
                    <div className="text-slate-200">{message.text}</div>
                )}

                {/* Message actions */}
                <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="sm" variant="ghost" onClick={handleReply}>
                        <Reply className="h-4 w-4" />
                    </Button>

                    {canEdit && (
                        <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)}>
                            <Edit className="h-4 w-4" />
                        </Button>
                    )}

                    {canDelete && (
                        <Button size="sm" variant="ghost" onClick={handleDelete}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    )}

                    <Button size="sm" variant="ghost" onClick={() => handleExpire(5)}>
                        <Clock className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    )
} 