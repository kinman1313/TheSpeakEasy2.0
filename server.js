const { createServer } = require("http")
const { parse } = require("url")
const next = require("next")
const { Server } = require("socket.io")

const dev = process.env.NODE_ENV !== "production"
const port = process.env.PORT || 3001
const hostname = dev ? "localhost" : undefined
const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true)
    handle(req, res, parsedUrl)
  })

  // Enhanced Socket.IO setup with proper user mapping
  const io = new Server(server, {
    cors: {
      origin: dev ? "http://localhost:3001" : [
        "https://thespeakeasy2-0.onrender.com",
        "https://thespeakeasy.app"
      ],
      methods: ["GET", "POST"],
      credentials: true,
    },
  })

  // Enhanced user mapping with proper cleanup
  const userSockets = new Map()
  const socketUsers = new Map()
  const activeCallRooms = new Map()

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id)

    // Enhanced user registration
    socket.on("register-user", (userId) => {
      console.log(`User ${userId} registered with socket ${socket.id}`)
      
      // Clean up any existing mappings
      const oldSocketId = userSockets.get(userId)
      if (oldSocketId && oldSocketId !== socket.id) {
        socketUsers.delete(oldSocketId)
      }
      
      userSockets.set(userId, socket.id)
      socketUsers.set(socket.id, userId)
      
      // Notify user registration success
      socket.emit("registration-success", { userId, socketId: socket.id })
    })

    // Enhanced signaling with proper error handling
    socket.on("signal", (data) => {
      console.log("Signal received:", data.type, "from:", data.from, "to:", data.to)
      
      const targetSocketId = userSockets.get(data.to)
      if (targetSocketId) {
        socket.to(targetSocketId).emit("signal", data)
        console.log(`Signal forwarded to socket ${targetSocketId}`)
      } else {
        console.log(`Target user ${data.to} not found or offline`)
        socket.emit("signal-error", { 
          error: "Target user not found or offline", 
          targetUserId: data.to 
        })
      }
    })

    // Enhanced call room management
    socket.on("join-room", (roomId, userId) => {
      console.log(`User ${userId} joined room ${roomId}`)
      socket.join(roomId)
      
      // Track active calls
      if (!activeCallRooms.has(roomId)) {
        activeCallRooms.set(roomId, new Set())
      }
      activeCallRooms.get(roomId).add(userId)
      
      // Update user mapping
      userSockets.set(userId, socket.id)
      socketUsers.set(socket.id, userId)
      
      // Notify others in the room
      socket.to(roomId).emit("user-connected", userId)
    })

    // Enhanced call-specific events
    socket.on("call-user", (data) => {
      const { targetUserId, callerUserId, callerName, isVideo } = data
      const targetSocketId = userSockets.get(targetUserId)
      
      if (targetSocketId) {
        io.to(targetSocketId).emit("incoming-call", {
          callerUserId,
          callerName,
          isVideo,
          timestamp: Date.now()
        })
        console.log(`Call initiated from ${callerUserId} to ${targetUserId}`)
      } else {
        socket.emit("call-error", { 
          error: "User not available", 
          targetUserId 
        })
      }
    })

    socket.on("call-answer", (data) => {
      const { callerUserId, answer } = data
      const callerSocketId = userSockets.get(callerUserId)
      
      if (callerSocketId) {
        io.to(callerSocketId).emit("call-answered", { answer })
      }
    })

    socket.on("call-decline", (data) => {
      const { callerUserId } = data
      const callerSocketId = userSockets.get(callerUserId)
      
      if (callerSocketId) {
        io.to(callerSocketId).emit("call-declined")
      }
    })

    socket.on("call-end", (data) => {
      const { targetUserId } = data
      const targetSocketId = userSockets.get(targetUserId)
      
      if (targetSocketId) {
        io.to(targetSocketId).emit("call-ended")
      }
    })

    // Enhanced disconnect handling
    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id)
      
      const userId = socketUsers.get(socket.id)
      if (userId) {
        userSockets.delete(userId)
        socketUsers.delete(socket.id)
        
        // Clean up from active call rooms
        activeCallRooms.forEach((users, roomId) => {
          if (users.has(userId)) {
            users.delete(userId)
            socket.to(roomId).emit("user-disconnected", userId)
            
            if (users.size === 0) {
              activeCallRooms.delete(roomId)
            }
          }
        })
        
        console.log(`Cleaned up mapping for user ${userId}`)
      }
    })
  })

  // Server listening
  if (dev) {
    server.listen(port, hostname, () => {
      console.log(`> Ready on http://${hostname}:${port}`)
      console.log(`> Socket.IO server running with enhanced calling support`)
    })
  } else {
    server.listen(port, () => {
      console.log(`> Ready on port ${port}`)
      console.log(`> Socket.IO server running with enhanced calling support`)
    })
  }
})