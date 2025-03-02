"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Mic, MicOff, Phone, PhoneOff, Video, VideoOff } from "lucide-react"
import { db } from "@/lib/firebase"
import { useAuth } from "@/components/auth/AuthProvider"
import { collection, doc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore"
import { toast } from "sonner"

// Define all interfaces with proper TypeScript syntax
interface CallControlsProps {
  isVideo: boolean
  roomId: string
  onEnd: () => void
}

interface Participant {
  id: string
  displayName?: string
  photoURL?: string
  joinedAt: Date
}

interface SignalData {
  type: "offer" | "answer" | "ice-candidate"
  from: string
  to: string
  offer?: RTCSessionDescriptionInit
  answer?: RTCSessionDescriptionInit
  candidate?: RTCIceCandidateInit
  timestamp?: Date
}

// Component definition
export function CallControls({ isVideo, roomId, onEnd }: CallControlsProps) {
  const { user } = useAuth()
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoEnabled, setIsVideoEnabled] = useState(isVideo)
  const [isCallActive, setIsCallActive] = useState(false)
  const [participants, setParticipants] = useState<Participant[]>([])

  const peerConnection = useRef<RTCPeerConnection | null>(null)
  const localStream = useRef<MediaStream | null>(null)
  const remoteStream = useRef<MediaStream | null>(null)

  // Initialize WebRTC
  useEffect(() => {
    if (!user) return

    const initializeCall = async () => {
      try {
        // Create RTCPeerConnection
        peerConnection.current = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }],
        })

        // Get local media stream
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: isVideo,
        })
        localStream.current = stream

        // Add tracks to peer connection
        stream.getTracks().forEach((track) => {
          if (peerConnection.current) {
            peerConnection.current.addTrack(track, stream)
          }
        })

        // Handle incoming tracks
        peerConnection.current.ontrack = (event) => {
          remoteStream.current = event.streams[0]
        }

        setIsCallActive(true)
      } catch (error) {
        console.error("Error initializing call:", error)
        toast.error("Failed to initialize call")
        onEnd()
      }
    }

    // Listen for signaling data
    const signalRef = collection(db, `rooms/${roomId}/signals`)
    const unsubscribe = onSnapshot(signalRef, (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === "added") {
          const signal = change.doc.data() as SignalData
          if (signal.to === user.uid) {
            handleIncomingSignal(signal)
          }
        }
      })
    })

    if (isCallActive) {
      initializeCall()
    }

    return () => {
      unsubscribe()
      cleanupCall()
    }
  }, [user, roomId, isVideo, isCallActive, onEnd])

  const handleIncomingSignal = async (signal: SignalData) => {
    if (!peerConnection.current) return

    try {
      if (signal.type === "offer") {
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(signal.offer))
        const answer = await peerConnection.current.createAnswer()
        await peerConnection.current.setLocalDescription(answer)
        await sendSignal({
          type: "answer",
          from: user!.uid,
          to: signal.from,
          answer,
        })
      } else if (signal.type === "answer") {
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(signal.answer))
      } else if (signal.type === "ice-candidate" && signal.candidate) {
        await peerConnection.current.addIceCandidate(new RTCIceCandidate(signal.candidate))
      }
    } catch (error) {
      console.error("Error handling incoming signal:", error)
    }
  }

  const sendSignal = async (signal: SignalData) => {
    try {
      const signalRef = doc(collection(db, `rooms/${roomId}/signals`))
      await setDoc(signalRef, {
        ...signal,
        timestamp: serverTimestamp(),
      })
    } catch (error) {
      console.error("Error sending signal:", error)
    }
  }

  const cleanupCall = () => {
    if (localStream.current) {
      localStream.current.getTracks().forEach((track) => track.stop())
    }
    if (peerConnection.current) {
      peerConnection.current.close()
    }
    localStream.current = null
    peerConnection.current = null
    setIsCallActive(false)
  }

  const toggleMute = () => {
    if (localStream.current) {
      localStream.current.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled
      })
      setIsMuted(!isMuted)
    }
  }

  const toggleVideo = () => {
    if (localStream.current) {
      localStream.current.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled
      })
      setIsVideoEnabled(!isVideoEnabled)
    }
  }

  const handleEndCall = () => {
    cleanupCall()
    onEnd()
  }

  return (
    <div className="flex items-center gap-2">
      <Button size="icon" variant={isMuted ? "destructive" : "secondary"} onClick={toggleMute} className="rounded-full">
        {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
      </Button>

      {isVideo && (
        <Button
          size="icon"
          variant={isVideoEnabled ? "secondary" : "destructive"}
          onClick={toggleVideo}
          className="rounded-full"
        >
          {isVideoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
        </Button>
      )}

      <Button size="icon" variant="destructive" onClick={handleEndCall} className="rounded-full">
        {isCallActive ? <PhoneOff className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
      </Button>
    </div>
  )
}

