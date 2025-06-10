"use client"

import { useEffect, useState } from "react"
import { type TypingIndicator as TypingIndicatorType } from "@/lib/types"

interface TypingIndicatorProps {
    typingUsers: TypingIndicatorType[]
    className?: string
}

export function TypingIndicator({ typingUsers, className = "" }: TypingIndicatorProps) {
    const [visibleUsers, setVisibleUsers] = useState<TypingIndicatorType[]>([])

    useEffect(() => {
        setVisibleUsers(typingUsers)
    }, [typingUsers])

    if (visibleUsers.length === 0) return null

    const formatTypingMessage = () => {
        const userNames = visibleUsers.map(user => user.userName)

        if (userNames.length === 1) {
            return `${userNames[0]} is typing...`
        } else if (userNames.length === 2) {
            return `${userNames[0]} and ${userNames[1]} are typing...`
        } else if (userNames.length === 3) {
            return `${userNames[0]}, ${userNames[1]} and ${userNames[2]} are typing...`
        } else {
            return `${userNames.slice(0, 2).join(', ')} and ${userNames.length - 2} others are typing...`
        }
    }

    return (
        <div className={`flex items-center gap-2 p-3 text-sm text-muted-foreground ${className}`}>
            <div className="flex gap-1">
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span>{formatTypingMessage()}</span>
        </div>
    )
} 