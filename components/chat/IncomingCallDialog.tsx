"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { PhoneOff, Video, Mic } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface IncomingCallDialogProps {
    open: boolean
    callerName: string
    callerPhotoURL?: string
    onAcceptVideo: () => void
    onAcceptAudio: () => void
    onDecline: () => void
}

export function IncomingCallDialog({
    open,
    callerName,
    callerPhotoURL,
    onAcceptVideo,
    onAcceptAudio,
    onDecline
}: IncomingCallDialogProps) {
    return (
        <Dialog open={open} onOpenChange={() => { }} modal>
            <DialogContent className="sm:max-w-md glass-card border-indigo-500/50">
                <DialogHeader className="text-center">
                    <div className="flex flex-col items-center space-y-4 mb-4">
                        <Avatar className="h-24 w-24 ring-4 ring-indigo-500/50">
                            <AvatarImage src={callerPhotoURL} />
                            <AvatarFallback className="text-2xl bg-indigo-600 text-white">
                                {callerName[0]?.toUpperCase() || '?'}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <DialogTitle className="text-xl text-white">Incoming Call</DialogTitle>
                            <DialogDescription className="text-indigo-200">
                                {callerName} is calling you
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex justify-center space-x-4 pt-4">
                    {/* Decline Button */}
                    <Button
                        variant="destructive"
                        size="lg"
                        onClick={onDecline}
                        className="h-14 w-14 rounded-full bg-red-600 hover:bg-red-700 border-0"
                    >
                        <PhoneOff className="h-6 w-6" />
                    </Button>

                    {/* Accept Audio Call Button */}
                    <Button
                        variant="outline"
                        size="lg"
                        onClick={onAcceptAudio}
                        className="h-14 w-14 rounded-full bg-green-600 hover:bg-green-700 border-0 text-white"
                    >
                        <Mic className="h-6 w-6" />
                    </Button>

                    {/* Accept Video Call Button */}
                    <Button
                        variant="outline"
                        size="lg"
                        onClick={onAcceptVideo}
                        className="h-14 w-14 rounded-full bg-blue-600 hover:bg-blue-700 border-0 text-white"
                    >
                        <Video className="h-6 w-6" />
                    </Button>
                </div>

                <div className="text-center mt-4">
                    <p className="text-sm text-slate-400">
                        Choose audio or video call
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    )
} 