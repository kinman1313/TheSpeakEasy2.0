import { io, type Socket } from "socket.io-client"

// In development, connect to localhost:3001
// In production, connect to the same URL as the app
const isDev = process.env.NODE_ENV !== "production"
const SOCKET_URL = isDev ? "http://localhost:3001" : ""

let socket: Socket | null = null

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
    })

    socket.on("disconnect", () => {
      console.log("Disconnected from signaling server")
    })

    socket.on("connect_error", (error) => {
      console.error("Connection error:", error)
    })
  }

  return socket
}

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

// Helper function to join a call room
export const joinCallRoom = (roomId: string, userId: string) => {
  const socket = getSocket()
  socket.emit("join-room", roomId, userId)
}

