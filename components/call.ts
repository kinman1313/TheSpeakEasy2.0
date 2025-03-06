import type { Socket } from "socket.io-client"

export interface Participant {
  id: string
  displayName: string | null
  photoURL: string | null
  joinedAt: Date
  stream?: MediaStream
  isMuted?: boolean
  isVideoEnabled?: boolean
  createdAt?: Date
}

export interface CallControlsProps {
  isVideo: boolean
  roomId: string
  onEnd: () => void
  socket: Socket // Added Socket.IO socket
}

export interface SignalData {
  type: "offer" | "answer" | "ice-candidate"
  from: string
  to: string
  offer?: RTCSessionDescriptionInit
  answer?: RTCSessionDescriptionInit
  candidate?: RTCIceCandidateInit
  timestamp?: Date
}

export interface PeerConnectionData {
  peerConnection: RTCPeerConnection
  offerCandidates?: any // Firestore collection reference
  answerCandidates?: any // Firestore collection reference
}

export interface CallData {
  creatorId: string
  createdAt: Date
  offer?: RTCSessionDescriptionInit
  answer?: RTCSessionDescriptionInit
}

