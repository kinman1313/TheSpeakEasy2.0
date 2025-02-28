"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Mic, MicOff, PhoneOff } from "lucide-react"
import { useAuth } from "./AuthProvider"
import { db } from "@/lib/firebase"
import { collection, doc, onSnapshot, setDoc, deleteDoc, getDocs } from "firebase/firestore"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "sonner" // Changed from useToast

export function VoiceChat({ roomId, onEnd }) {
  const { user } = useAuth()
  const [isMuted, setIsMuted] = useState(false)
  const [participants, setParticipants] = useState([])
  const peerConnections = useRef({})
  const localStream = useRef(null)

  // Rest of the component remains the same until the toast calls

  const startVoiceChat = useCallback(async () => {
    try {
      const constraints = {
        audio: true,
        video: false,
      }

      localStream.current = await navigator.mediaDevices.getUserMedia(constraints)
    } catch (error) {
      console.error("Error starting voice chat:", error)
      toast.error("Could not access your microphone. Please check permissions.") // Updated toast
    }
  }, [])

  const toggleMute = () => {
    if (localStream.current) {
      localStream.current.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled
        setIsMuted(!track.enabled)
      })
    }
  }

  const stopVoiceChat = useCallback(() => {
    if (localStream.current) {
      localStream.current.getTracks().forEach((track) => {
        track.stop()
      })
      localStream.current = null
    }

    // Clean up Firebase and Peer connections
    endCallProcedure()
    onEnd()
  }, [onEnd])

  const endCallProcedure = async () => {
    // Clean up Firebase and Peer connections
    try {
      // Remove the room document
      await deleteDoc(doc(db, "voiceChatRooms", roomId))

      // Remove all participants from the participants collection
      const participantsCollection = collection(db, "voiceChatRooms", roomId, "participants")
      const participantsSnapshot = await getDocs(participantsCollection)
      participantsSnapshot.forEach(async (doc) => {
        await deleteDoc(doc.ref)
      })
    } catch (error) {
      console.error("Error ending voice chat:", error)
    }
  }

  useEffect(() => {
    let unsubscribe

    const initializeVoiceChat = async () => {
      try {
        await setDoc(doc(db, "voiceChatRooms", roomId), {
          initiatorId: user.uid,
          createdAt: new Date(),
        })

        await setDoc(doc(db, "voiceChatRooms", roomId, "participants", user.uid), {
          id: user.uid,
          displayName: user.displayName,
          photoURL: user.photoURL,
          joinedAt: new Date(),
        })

        startVoiceChat()

        const participantsCollection = collection(db, "voiceChatRooms", roomId, "participants")

        unsubscribe = onSnapshot(participantsCollection, (snapshot) => {
          const updatedParticipants = snapshot.docs.map((doc) => doc.data())
          setParticipants(updatedParticipants)
        })
      } catch (error) {
        console.error("Error initializing voice chat:", error)
      }
    }

    initializeVoiceChat()

    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
      stopVoiceChat()
    }
  }, [roomId, user, startVoiceChat, stopVoiceChat])

  // Rest of the component implementation remains exactly the same
  // Only the toast implementation needed to be updated

  return (
    <div className="p-4 bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-lg mb-4">
      <div className="flex flex-wrap gap-4 mb-4">
        {/* Voice chat participants */}
        <div className="flex flex-wrap gap-4 w-full">
          {participants.map((participant) => (
            <div key={participant.id} className="flex items-center space-x-2 bg-gray-800 p-2 rounded-lg">
              <Avatar className="h-10 w-10">
                <AvatarImage src={participant.photoURL || `/placeholder.svg?height=40&width=40`} />
                <AvatarFallback>{participant.displayName?.[0] || "?"}</AvatarFallback>
              </Avatar>
              <div>
                <div className="text-sm font-medium text-neon-white">
                  {participant.id === user.uid ? "You" : participant.displayName}
                </div>
                <div className="text-xs text-neon-green">
                  {participant.id === user.uid && isMuted ? "Muted" : "Speaking"}
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
          className={`${isMuted ? "bg-neon-red bg-opacity-30 text-neon-red" : "text-neon-white"}`}
        >
          {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </Button>

        <Button
          variant="outline"
          size="icon"
          className="bg-neon-red bg-opacity-30 text-neon-red"
          onClick={stopVoiceChat}
        >
          <PhoneOff className="h-5 w-5" />
        </Button>
      </div>
    </div>
  )
}

