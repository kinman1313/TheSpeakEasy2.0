const { createServer } = require("http")
const { parse } = require("url")
const next = require("next")
const { Server } = require("socket.io")

const dev = process.env.NODE_ENV !== "production"
// Explicitly set port 3001 for development
const port = process.env.PORT || 3001
const hostname = dev ? "localhost" : "thespeakeasy.app"
const app = next({ dev, hostname, port })
const handle = app.getRequestHandler() 

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true)
    handle(req, res, parsedUrl)
  })

  // Set up Socket.IO
  const io = new Server(server, {
    cors: {
      // Update the origin to match the client port (3001)
      origin: dev ? "http://localhost:3001" : "https://thespeakeasy.app",
      methods: ["GET", "POST"],
      credentials: true,
    },
  })

  // Store user ID to socket ID mapping
  const userSockets = new Map()
  const socketUsers = new Map()

  // Socket.IO event handlers
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id)

    // Handle user registration
    socket.on("register-user", (userId) => {
      console.log(`User ${userId} registered with socket ${socket.id}`)
      userSockets.set(userId, socket.id)
      socketUsers.set(socket.id, userId)
    })

    socket.on("signal", (data) => {
      console.log("Signal received:", data.type, "from:", data.from, "to:", data.to)
      
      // Get the target socket ID from user ID
      const targetSocketId = userSockets.get(data.to)
      if (targetSocketId) {
        // Forward the signal to the specific socket
        socket.to(targetSocketId).emit("signal", data)
        console.log(`Signal forwarded to socket ${targetSocketId}`)
      } else {
        console.log(`Target user ${data.to} not found or offline`)
        // Optionally send error back to sender
        socket.emit("signal-error", { 
          error: "Target user not found or offline", 
          targetUserId: data.to 
        })
      }
    })

    // Join a room (for call signaling)
    socket.on("join-room", (roomId, userId) => {
      console.log(`User ${userId} joined room ${roomId}`)
      socket.join(roomId)
      
      // Update user mapping
      userSockets.set(userId, socket.id)
      socketUsers.set(socket.id, userId)
      
      // Notify others in the room
      socket.to(roomId).emit("user-connected", userId)

      socket.on("disconnect", () => {
        console.log(`User ${userId} left room ${roomId}`)
        socket.to(roomId).emit("user-disconnected", userId)
      })
    })

    // Handle call-specific events
    socket.on("call-user", (data) => {
      const { targetUserId, callerUserId, callerName, isVideo } = data
      const targetSocketId = userSockets.get(targetUserId)
      
      if (targetSocketId) {
        socket.to(targetSocketId).emit("incoming-call", {
          callerUserId,
          callerName,
          isVideo,
          timestamp: Date.now()
        })
        console.log(`Call initiated from ${callerUserId} to ${targetUserId}`)
      } else {
        socket.emit("call-error", { error: "User not available", targetUserId })
      }
    })

    socket.on("call-answer", (data) => {
      const { callerUserId, answer } = data
      const callerSocketId = userSockets.get(callerUserId)
      
      if (callerSocketId) {
        socket.to(callerSocketId).emit("call-answered", { answer })
      }
    })

    socket.on("call-decline", (data) => {
      const { callerUserId } = data
      const callerSocketId = userSockets.get(callerUserId)
      
      if (callerSocketId) {
        socket.to(callerSocketId).emit("call-declined")
      }
    })

    socket.on("call-end", (data) => {
      const { targetUserId } = data
      const targetSocketId = userSockets.get(targetUserId)
      
      if (targetSocketId) {
        socket.to(targetSocketId).emit("call-ended")
      }
    })

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id)
      
      // Clean up user mappings
      const userId = socketUsers.get(socket.id)
      if (userId) {
        userSockets.delete(userId)
        socketUsers.delete(socket.id)
        console.log(`Cleaned up mapping for user ${userId}`)
      }
    })
  })

  // Explicitly bind to the port
  server.listen(port, hostname, () => {
    console.log(`> Ready on http://${hostname}:${port}`)
    console.log(`> Mode: ${dev ? "development" : "production"}`)
    console.log(`> Socket.IO server running on port ${port}`)
  })
})

