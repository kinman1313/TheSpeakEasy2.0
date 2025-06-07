"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Mic, MicOff, PhoneOff } from "lucide-react"
import { useAuth } from "@/components/auth/AuthProvider"
import { db } from "@/lib/firebase"
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  getDocs,
  type Firestore,
  type QuerySnapshot,
  type DocumentData,
  type DocumentSnapshot
} from "firebase/firestore"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface VoiceChatProps {
  roomId: string
  redirectUrl?: string // URL to redirect to after ending the call
}

interface Participant {
  id: string
  displayName: string
  photoURL: string
  joinedAt?: Date
}

export default function VoiceChat({ roomId, redirectUrl = "/" }: VoiceChatProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [isMuted, setIsMuted] = useState(false)
  const [participants, setParticipants] = useState<Participant[]>([])
  // Removed unused peerConnections ref
  const localStream = useRef<MediaStream | null>(null)

  // Check if we're in a browser environment and Firebase is initialized
  const isBrowser = typeof window !== "undefined"
  const isFirebaseReady = isBrowser && !!db

  const endCallProcedure = useCallback(async () => {
    // Skip if Firebase is not initialized or not in browser
    if (!isBrowser || !isFirebaseReady || !db || !user) return

    // Clean up Firebase and Peer connections
    try {
      // Use type assertion to tell TypeScript that db is definitely a Firestore instance
      const firestore = db as Firestore

      // Remove the room document
      await deleteDoc(doc(firestore, "voiceChatRooms", roomId))

      // Remove all participants from the participants collection
      const participantsCollection = collection(firestore, "voiceChatRooms", roomId, "participants")
      const participantsSnapshot = await getDocs(participantsCollection)

      const deletePromises = participantsSnapshot.docs.map((doc: DocumentSnapshot<DocumentData>) => deleteDoc(doc.ref))

      await Promise.all(deletePromises)
    } catch (error) {
      console.error("Error ending voice chat:", error)
    }
  }, [isBrowser, isFirebaseReady, db, user, roomId])

  const startVoiceChat = useCallback(async () => {
    if (!isBrowser) return

    try {
      const constraints = {
        audio: true,
        video: false,
      }

      localStream.current = await navigator.mediaDevices.getUserMedia(constraints)
    } catch (error) {
      console.error("Error starting voice chat:", error)
      toast.error("Could not access your microphone. Please check permissions.")
    }
  }, [isBrowser])

  const toggleMute = () => {
    if (!localStream.current) return

    localStream.current.getAudioTracks().forEach((track: MediaStreamTrack) => {
      track.enabled = !track.enabled
      setIsMuted(!track.enabled)
    })
  }

  const handleEndCall = () => {
    if (redirectUrl) {
      router.push(redirectUrl)
    }
  }

  const stopVoiceChat = useCallback(() => {
    if (localStream.current) {
      localStream.current.getTracks().forEach((track: MediaStreamTrack) => {
        track.stop()
      })
      localStream.current = null
    }

    // Clean up Firebase and Peer connections
    endCallProcedure()
    handleEndCall()
  }, [redirectUrl, router, endCallProcedure])

  useEffect(() => {
    // Early return if not in browser, user not logged in, or Firebase not ready
    if (!isBrowser || !user || !isFirebaseReady || !db) return

    let unsubscribe: (() => void) | undefined

      // Use an IIFE to handle the async function
      ; (async () => {
        try {
          // Use type assertion to tell TypeScript that db is definitely a Firestore instance
          const firestore = db as Firestore

          // Create or update the room document
          await setDoc(doc(firestore, "voiceChatRooms", roomId), {
            initiatorId: user.uid,
            createdAt: new Date(),
          })

          // Add the current user as a participant
          await setDoc(doc(firestore, "voiceChatRooms", roomId, "participants", user.uid), {
            id: user.uid,
            displayName: user.displayName || "Anonymous",
            photoURL: user.photoURL || "",
            joinedAt: new Date(),
          })

          // Start the voice chat
          await startVoiceChat()

          // Listen for participants
          const participantsCollection = collection(firestore, "voiceChatRooms", roomId, "participants")

          unsubscribe = onSnapshot(participantsCollection, (snapshot: QuerySnapshot<DocumentData>) => {
            const updatedParticipants = snapshot.docs.map((doc: DocumentSnapshot<DocumentData>) => doc.data() as Participant)
            setParticipants(updatedParticipants)
          })
        } catch (error) {
          console.error("Error initializing voice chat:", error)
          toast.error("Failed to initialize voice chat")
        }
      })().catch((error) => {
        console.error("Error in voice chat initialization:", error)
        toast.error("Failed to initialize voice chat")
      })

    // Cleanup function
    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
      stopVoiceChat()
    }
  }, [roomId, user, startVoiceChat, stopVoiceChat, isFirebaseReady, db, endCallProcedure])

  // Early return if not in browser
  if (!isBrowser) {
    return null
  }

  return (
    <div className="p-4 bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-lg mb-4">
      <div className="flex flex-wrap gap-4 mb-4">
        {/* Voice chat participants */}
        <div className="flex flex-wrap gap-4 w-full">
          {participants.map((participant: Participant) => (
            <div key={participant.id} className="flex items-center space-x-2 bg-gray-800 p-2 rounded-lg">
              <Avatar className="h-10 w-10">
                <AvatarImage
                  src={participant.photoURL || `/placeholder.svg?height=40&width=40`}
                  alt={participant.displayName || "User"}
                />
                <AvatarFallback>{participant.displayName?.[0] || "?"}</AvatarFallback>
              </Avatar>
              <div>
                <div className="text-sm font-medium text-white">
                  {participant.id === user?.uid ? "You" : participant.displayName}
                </div>
                <div className="text-xs text-green-400">
                  {participant.id === user?.uid && isMuted ? "Muted" : "Speaking"}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-center space-x-4">
        <Button
          variant="outline"
          size="icon"
          onClick={toggleMute}
          className={`${isMuted ? "bg-red-500 bg-opacity-30 text-red-500" : "text-white"}`}
          disabled={!isFirebaseReady || !localStream.current}
          aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
        >
          {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </Button>

        <Button
          variant="outline"
          size="icon"
          className="bg-red-500 bg-opacity-30 text-red-500"
          onClick={stopVoiceChat}
          disabled={!isFirebaseReady}
          aria-label="End call"
        >
          <PhoneOff className="h-5 w-5" />
        </Button>
      </div>
    </div>
  )
}

