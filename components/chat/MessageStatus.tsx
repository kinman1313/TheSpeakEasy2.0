"use client"

import { useEffect, useRef } from 'react'
import { Check, CheckCheck } from 'lucide-react'
import { type MessageStatus } from '@/lib/types'
import { cn } from '@/lib/utils'

interface MessageStatusProps {
    status: MessageStatus
    className?: string
}

export function MessageStatus({ status, className }: MessageStatusProps) {
    const messageRef = useRef<HTMLDivElement>(null)

    // Screenshot prevention
    useEffect(() => {
        const element = messageRef.current
        if (!element) return

        // Prevent screenshots
        element.style.webkitUserSelect = 'none'
        element.style.userSelect = 'none'
        // @ts-ignore - webkitTouchCallout is a valid CSS property but TypeScript doesn't recognize it
        element.style.webkitTouchCallout = 'none'

        // Add CSS to prevent screenshots
        const style = document.createElement('style')
        style.textContent = `
      .prevent-screenshot {
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
        user-select: none !important;
        -webkit-touch-callout: none !important;
      }
      .prevent-screenshot img {
        pointer-events: none;
      }
    `
        document.head.appendChild(style)

        // Add class to prevent screenshots
        element.classList.add('prevent-screenshot')

        return () => {
            document.head.removeChild(style)
            element.classList.remove('prevent-screenshot')
        }
    }, [])

    return (
        <div ref={messageRef} className={cn("flex items-center gap-1", className)}>
            {status === 'sending' && (
                <span className="text-xs text-muted-foreground">Sending...</span>
            )}
            {status === 'sent' && (
                <Check className="h-3 w-3 text-muted-foreground" />
            )}
            {status === 'delivered' && (
                <Check className="h-3 w-3 text-muted-foreground" />
            )}
            {status === 'read' && (
                <CheckCheck className="h-3 w-3 text-primary" />
            )}
        </div>
    )
} 