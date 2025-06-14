"use client"

import { useEffect, useRef } from 'react'
import { Check, CheckCheck, Clock, AlertCircle } from 'lucide-react'
import { type MessageStatus as MessageStatusType } from '@/lib/types'
import { cn } from '@/lib/utils'

interface MessageStatusProps {
    status: MessageStatusType
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

    const getStatusIcon = () => {
        switch (status) {
            case 'sending':
                return <Clock className="h-3 w-3 text-slate-400 animate-pulse" />
            case 'sent':
                return <Check className="h-3 w-3 text-slate-400" />
            case 'delivered':
                return <CheckCheck className="h-3 w-3 text-slate-400" />
            case 'read':
                return <CheckCheck className="h-3 w-3 text-blue-400" />
            case 'failed':
                return <AlertCircle className="h-3 w-3 text-red-400" />
            default:
                return null
        }
    }

    const getStatusText = () => {
        switch (status) {
            case 'sending':
                return 'Sending...'
            case 'sent':
                return 'Sent'
            case 'delivered':
                return 'Delivered'
            case 'read':
                return 'Read'
            case 'failed':
                return 'Failed to send'
            default:
                return ''
        }
    }

    return (
        <div ref={messageRef} className={cn("flex items-center gap-1", className)} title={getStatusText()}>
            {getStatusIcon()}
        </div>
    )
} 