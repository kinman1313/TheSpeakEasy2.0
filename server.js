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

app.listen(port, () => {
  console.log(`App listening on port: ${port}`);
});

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

  // Socket.IO event handlers
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id)

    socket.on("signal", (data) => {
      console.log("Signal received:", data.type, "from:", data.from, "to:", data.to)
      // Forward the signal to the recipient
      socket.to(data.to).emit("signal", data)
    })

    // Join a room (for call signaling)
    socket.on("join-room", (roomId, userId) => {
      console.log(`User ${userId} joined room ${roomId}`)
      socket.join(roomId)
      // Notify others in the room
      socket.to(roomId).emit("user-connected", userId)

      socket.on("disconnect", () => {
        console.log(`User ${userId} left room ${roomId}`)
        socket.to(roomId).emit("user-disconnected", userId)
      })
    })

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id)
    })
  })

  // Explicitly bind to the port
  server.listen(port, hostname, () => {
    console.log(`> Ready on http://${hostname}:${port}`)
    console.log(`> Mode: ${dev ? "development" : "production"}`)
    console.log(`> Socket.IO server running on port ${port}`)
  })
})

