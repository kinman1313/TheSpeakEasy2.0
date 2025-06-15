import { io, type Socket } from "socket.io-client"

// Type definitions for socket events
interface SignalErrorData {
  error: string
  targetUserId: string
}

// In development, connect to localhost:3001
// In production, connect to the same URL as the app
const isDev = process.env.NODE_ENV !== "production"
const SOCKET_URL = isDev ? "http://localhost:3001" : ""

let socket: Socket | null = null
let currentUserId: string | null = null

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })

    socket.on("connect", () => {
      console.log("Connected to signaling server")
      
      // Re-register user if we have a userId
      if (currentUserId) {
        socket!.emit("register-user", currentUserId)
      }
    })

    socket.on("disconnect", () => {
      console.log("Disconnected from signaling server")
    })

    socket.on("connect_error", (error) => {
      console.error("Connection error:", error)
    })

    socket.on("signal-error", (data: SignalErrorData) => {
      console.error("Signal error:", data)
    })
  }

  return socket
}

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect()
    socket = null
    currentUserId = null
  }
}

// Register user with the socket server
export const registerUser = (userId: string) => {
  currentUserId = userId
  const socket = getSocket()
  socket.emit("register-user", userId)
  console.log(`User ${userId} registered with socket server`)
}

// Helper function to join a call room
export const joinCallRoom = (roomId: string, userId: string) => {
  const socket = getSocket()
  socket.emit("join-room", roomId, userId)
}

// Call-specific socket functions
export const initiateSocketCall = (targetUserId: string, callerUserId: string, callerName: string, isVideo: boolean = false) => {
  const socket = getSocket()
  socket.emit("call-user", {
    targetUserId,
    callerUserId,
    callerName,
    isVideo
  })
}

export const answerSocketCall = (callerUserId: string, answer: RTCSessionDescriptionInit) => {
  const socket = getSocket()
  socket.emit("call-answer", {
    callerUserId,
    answer
  })
}

export const declineSocketCall = (callerUserId: string) => {
  const socket = getSocket()
  socket.emit("call-decline", {
    callerUserId
  })
}

export const endSocketCall = (targetUserId: string) => {
  const socket = getSocket()
  socket.emit("call-end", {
    targetUserId
  })
}

