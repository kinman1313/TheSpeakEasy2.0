"use client"

import { useEffect, useState } from "react"
import { TypingIndicatorService } from "@/lib/typingIndicators"
import { type TypingIndicator as TypingIndicatorType } from "@/lib/types"
import { cn } from "@/lib/utils"

interface TypingIndicatorProps {
    roomId: string
    currentUserId: string
    className?: string
}

export function TypingIndicator({ roomId, currentUserId, className }: TypingIndicatorProps) {
    const [typingUsers, setTypingUsers] = useState<TypingIndicatorType[]>([])

    useEffect(() => {
        const cleanup = TypingIndicatorService.listenToTyping(
            roomId,
            currentUserId,
            (users) => setTypingUsers(users)
        )

        return cleanup
    }, [roomId, currentUserId])

    if (typingUsers.length === 0) return null

    const getTypingText = () => {
        if (typingUsers.length === 1) {
            return `${typingUsers[0].userName} is typing`
        } else if (typingUsers.length === 2) {
            return `${typingUsers[0].userName} and ${typingUsers[1].userName} are typing`
        } else {
            return `${typingUsers.length} people are typing`
        }
    }

    return (
        <div className={cn(
            "flex items-center gap-2 text-sm text-muted-foreground animate-in fade-in slide-in-from-bottom-2",
            className
        )}>
            <div className="flex gap-1">
                <span className="animate-bounce delay-0">•</span>
                <span className="animate-bounce delay-150">•</span>
                <span className="animate-bounce delay-300">•</span>
            </div>
            <span>{getTypingText()}</span>
        </div>
    )
} 