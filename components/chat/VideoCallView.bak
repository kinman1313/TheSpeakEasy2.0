"use client"

import React, { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Mic, MicOff, Video, VideoOff, PhoneOff,
  Maximize2, Minimize2, RotateCcw, Speaker,
  MessageCircle, MoreVertical
} from "lucide-react"
import { useHaptics } from "@/lib/haptics"

export type CallStatus =
  | "idle"
  | "calling"
  | "ringing"
  | "connected"
  | "error"
  | "ended"
  | "callDeclined"
  | "callEnded"

export interface VideoCallViewProps {
  localStream: MediaStream | null
  remoteStream: MediaStream | null
  onToggleAudio: () => void
  onToggleVideo: () => void
  onEndCall: () => Promise<void>
  targetUserName: string | null
  callStatus: CallStatus
  isLocalAudioMuted: boolean
  isLocalVideoEnabled: boolean
  peerConnection: RTCPeerConnection | null
  setRemoteStream: (stream: MediaStream | null) => void
}

export function VideoCallView({
  localStream,
  remoteStream,
  onToggleAudio,
  onToggleVideo,
  onEndCall,
  targetUserName,
  callStatus,
  isLocalAudioMuted,
  isLocalVideoEnabled,
}: VideoCallViewProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [isLocalVideoMinimized, setIsLocalVideoMinimized] = useState(false)
  const [speakerEnabled, setSpeakerEnabled] = useState(true)
  const [callDuration, setCallDuration] = useState(0)
  const [connectionQuality] = useState<'excellent' | 'good' | 'poor'>('excellent')

  const { buttonPress, tap, error: hapticError } = useHaptics()
  const controlsTimeoutRef = useRef<NodeJS.Timeout>()

  // Auto-hide controls after 3 seconds of inactivity
  useEffect(() => {
    if (showControls) {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false)
      }, 3000)
    }
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }
    }
  }, [showControls])

  // Call duration timer
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (callStatus === 'connected') {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1)
      }, 1000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [callStatus])

  // Set up video streams
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream
    }
  }, [localStream])

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream
    }
  }, [remoteStream])

  // Screen orientation handling
  useEffect(() => {
    const handleOrientationChange = () => {
      // Force landscape for video calls on mobile
      if (screen.orientation && 'lock' in screen.orientation) {
        (screen.orientation as any).lock('landscape').catch(() => {
          // Ignore errors - not all browsers support this
        })
      }
    }

    handleOrientationChange()

    return () => {
      // Unlock orientation when call ends
      if (screen.orientation && 'unlock' in screen.orientation) {
        (screen.orientation as any).unlock()
      }
    }
  }, [])

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const getCallStatusMessage = () => {
    switch (callStatus) {
      case 'calling': return "Calling..."
      case 'ringing': return "Ringing..."
      case 'connected': return formatDuration(callDuration)
      case 'error': return "Connection failed"
      case 'ended': case 'callEnded': return "Call ended"
      case 'callDeclined': return "Call declined"
      default: return ""
    }
  }

  const handleToggleAudio = async () => {
    await buttonPress()
    onToggleAudio()
  }

  const handleToggleVideo = async () => {
    await buttonPress()
    onToggleVideo()
  }

  const handleEndCall = async () => {
    await hapticError()
    await onEndCall()
  }

  const handleScreenTap = async () => {
    await tap()
    setShowControls(!showControls)
  }

  const toggleSpeaker = async () => {
    await buttonPress()
    setSpeakerEnabled(!speakerEnabled)
    // In a real implementation, you'd toggle speaker output here
  }

  const switchCamera = async () => {
    await buttonPress()
    // In a real implementation, you'd switch between front/back camera
  }

  const toggleFullscreen = async () => {
    await buttonPress()
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  if (callStatus === 'idle') {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col overflow-hidden">
      {/* Status Bar */}
      <div className={`absolute top-0 left-0 right-0 z-20 p-4 bg-gradient-to-b from-black/80 to-transparent transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${connectionQuality === 'excellent' ? 'bg-green-500' : connectionQuality === 'good' ? 'bg-yellow-500' : 'bg-red-500'}`} />
            <span className="text-sm font-medium">{targetUserName || "Unknown User"}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm">{getCallStatusMessage()}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleFullscreen}
              className="text-white hover:bg-white/20 p-2"
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Video Container */}
      <div
        className="flex-1 relative bg-gray-900"
        onClick={handleScreenTap}
      >
        {/* Remote Video (Main) */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />

        {/* No Video Placeholder */}
        {!remoteStream && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <div className="text-center text-white">
              <div className="w-32 h-32 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl font-bold">
                  {targetUserName?.[0]?.toUpperCase() || "?"}
                </span>
              </div>
              <p className="text-xl font-medium mb-2">{targetUserName || "Unknown User"}</p>
              <p className="text-gray-400">{getCallStatusMessage()}</p>
            </div>
          </div>
        )}

        {/* Local Video (Picture-in-Picture) */}
        <div
          className={`absolute transition-all duration-300 bg-gray-800 rounded-lg overflow-hidden border-2 border-white/20 ${isLocalVideoMinimized
            ? 'top-4 right-4 w-20 h-28'
            : 'top-4 right-4 w-32 h-48 md:w-40 md:h-56'
            }`}
          onClick={(e) => {
            e.stopPropagation()
            setIsLocalVideoMinimized(!isLocalVideoMinimized)
            tap()
          }}
        >
          {isLocalVideoEnabled && localStream ? (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-700">
              <VideoOff className="h-6 w-6 text-gray-400" />
            </div>
          )}
        </div>

        {/* Connection Quality Indicator */}
        <div className={`absolute top-20 left-4 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex items-center gap-1 bg-black/50 rounded-full px-3 py-1">
            <div className={`w-1 h-3 rounded-full ${connectionQuality === 'excellent' ? 'bg-green-500' : 'bg-gray-500'}`} />
            <div className={`w-1 h-4 rounded-full ${connectionQuality !== 'poor' ? 'bg-green-500' : 'bg-gray-500'}`} />
            <div className={`w-1 h-5 rounded-full ${connectionQuality === 'excellent' ? 'bg-green-500' : 'bg-gray-500'}`} />
          </div>
        </div>
      </div>

      {/* Call Controls */}
      <div className={`absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 to-transparent transition-all duration-300 ${showControls ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}>
        {/* Secondary Controls */}
        <div className="flex justify-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="lg"
            onClick={switchCamera}
            className="w-12 h-12 rounded-full bg-black/50 border border-white/20 text-white hover:bg-white/20 touch-manipulation"
          >
            <RotateCcw className="h-5 w-5" />
          </Button>

          <Button
            variant="ghost"
            size="lg"
            onClick={toggleSpeaker}
            className={`w-12 h-12 rounded-full border border-white/20 text-white hover:bg-white/20 touch-manipulation ${speakerEnabled ? 'bg-green-600' : 'bg-black/50'
              }`}
          >
            <Speaker className="h-5 w-5" />
          </Button>

          <Button
            variant="ghost"
            size="lg"
            className="w-12 h-12 rounded-full bg-black/50 border border-white/20 text-white hover:bg-white/20 touch-manipulation"
          >
            <MessageCircle className="h-5 w-5" />
          </Button>

          <Button
            variant="ghost"
            size="lg"
            className="w-12 h-12 rounded-full bg-black/50 border border-white/20 text-white hover:bg-white/20 touch-manipulation"
          >
            <MoreVertical className="h-5 w-5" />
          </Button>
        </div>

        {/* Primary Controls */}
        <div className="flex items-center justify-center gap-6">
          {/* Audio Toggle */}
          <Button
            size="lg"
            onClick={handleToggleAudio}
            className={`w-16 h-16 rounded-full border-2 border-white/30 text-white hover:scale-105 transition-all touch-manipulation ${isLocalAudioMuted
              ? 'bg-red-600 hover:bg-red-700'
              : 'bg-black/50 hover:bg-white/20'
              }`}
          >
            {isLocalAudioMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
          </Button>

          {/* End Call */}
          <Button
            size="lg"
            onClick={handleEndCall}
            className="w-20 h-20 rounded-full bg-red-600 hover:bg-red-700 text-white hover:scale-105 transition-all touch-manipulation shadow-lg"
          >
            <PhoneOff className="h-8 w-8" />
          </Button>

          {/* Video Toggle */}
          <Button
            size="lg"
            onClick={handleToggleVideo}
            className={`w-16 h-16 rounded-full border-2 border-white/30 text-white hover:scale-105 transition-all touch-manipulation ${!isLocalVideoEnabled
              ? 'bg-red-600 hover:bg-red-700'
              : 'bg-black/50 hover:bg-white/20'
              }`}
          >
            {isLocalVideoEnabled ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
          </Button>
        </div>

        {/* Mobile-specific hint */}
        <div className="text-center mt-4 md:hidden">
          <p className="text-white/60 text-sm">Tap screen to show/hide controls</p>
        </div>
      </div>
    </div>
  )
}
