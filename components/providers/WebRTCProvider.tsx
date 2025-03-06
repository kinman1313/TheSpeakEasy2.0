"use client"

import type React from "react"

import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react"
import { db } from "@/lib/firebase"
import { collection, doc, onSnapshot, setDoc, deleteDoc } from "firebase/firestore"
import { useAuth } from "@/components/auth/AuthProvider"

interface WebRTCContextType {
  startCall: (roomId: string, isVideo: boolean) => Promise<void>
  endCall: () => void
  isInCall: boolean
  isVideo: boolean
  remoteStreams: MediaStream[]
  localStream: MediaStream | null
}

const WebRTCContext = createContext<WebRTCContextType>({
  startCall: async () => {},
  endCall: () => {},
  isInCall: false,
  isVideo: false,
  remoteStreams: [],
  localStream: null,
})

const configuration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }],
}

export function WebRTCProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [isInCall, setIsInCall] = useState(false)
  const [isVideo, setIsVideo] = useState(false)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStreams, setRemoteStreams] = useState<MediaStream[]>([])

  const peerConnections = useRef<{ [key: string]: RTCPeerConnection }>({})
  const currentRoomId = useRef<string | null>(null)

  const createPeerConnection = async (peerId: string) => {
    if (!currentRoomId.current || !user) return

    const pc = new RTCPeerConnection(configuration)
    peerConnections.current[peerId] = pc

    // Add local tracks to peer connection
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream)
      })
    }

    // Handle ICE candidates
    pc.onicecandidate = async (event) => {
      if (event.candidate && currentRoomId.current) {
        // Add null check here
        await setDoc(doc(db, "calls", currentRoomId.current, "candidates", `${user.uid}-${Date.now()}`), {
          candidate: event.candidate.toJSON(),
          peerId,
        })
      }
    }

    // Handle remote tracks
    pc.ontrack = (event) => {
      const stream = event.streams[0]
      setRemoteStreams((prev) => {
        if (!prev.find((s) => s.id === stream.id)) {
          return [...prev, stream]
        }
        return prev
      })
    }

    return pc
  }

  const startCall = async (roomId: string, video: boolean) => {
    if (!user) return

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video,
        audio: true,
      })

      setLocalStream(stream)
      setIsInCall(true)
      setIsVideo(video)
      currentRoomId.current = roomId

      // Create room document
      await setDoc(doc(db, "calls", roomId), {
        createdBy: user.uid,
        createdAt: new Date(),
        isVideo: video,
      })

      // Listen for new participants
      onSnapshot(collection(db, "calls", roomId, "participants"), async (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
          if (change.type === "added" && change.doc.id !== user.uid) {
            const pc = await createPeerConnection(change.doc.id)
            if (pc) {
              const offer = await pc.createOffer()
              await pc.setLocalDescription(offer)

              await setDoc(doc(db, "calls", roomId, "offers", user.uid), {
                offer: { sdp: offer.sdp, type: offer.type },
                peerId: change.doc.id,
              })
            }
          }
        })
      })
    } catch (error) {
      console.error("Error starting call:", error)
    }
  }

  const endCall = useCallback(() => {
    if (currentRoomId.current && user) {
      // Clean up Firestore
      deleteDoc(doc(db, "calls", currentRoomId.current)).catch(console.error)

      // Clean up local state and streams
      Object.values(peerConnections.current).forEach((pc) => pc.close())
      peerConnections.current = {}

      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop())
      }

      setLocalStream(null)
      setRemoteStreams([])
      setIsInCall(false)
      setIsVideo(false)
      currentRoomId.current = null
    }
  }, [localStream, user])

  useEffect(() => {
    return () => {
      endCall()
    }
  }, [endCall])

  return (
    <WebRTCContext.Provider
      value={{
        startCall,
        endCall,
        isInCall,
        isVideo,
        remoteStreams,
        localStream,
      }}
    >
      {children}
    </WebRTCContext.Provider>
  )
}

export const useWebRTC = () => {
  const context = useContext(WebRTCContext)
  if (!context) {
    throw new Error("useWebRTC must be used within a WebRTCProvider")
  }
  return context
}

