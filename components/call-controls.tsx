"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Mic, MicOff, Video, VideoOff, PhoneOff, ScreenShare, MonitorOff } from 'lucide-react'
import { useAuth } from "@/components/auth/AuthProvider"
import { db } from "@/lib/firebase"
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  updateDoc,
  getDoc,
  getDocs,
  type DocumentData,
  type QuerySnapshot,
  type Firestore,
} from "firebase/firestore"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "sonner"
import type { Participant, PeerConnectionData, SignalData } from "@/components/types/call"
import { getSocket, joinCallRoom } from "@/lib/socket"
import { useRouter } from "next/navigation"

interface CallData {
  creatorId: string
  createdAt: Date
}

// Update the props interface to use redirectUrl instead of onEnd function
interface CallControlsProps {
  isVideo: boolean;
  roomId: string;
  redirectUrl?: string; // URL to redirect to after call ends
}

export function CallControls({ isVideo, roomId, redirectUrl = "/" }: CallControlsProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [isMuted, setIsMuted] = useState<boolean>(false)
  const [isVideoEnabled, setIsVideoEnabled] = useState<boolean>(isVideo)
  const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false)
  const [participants, setParticipants] = useState<Participant[]>([])
  const socket = getSocket()

  // Check if we're in the browser and Firebase is initialized
  const isBrowser = typeof window !== 'undefined';
  const isFirebaseReady = isBrowser && !!db;

  // Refs for video elements
  const localVideoRef = useRef<HTMLVideoElement | null>(null)
  const screenShareRef = useRef<HTMLVideoElement | null>(null)

  // Refs for WebRTC connections and streams
  const peerConnections = useRef<Record<string, PeerConnectionData>>({})
  const localStream = useRef<MediaStream | null>(null)
  const screenStream = useRef<MediaStream | null>(null)
  const remoteStreams = useRef<Record<string, MediaStream>>({})

  // Initialize Socket.IO event listeners
  useEffect(() => {
    if (!user) return

    // Join the call room
    joinCallRoom(roomId, user.uid)

    // Listen for signaling events
    socket.on("signal", handleSignal)
    socket.on("user-connected", handleUserConnected)
    socket.on("user-disconnected", handleUserDisconnected)

    return () => {
      socket.off("signal", handleSignal)
      socket.off("user-connected", handleUserConnected)
      socket.off("user-disconnected", handleUserDisconnected)
    }
  }, [roomId, user, socket])

  // Handle incoming signals
  const handleSignal = async (signal: SignalData) => {
    if (!user || signal.to !== user.uid) return

    try {
      const peerConnection = peerConnections.current[signal.from]?.peerConnection
      if (!peerConnection) {
        console.error("No peer connection found for", signal.from)
        return
      }

      if (signal.type === "offer") {
        // Add a type guard to check if signal.offer exists
        if (!signal.offer) {
          console.error("Received offer signal without offer data")
          return
        }

        await peerConnection.setRemoteDescription(new RTCSessionDescription(signal.offer))
        const answer = await peerConnection.createAnswer()
        await peerConnection.setLocalDescription(answer)

        // Send answer back
        sendSignal({
          type: "answer",
          answer,
          from: user.uid,
          to: signal.from,
        })
      } else if (signal.type === "answer") {
        // Add a type guard for answer
        if (!signal.answer) {
          console.error("Received answer signal without answer data")
          return
        }

        await peerConnection.setRemoteDescription(new RTCSessionDescription(signal.answer))
      } else if (signal.type === "ice-candidate") {
        // Add a type guard for candidate
        if (!signal.candidate) {
          console.error("Received ice-candidate signal without candidate data")
          return
        }

        await peerConnection.addIceCandidate(new RTCIceCandidate(signal.candidate))
      }
    } catch (error) {
      console.error("Error handling signal:", error)
    }
  }

  // Handle user connected event
  const handleUserConnected = (userId: string) => {
    console.log(`User ${userId} connected`)
    toast.success(`User ${userId} connected`)
  }

  // Handle user disconnected event
  const handleUserDisconnected = (userId: string) => {
    console.log(`User ${userId} disconnected`)
    toast.error(`User ${userId} disconnected`)
  }

  // Send signal through Socket.IO
  const sendSignal = (signal: SignalData) => {
    if (!socket) return
    socket.emit("signal", signal)
  }

  // Initialize media devices
  useEffect(() => {
    const initializeMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: isVideo,
          audio: true,
        })

        localStream.current = stream
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream
        }
      } catch (error) {
        console.error("Error accessing media devices:", error)
        toast.error("Failed to access media devices. Please check your permissions.")
      }
    }

    initializeMedia()

    return () => {
      if (localStream.current) {
        localStream.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [isVideo])

  // Subscribe to participants
  useEffect(() => {
    // Skip if Firebase is not initialized
    if (!isFirebaseReady || !db) return;

    // Use type assertion to tell TypeScript that db is definitely a Firestore instance
    const firestore = db as Firestore;

    const callDocRef = doc(firestore, "calls", roomId);
    const participantsCollection = collection(callDocRef, "participants");

    const unsubscribe = onSnapshot(participantsCollection, (snapshot: QuerySnapshot<DocumentData>) => {
      const updatedParticipants = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Participant[]
      setParticipants(updatedParticipants)

      // Create peer connections for new participants
      updatedParticipants.forEach((participant) => {
        if (participant.id !== user?.uid && !peerConnections.current[participant.id]) {
          createPeerConnection(participant.id)
        }
      })
    })

    return () => unsubscribe()
  }, [roomId, user?.uid, isFirebaseReady, db])

  // Create a peer connection for a participant
  const createPeerConnection = (participantId: string) => {
    if (!user || !localStream.current) return

    const peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.stunprotocol.org" }],
    })

    // Add local tracks
    localStream.current.getTracks().forEach((track) => {
      peerConnection.addTrack(track, localStream.current!)
    })

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal({
          type: "ice-candidate",
          candidate: event.candidate.toJSON(),
          from: user.uid,
          to: participantId,
        })
      }
    }

    // Handle incoming tracks
    peerConnection.ontrack = (event: RTCTrackEvent) => {
      if (!event.streams?.length) return

      const stream = event.streams[0]

      if (!remoteStreams.current[participantId]) {
        remoteStreams.current[participantId] = stream
        setParticipants((prev) => prev.map((p) => (p.id === participantId ? { ...p, stream } : p)))
      }
    }

    // Store the peer connection
    peerConnections.current[participantId] = { peerConnection }

    // Create and send offer
    peerConnection
      .createOffer()
      .then((offer) => peerConnection.setLocalDescription(offer))
      .then(() => {
        sendSignal({
          type: "offer",
          offer: peerConnection.localDescription?.toJSON(),
          from: user.uid,
          to: participantId,
        })
      })
      .catch((error) => {
        console.error("Error creating offer:", error)
      })

    return peerConnection
  }

  // Initialize peer connections
  useEffect(() => {
    // Skip if Firebase is not initialized
    if (!user || !localStream.current || !isFirebaseReady || !db) return

    const initializePeerConnection = async () => {
      // Use type assertion to tell TypeScript that db is definitely a Firestore instance
      const firestore = db as Firestore;

      const callDocRef = doc(firestore, "calls", roomId);
      const callDoc = await getDoc(callDocRef);

      if (!callDoc.exists()) {
        const callData: CallData = {
          creatorId: user.uid,
          createdAt: new Date(),
        }
        await setDoc(callDocRef, callData)
      }

      const participantsCollection = collection(callDocRef, "participants")
      const userDocRef = doc(participantsCollection, user.uid)

      const participantData: Participant = {
        id: user.uid,
        displayName: user.displayName,
        photoURL: user.photoURL,
        joinedAt: new Date(),
        isMuted,
        isVideoEnabled,
      }
      await setDoc(userDocRef, participantData)
    }

    initializePeerConnection()
  }, [roomId, user, isMuted, isVideoEnabled, isFirebaseReady, db])

  // Handle media controls
  const toggleMute = async () => {
    if (!localStream.current) return

    const audioTracks = localStream.current.getAudioTracks()
    const newMutedState = !isMuted

    audioTracks.forEach((track) => {
      track.enabled = !newMutedState
    })

    setIsMuted(newMutedState)

    if (user && isFirebaseReady && db) {
      // Use type assertion to tell TypeScript that db is definitely a Firestore instance
      const firestore = db as Firestore;

      const callDocRef = doc(firestore, "calls", roomId);
      const participantsCollection = collection(callDocRef, "participants");
      const userDocRef = doc(participantsCollection, user.uid);
      await updateDoc(userDocRef, { isMuted: newMutedState });
    }
  }

  const toggleVideo = async () => {
    if (!localStream.current) return

    const videoTracks = localStream.current.getVideoTracks()
    const newVideoState = !isVideoEnabled

    videoTracks.forEach((track) => {
      track.enabled = newVideoState
    })

    setIsVideoEnabled(newVideoState)

    if (user && isFirebaseReady && db) {
      // Use type assertion to tell TypeScript that db is definitely a Firestore instance
      const firestore = db as Firestore;

      const callDocRef = doc(firestore, "calls", roomId);
      const participantsCollection = collection(callDocRef, "participants");
      const userDocRef = doc(participantsCollection, user.uid);
      await updateDoc(userDocRef, { isVideoEnabled: newVideoState });
    }
  }

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      await stopScreenShare()
    } else {
      await startScreenShare()
    }
  }

  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      })

      screenStream.current = stream

      if (screenShareRef.current) {
        screenShareRef.current.srcObject = stream
      }

      // Replace video track in all peer connections
      Object.values(peerConnections.current).forEach(({ peerConnection }) => {
        const [videoTrack] = stream.getVideoTracks()
        const sender = peerConnection.getSenders().find((s) => s.track?.kind === "video")

        if (sender && videoTrack) {
          sender.replaceTrack(videoTrack)
        }
      })

      stream.getVideoTracks()[0].onended = () => {
        stopScreenShare()
      }

      setIsScreenSharing(true)
    } catch (error) {
      console.error("Error starting screen share:", error)
      toast.error("Failed to start screen sharing")
    }
  }

  const stopScreenShare = async () => {
    if (!screenStream.current) return

    screenStream.current.getTracks().forEach((track) => track.stop())
    screenStream.current = null

    if (screenShareRef.current) {
      screenShareRef.current.srcObject = null
    }

    // Restore video tracks
    if (localStream.current) {
      Object.values(peerConnections.current).forEach(({ peerConnection }) => {
        const [videoTrack] = localStream.current!.getVideoTracks()
        const sender = peerConnection.getSenders().find((s) => s.track?.kind === "video")

        if (sender && videoTrack) {
          sender.replaceTrack(videoTrack)
        }
      })
    }

    setIsScreenSharing(false)
  }

  // Handle call end
  const handleEndCall = async () => {
    try {
      if (user && isFirebaseReady && db) {
        // Use type assertion to tell TypeScript that db is definitely a Firestore instance
        const firestore = db as Firestore;

        const callDocRef = doc(firestore, "calls", roomId);
        const participantsCollection = collection(callDocRef, "participants");
        const userDocRef = doc(participantsCollection, user.uid);

        await deleteDoc(userDocRef);
        await deleteCallIfEmpty(roomId);
      }

      // Clean up media
      if (localStream.current) {
        localStream.current.getTracks().forEach((track) => track.stop())
      }
      if (screenStream.current) {
        screenStream.current.getTracks().forEach((track) => track.stop())
      }

      // Close peer connections
      Object.values(peerConnections.current).forEach(({ peerConnection }) => {
        peerConnection.close()
      })

      // Use router to navigate to the redirect URL instead of calling onEnd
      router.push(redirectUrl);
    } catch (error) {
      console.error("Error ending call:", error)
      toast.error("Failed to end call properly")
    }
  }

  // @ts-ignore - Function intended for future use
  const _handleParticipantLeft = async (participantId: string) => {
    try {
      if (isFirebaseReady && db) {
        // Use type assertion to tell TypeScript that db is definitely a Firestore instance
        const firestore = db as Firestore;

        const callDocRef = doc(firestore, "calls", roomId);
        const participantsCollection = collection(callDocRef, "participants");
        const participantDocRef = doc(participantsCollection, participantId);

        await deleteDoc(participantDocRef);
        await deleteCallIfEmpty(roomId);
      }

      // Clean up participant's peer connection
      if (peerConnections.current[participantId]) {
        peerConnections.current[participantId].peerConnection.close()
        delete peerConnections.current[participantId]
      }

      // Clean up participant's stream
      if (remoteStreams.current[participantId]) {
        remoteStreams.current[participantId].getTracks().forEach((track) => track.stop())
        delete remoteStreams.current[participantId]
      }

      setParticipants((prev) => prev.filter((p) => p.id !== participantId))
    } catch (error) {
      console.error("Error handling participant left:", error)
      toast.error("Error removing participant from call")
    }
  }

  const deleteCallIfEmpty = async (roomId: string) => {
    if (!isFirebaseReady || !db) return;

    // Use type assertion to tell TypeScript that db is definitely a Firestore instance
    const firestore = db as Firestore;

    const callDocRef = doc(firestore, "calls", roomId);
    const participantsCollection = collection(callDocRef, "participants");
    const snapshot = await getDocs(participantsCollection);

    if (snapshot.empty) {
      await deleteDoc(callDocRef);
    }
  }

  // Early return if not in browser
  if (!isBrowser) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-sm border-t">
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="grid grid-cols-2 gap-4">
          {/* Local video */}
          <video ref={localVideoRef} autoPlay playsInline muted className="w-64 h-48 rounded-lg bg-muted" />

          {/* Screen share */}
          {isScreenSharing && (
            <video ref={screenShareRef} autoPlay playsInline muted className="w-64 h-48 rounded-lg bg-muted" />
          )}

          {/* Remote participants */}
          {participants
            .filter((p) => p.id !== user?.uid)
            .map((participant) => (
              <div key={participant.id} className="flex flex-col items-center">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={participant.photoURL || ""} />
                  <AvatarFallback>{participant.displayName?.[0] || "?"}</AvatarFallback>
                </Avatar>
                <p className="text-sm mt-2">{participant.displayName || "Anonymous"}</p>
                {participant.stream && (
                  <video
                    autoPlay
                    playsInline
                    ref={(el) => {
                      if (el && participant.stream) el.srcObject = participant.stream
                    }}
                    className="w-64 h-48 rounded-lg bg-muted"
                  />
                )}
              </div>
            ))}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 mt-4">
          <Button
            variant="outline"
            size="icon"
            onClick={toggleMute}
            className={isMuted ? "bg-destructive/20 text-destructive" : ""}
          >
            {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </Button>

          {isVideo && (
            <Button
              variant="outline"
              size="icon"
              onClick={toggleVideo}
              className={!isVideoEnabled ? "bg-destructive/20 text-destructive" : ""}
            >
              {!isVideoEnabled ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
            </Button>
          )}

          <Button
            variant="outline"
            size="icon"
            onClick={toggleScreenShare}
            className={isScreenSharing ? "bg-primary/20 text-primary" : ""}
          >
            {isScreenSharing ? <MonitorOff className="h-5 w-5" /> : <ScreenShare className="h-5 w-5" />}
          </Button>

          <Button variant="destructive" size="icon" onClick={handleEndCall}>
            <PhoneOff className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  )
}