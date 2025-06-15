"use client"

import React, { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { PhoneOff, Video, Mic, User } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useWebRTC } from '@/components/providers/WebRTCProvider'
import { useCallNotifications } from '@/lib/callNotifications'
import { cn } from '@/lib/utils'

interface IncomingCallDialogProps {
    open: boolean
    callerName?: string
    callerPhotoURL?: string
    isVideo?: boolean
    onAcceptVideo?: () => void
    onAcceptAudio?: () => void
    onDecline?: () => void
    className?: string
}

export function IncomingCallDialog({
    open,
    callerName,
    callerPhotoURL,
    isVideo = false,
    onAcceptVideo,
    onAcceptAudio,
    onDecline,
    className
}: IncomingCallDialogProps) {
    const { acceptCall, declineCall, callerUserName, callStatus } = useWebRTC()
    const { stopIncomingCall, getCurrentNotificationId } = useCallNotifications()

    const displayName = callerName || callerUserName || "Unknown User"

    useEffect(() => {
        // Auto-close dialog when call status changes
        if (callStatus === 'connected' || callStatus === 'ended' || callStatus === 'callDeclined') {
            // Stop notifications when dialog closes
            const notificationId = getCurrentNotificationId()
            if (notificationId) {
                stopIncomingCall(notificationId)
            }
        }
    }, [callStatus, stopIncomingCall, getCurrentNotificationId])

    const handleAcceptVideo = async () => {
        try {
            await acceptCall()
            if (onAcceptVideo) onAcceptVideo()
        } catch (error) {
            console.error('Error accepting video call:', error)
        }
    }

    const handleAcceptAudio = async () => {
        try {
            await acceptCall()
            if (onAcceptAudio) onAcceptAudio()
        } catch (error) {
            console.error('Error accepting audio call:', error)
        }
    }

    const handleDecline = async () => {
        try {
            await declineCall()
            if (onDecline) onDecline()
        } catch (error) {
            console.error('Error declining call:', error)
        }
    }

    return (
        <Dialog open={open} onOpenChange={() => { }} modal>
            <DialogContent className={cn("sm:max-w-md glass-card border-indigo-500/50 bg-black/90 backdrop-blur-lg", className)}>
                <DialogHeader className="text-center">
                    <div className="flex flex-col items-center space-y-4 mb-4">
                        {/* Pulsing ring animation */}
                        <div className="relative">
                            <div className="absolute inset-0 rounded-full bg-indigo-500/30 animate-ping" />
                            <div className="absolute inset-2 rounded-full bg-indigo-500/20 animate-ping animation-delay-75" />
                            <Avatar className="relative h-24 w-24 ring-4 ring-indigo-500/50">
                                <AvatarImage src={callerPhotoURL} />
                                <AvatarFallback className="text-2xl bg-indigo-600 text-white">
                                    {displayName[0]?.toUpperCase() || <User className="h-8 w-8" />}
                                </AvatarFallback>
                            </Avatar>
                        </div>
                        
                        <div>
                            <DialogTitle className="text-xl text-white mb-2">
                                Incoming {isVideo ? 'Video' : 'Voice'} Call
                            </DialogTitle>
                            <DialogDescription className="text-indigo-200 text-lg">
                                {displayName} is calling you
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex justify-center space-x-6 pt-4">
                    {/* Decline Button */}
                    <Button
                        variant="destructive"
                        size="lg"
                        onClick={handleDecline}
                        className="h-16 w-16 rounded-full bg-red-600 hover:bg-red-700 border-0 shadow-lg hover:scale-105 transition-all"
                    >
                        <PhoneOff className="h-8 w-8" />
                    </Button>

                    {/* Accept Audio Call Button */}
                    <Button
                        variant="outline"
                        size="lg"
                        onClick={handleAcceptAudio}
                        className="h-16 w-16 rounded-full bg-green-600 hover:bg-green-700 border-0 text-white shadow-lg hover:scale-105 transition-all"
                    >
                        <Mic className="h-8 w-8" />
                    </Button>

                    {/* Accept Video Call Button (only show if it's a video call) */}
                    {isVideo && (
                        <Button
                            variant="outline"
                            size="lg"
                            onClick={handleAcceptVideo}
                            className="h-16 w-16 rounded-full bg-blue-600 hover:bg-blue-700 border-0 text-white shadow-lg hover:scale-105 transition-all"
                        >
                            <Video className="h-8 w-8" />
                        </Button>
                    )}
                </div>

                <div className="text-center mt-6">
                    <p className="text-sm text-slate-400">
                        {isVideo ? 'Choose audio or video call' : 'Audio call - tap to answer'}
                    </p>
                </div>

                {/* Call status indicator */}
                {callStatus === 'ringing' && (
                    <div className="text-center mt-2">
                        <div className="inline-flex items-center gap-2 text-indigo-300 text-sm">
                            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                            Ringing...
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
} 