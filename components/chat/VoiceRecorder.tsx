"use client"

import React, { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Mic, Square } from "lucide-react"
import { AudioVisualizer } from "./AudioVisualizer"

interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob) => void
  onClose: () => void
  maxDuration?: number
}

export function VoiceRecorder({ onRecordingComplete, onClose, maxDuration = 60 }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [progress, setProgress] = useState(0)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const mediaRecorder = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])
  const progressInterval = useRef<NodeJS.Timeout>()

  const startRecording = useCallback(async () => {
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      setStream(audioStream)

      const recorder = new MediaRecorder(audioStream)
      mediaRecorder.current = recorder
      chunks.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.current.push(e.data)
        }
      }

      recorder.onstop = () => {
        const blob = new Blob(chunks.current, { type: "audio/webm" })
        onRecordingComplete(blob)
        audioStream.getTracks().forEach((track) => track.stop())
        setStream(null)
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
        }
      }, 1000)
    } catch (error) {
      console.error("Error accessing microphone:", error)
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

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {isRecording ? (
          <>
            <Button variant="destructive" size="icon" onClick={stopRecording} className="h-8 w-8">
              <Square className="h-4 w-4" />
            </Button>
            <Progress value={progress} className="flex-1" />
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
