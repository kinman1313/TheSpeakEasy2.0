"use client"

import React, { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { 
  Mic, MicOff, Video, VideoOff, PhoneOff, 
  Maximize2, Minimize2, Settings, Users,
  Signal, SignalHigh, SignalLow, SignalZero
} from "lucide-react"
import { useWebRTC } from "@/components/providers/WebRTCProvider"
import { useHaptics } from "@/lib/haptics"
import { cn } from "@/lib/utils"

export function ImprovedVideoCallView() {
  const {
    localStream,
    remoteStream,
    callStatus,
    isLocalAudioMuted,
    isLocalVideoEnabled,
    toggleLocalAudio,
    toggleLocalVideo,
    closePeerConnection,
    activeCallTargetUserName,
    peerConnection
  } = useWebRTC()

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'poor' | 'lost'>('excellent')
  const { buttonPress, tap } = useHaptics()
  const controlsTimeoutRef = useRef<NodeJS.Timeout>()

  // Auto-hide controls after 3 seconds
  useEffect(() => {
    const resetControlsTimeout = () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }
      setShowControls(true)
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false)
      }, 3000)
    }

    resetControlsTimeout()

    const handleMouseMove = () => resetControlsTimeout()
    const handleTouch = () => resetControlsTimeout()

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('touchstart', handleTouch)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('touchstart', handleTouch)
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }
    }
  }, [])

  // Monitor connection quality
  useEffect(() => {
    if (!peerConnection) return

    const checkConnectionQuality = async () => {
      try {
        const stats = await peerConnection.getStats()
        let packetLoss = 0
        let jitter = 0
        let rtt = 0

        stats.forEach((report) => {
          if (report.type === 'inbound-rtp' && report.kind === 'video') {
            packetLoss = report.packetsLost || 0
            jitter = report.jitter || 0
          }
          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            rtt = report.currentRoundTripTime || 0
          }
        })

        // Determine quality based on metrics
        if (rtt < 100 && packetLoss < 1 && jitter < 30) {
          setConnectionQuality('excellent')
        } else if (rtt < 200 && packetLoss < 5 && jitter < 50) {
          setConnectionQuality('good')
        } else if (rtt < 400 && packetLoss < 10) {
          setConnectionQuality('poor')
        } else {
          setConnectionQuality('lost')
        }
      } catch (error) {
        console.error('Error checking connection quality:', error)
      }
    }

    const interval = setInterval(checkConnectionQuality, 2000)
    return () => clearInterval(interval)
  }, [peerConnection])

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

  const handleEndCall = async () => {
    buttonPress()
    await closePeerConnection(true, 'ended')
  }

  const handleToggleFullscreen = () => {
    tap()
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  const getConnectionIcon = () => {
    switch (connectionQuality) {
      case 'excellent':
        return <SignalHigh className="h-4 w-4 text-green-500" />
      case 'good':
        return <Signal className="h-4 w-4 text-yellow-500" />
      case 'poor':
        return <SignalLow className="h-4 w-4 text-orange-500" />
      case 'lost':
        return <SignalZero className="h-4 w-4 text-red-500" />
    }
  }

  if (callStatus !== 'connected' && callStatus !== 'calling') {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Main video container */}
      <div className="relative w-full h-full">
        {/* Remote video (full screen) */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />

        {/* Local video (picture-in-picture) */}
        <div className="absolute top-4 right-4 w-32 h-48 md:w-40 md:h-56 bg-gray-900 rounded-lg overflow-hidden shadow-lg">
          {isLocalVideoEnabled ? (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover mirror"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-800">
              <VideoOff className="h-8 w-8 text-gray-400" />
            </div>
          )}
        </div>

        {/* Call info overlay */}
        <div className={cn(
          "absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/70 to-transparent transition-opacity duration-300",
          showControls ? "opacity-100" : "opacity-0"
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-white font-medium">
                {activeCallTargetUserName || "Unknown User"}
              </span>
              {getConnectionIcon()}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleToggleFullscreen}
              className="text-white hover:bg-white/20"
            >
              {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Call controls */}
        <div className={cn(
          "absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/70 to-transparent transition-all duration-300",
          showControls ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
        )}>
          <div className="flex items-center justify-center gap-4">
            {/* Mute button */}
            <Button
              size="lg"
              variant={isLocalAudioMuted ? "destructive" : "secondary"}
              onClick={() => {
                buttonPress()
                toggleLocalAudio()
              }}
              className="w-14 h-14 rounded-full"
            >
              {isLocalAudioMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
            </Button>

            {/* Video toggle button */}
            <Button
              size="lg"
              variant={!isLocalVideoEnabled ? "destructive" : "secondary"}
              onClick={() => {
                buttonPress()
                toggleLocalVideo()
              }}
              className="w-14 h-14 rounded-full"
            >
              {isLocalVideoEnabled ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
            </Button>

            {/* End call button */}
            <Button
              size="lg"
              variant="destructive"
              onClick={handleEndCall}
              className="w-16 h-16 rounded-full"
            >
              <PhoneOff className="h-7 w-7" />
            </Button>

            {/* Settings button */}
            <Button
              size="lg"
              variant="secondary"
              onClick={() => tap()}
              className="w-14 h-14 rounded-full"
            >
              <Settings className="h-6 w-6" />
            </Button>

            {/* Participants button */}
            <Button
              size="lg"
              variant="secondary"
              onClick={() => tap()}
              className="w-14 h-14 rounded-full"
            >
              <Users className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}