// components/audio/VoiceRecorder.tsx
"use client"
import React, { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Mic, Square, AlertCircle } from "lucide-react"
import { AudioVisualizer } from "./AudioVisualizer"
import { toast } from "sonner"

interface VoiceRecorderProps {
    onRecordingComplete: (audioBlob: Blob) => void
    maxDuration?: number
}

export function VoiceRecorder({ onRecordingComplete, maxDuration = 60 }: VoiceRecorderProps) {
    const [isRecording, setIsRecording] = useState(false)
    const [progress, setProgress] = useState(0)
    const [stream, setStream] = useState<MediaStream | null>(null)
    const [permissionError, setPermissionError] = useState<string | null>(null)
    const mediaRecorder = useRef<MediaRecorder | null>(null)
    const chunks = useRef<Blob[]>([])
    const progressInterval = useRef<NodeJS.Timeout>()

    const checkMicrophonePermission = async (): Promise<boolean> => {
        try {
            // First check if permissions API is available
            if ('permissions' in navigator) {
                const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName })
                if (permission.state === 'denied') {
                    setPermissionError('Microphone access is denied. Please enable microphone permissions in your browser settings.')
                    return false
                }
            }
            return true
        } catch (error) {
            console.warn('Could not check microphone permission:', error)
            return true // Proceed anyway if permission check fails
        }
    }

    const startRecording = useCallback(async () => {
        setPermissionError(null)

        // Check permissions first
        const hasPermission = await checkMicrophonePermission()
        if (!hasPermission) {
            return
        }

        try {
            console.log('Requesting microphone access...')

            const audioStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 44100
                }
            })

            console.log('Microphone access granted')
            setStream(audioStream)

            // Check if MediaRecorder is supported
            if (!MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
                console.warn('audio/webm;codecs=opus not supported, falling back to default')
            }

            const recorder = new MediaRecorder(audioStream, {
                mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                    ? 'audio/webm;codecs=opus'
                    : undefined
            })

            mediaRecorder.current = recorder
            chunks.current = []

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunks.current.push(e.data)
                }
            }

            recorder.onstop = () => {
                const blob = new Blob(chunks.current, {
                    type: recorder.mimeType || "audio/webm"
                })
                onRecordingComplete(blob)
                audioStream.getTracks().forEach((track) => track.stop())
                setStream(null)
                toast.success('Voice message recorded successfully!')
            }

            recorder.onerror = (event) => {
                console.error('MediaRecorder error:', event)
                toast.error('Recording failed. Please try again.')
                stopRecording()
            }

            recorder.start()
            setIsRecording(true)

            // Set up progress timer
            let elapsed = 0
            progressInterval.current = setInterval(() => {
                elapsed += 1
                const newProgress = (elapsed / maxDuration) * 100
                setProgress(newProgress)

                if (elapsed >= maxDuration) {
                    stopRecording()
                    toast.info(`Recording stopped automatically after ${maxDuration} seconds`)
                }
            }, 1000)

            toast.success('Recording started!')

        } catch (error: any) {
            console.error("Error accessing microphone:", error)

            let errorMessage = "Could not access microphone. "

            if (error.name === 'NotAllowedError') {
                errorMessage += "Please allow microphone access and try again."
                setPermissionError('Microphone access was denied. Please click the microphone icon in your browser\'s address bar and allow access.')
            } else if (error.name === 'NotFoundError') {
                errorMessage += "No microphone found. Please connect a microphone and try again."
                setPermissionError('No microphone detected. Please connect a microphone and try again.')
            } else if (error.name === 'NotReadableError') {
                errorMessage += "Microphone is being used by another application."
                setPermissionError('Microphone is busy. Please close other applications using the microphone and try again.')
            } else {
                errorMessage += "Please check your microphone settings and try again."
                setPermissionError(`Microphone error: ${error.message}`)
            }

            toast.error(errorMessage)
        }
    }, [maxDuration, onRecordingComplete])

    const stopRecording = useCallback(() => {
        if (mediaRecorder.current && isRecording) {
            mediaRecorder.current.stop()
            setIsRecording(false)
            setProgress(0)
            if (progressInterval.current) {
                clearInterval(progressInterval.current)
            }
        }
    }, [isRecording])

    if (permissionError) {
        return (
            <div className="flex flex-col gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">Microphone Access Required</span>
                </div>
                <p className="text-xs text-red-600 dark:text-red-400">{permissionError}</p>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                        setPermissionError(null)
                        startRecording()
                    }}
                    className="mt-2"
                >
                    Try Again
                </Button>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
                {isRecording ? (
                    <>
                        <Button variant="destructive" size="icon" onClick={stopRecording} className="h-8 w-8">
                            <Square className="h-4 w-4" />
                        </Button>
                        <Progress value={progress} className="flex-1" />
                        <span className="text-xs text-muted-foreground">
                            {Math.floor(progress * maxDuration / 100)}s / {maxDuration}s
                        </span>
                    </>
                ) : (
                    <Button variant="outline" size="icon" onClick={startRecording} className="h-8 w-8">
                        <Mic className="h-4 w-4" />
                    </Button>
                )}
            </div>

            {stream && <AudioVisualizer stream={stream} className="w-full h-[50px] bg-black/20 rounded-md" />}
        </div>
    )
}
