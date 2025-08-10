const { createServer } = require('http');
const { parse } = require('url');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;
const socketPort = process.env.SOCKET_PORT || 3001;

let app;
let handle;

if (process.env.TEST_MODE) {
  app = {
    prepare: () => Promise.resolve(),
    getRequestHandler: () => (req, res) => res.end()
  };
  handle = app.getRequestHandler();
} else {
  const next = require('next');
  app = next({ dev, hostname, port });
  handle = app.getRequestHandler();
}

// Enhanced user mapping for calling functionality
const userSockets = new Map(); // userId -> socketId
const socketUsers = new Map(); // socketId -> userInfo
const activeCallRooms = new Map(); // roomId -> Set of userIds

const getCallRoomId = (id1, id2) => [id1, id2].sort().join('-');

const serverReady = app.prepare().then(() => {
  return new Promise((resolve, reject) => {
    // Main Next.js server
    const server = createServer(async (req, res) => {
      try {
        const parsedUrl = parse(req.url, true);
        await handle(req, res, parsedUrl);
      } catch (err) {
        console.error('Error occurred handling', req.url, err);
        res.statusCode = 500;
        res.end('internal server error');
      }
    });

    // Socket.IO server for real-time features
    const io = new Server(server, {
      cors: {
        origin: dev ? "http://localhost:3000" : "*",
        methods: ["GET", "POST"]
      },
      transports: ['websocket', 'polling']
    });

    io.on('connection', (socket) => {
      console.log('🔌 New socket connection:', socket.id);

    // Enhanced user registration with proper mapping
    socket.on('register-user', (userData) => {
      try {
        const { userId, userName, photoURL } = userData;
        
        // Remove any existing mapping for this user
        if (userSockets.has(userId)) {
          const oldSocketId = userSockets.get(userId);
          socketUsers.delete(oldSocketId);
        }
        
        // Create new mapping
        userSockets.set(userId, socket.id);
        socketUsers.set(socket.id, { userId, userName, photoURL });
        
        socket.userId = userId;
        socket.userName = userName;
        
        console.log(`✅ User registered: ${userName} (${userId}) -> ${socket.id}`);
        
        // Notify about online users
        io.emit('user-online', { userId, userName, photoURL });
        
        // Send current online users to the newly connected user
        const onlineUsers = Array.from(socketUsers.values());
        socket.emit('online-users', onlineUsers);
        
      } catch (error) {
        console.error('❌ Error registering user:', error);
        socket.emit('error', { message: 'Failed to register user' });
      }
    });

    // Enhanced signaling for video calls
    socket.on('signal', (data) => {
      try {
        const { targetUserId, signal, type, callerName } = data;
        const targetSocketId = userSockets.get(targetUserId);
        
        if (targetSocketId) {
          const senderInfo = socketUsers.get(socket.id);
          io.to(targetSocketId).emit('signal', {
            signal,
            type,
            senderId: senderInfo?.userId,
            senderName: callerName || senderInfo?.userName,
            targetSocketId: socket.id
          });
          console.log(`📡 Signal sent: ${type} from ${senderInfo?.userName} to ${targetUserId}`);
        } else {
          console.log(`❌ Target user ${targetUserId} not found or offline`);
          socket.emit('call-error', { 
            message: 'User is not online or not found',
            targetUserId 
          });
        }
      } catch (error) {
        console.error('❌ Error handling signal:', error);
        socket.emit('error', { message: 'Failed to send signal' });
      }
    });

    // Enhanced call management
    socket.on('call-user', (data) => {
      try {
        const { targetUserId, offer, callerName, isVideo = true } = data;
        const targetSocketId = userSockets.get(targetUserId);
        
        if (targetSocketId) {
          const senderInfo = socketUsers.get(socket.id);
          io.to(targetSocketId).emit('incoming-call', {
            offer,
            callerId: senderInfo?.userId,
            callerName: callerName || senderInfo?.userName,
            callerSocketId: socket.id,
            isVideo
          });
          console.log(`📞 Call initiated: ${senderInfo?.userName} -> ${targetUserId} (${isVideo ? 'Video' : 'Audio'})`);
        } else {
          socket.emit('call-error', { 
            message: 'User is not available',
            targetUserId 
          });
        }
      } catch (error) {
        console.error('❌ Error handling call:', error);
        socket.emit('error', { message: 'Failed to initiate call' });
      }
    });

    socket.on('call-answer', (data) => {
      try {
        const { callerSocketId, answer } = data;
        const responderInfo = socketUsers.get(socket.id);
        const callerInfo = socketUsers.get(callerSocketId);

        const roomId = getCallRoomId(responderInfo?.userId, callerInfo?.userId);

        socket.join(roomId);
        io.sockets.sockets.get(callerSocketId)?.join(roomId);
        activeCallRooms.set(roomId, new Set([responderInfo?.userId, callerInfo?.userId]));

        io.to(callerSocketId).emit('call-answered', {
          answer,
          responderId: responderInfo?.userId,
          responderName: responderInfo?.userName,
          roomId
        });
        console.log(`✅ Call answered by ${responderInfo?.userName}`);
      } catch (error) {
        console.error('❌ Error handling call answer:', error);
      }
    });

    socket.on('call-decline', (data) => {
      try {
        const { callerSocketId } = data;
        const responderInfo = socketUsers.get(socket.id);
        
        io.to(callerSocketId).emit('call-declined', {
          responderId: responderInfo?.userId,
          responderName: responderInfo?.userName
        });
        console.log(`❌ Call declined by ${responderInfo?.userName}`);
      } catch (error) {
        console.error('❌ Error handling call decline:', error);
      }
    });

    socket.on('call-end', (data) => {
      try {
        const { targetSocketId } = data;
        const senderInfo = socketUsers.get(socket.id);
        const targetInfo = socketUsers.get(targetSocketId);

        if (targetSocketId) {
          io.to(targetSocketId).emit('call-ended', {
            endedBy: senderInfo?.userId,
            endedByName: senderInfo?.userName
          });
        }

        const roomId = senderInfo && targetInfo
          ? getCallRoomId(senderInfo.userId, targetInfo.userId)
          : null;

        if (roomId && activeCallRooms.has(roomId)) {
          const participants = activeCallRooms.get(roomId);
          participants.delete(senderInfo.userId);
          participants.delete(targetInfo.userId);
          if (participants.size === 0) {
            activeCallRooms.delete(roomId);
          } else {
            activeCallRooms.set(roomId, participants);
          }
          socket.leave(roomId);
        }

        console.log(`📵 Call ended by ${senderInfo?.userName}`);
      } catch (error) {
        console.error('❌ Error handling call end:', error);
      }
    });

    // Chat message handling
    socket.on('send-message', (messageData) => {
      try {
        socket.broadcast.emit('receive-message', messageData);
        console.log(`💬 Message sent by ${messageData.userName}: ${messageData.text?.substring(0, 50)}...`);
      } catch (error) {
        console.error('❌ Error handling message:', error);
      }
    });

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      try {
        const userInfo = socketUsers.get(socket.id);
        
        if (userInfo) {
          const { userId, userName } = userInfo;
          
          // Clean up mappings
          userSockets.delete(userId);
          socketUsers.delete(socket.id);
          
          // Notify others that user went offline
          socket.broadcast.emit('user-offline', { userId, userName });
          
          console.log(`🔌 User disconnected: ${userName} (${userId}) - Reason: ${reason}`);
        } else {
          console.log(`🔌 Anonymous socket disconnected: ${socket.id} - Reason: ${reason}`);
        }
      } catch (error) {
        console.error('❌ Error handling disconnect:', error);
      }
    });

    // ICE candidate exchange
    socket.on('ice-candidate', (data) => {
      try {
        const { targetUserId, candidate } = data;
        const targetSocketId = userSockets.get(targetUserId);
        
        if (targetSocketId) {
          const senderInfo = socketUsers.get(socket.id);
          io.to(targetSocketId).emit('ice-candidate', {
            candidate,
            senderId: senderInfo?.userId
          });
        }
      } catch (error) {
        console.error('❌ Error handling ICE candidate:', error);
      }
    });
    });

    server.listen(port, (err) => {
      if (err) {
        reject(err);
        return;
      }
      console.log(`🚀 Next.js server ready on http://${hostname}:${port}`);
      console.log(`🔌 Socket.IO server ready on the same port`);
      console.log(`📱 Environment: ${dev ? 'development' : 'production'}`);
      resolve({ server, io });
    });
  });
});

module.exports = { activeCallRooms, serverReady };
