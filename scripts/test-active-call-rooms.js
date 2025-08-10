#!/usr/bin/env node

process.env.TEST_MODE = '1';
const { serverReady, activeCallRooms } = require('../server');
const ioClient = require('socket.io-client');

const port = process.env.PORT || 3000;
const url = `http://localhost:${port}`;

(async () => {
  const { server } = await serverReady;

  const client1 = ioClient(url);
  const client2 = ioClient(url);

  await Promise.all([
    new Promise(resolve => client1.on('connect', resolve)),
    new Promise(resolve => client2.on('connect', resolve))
  ]);

  client1.emit('register-user', { userId: 'user1', userName: 'User One' });
  client2.emit('register-user', { userId: 'user2', userName: 'User Two' });

  client1.emit('call-user', { targetUserId: 'user2', offer: 'fake', callerName: 'User One' });
  client2.emit('call-answer', { callerSocketId: client1.id, answer: 'fake-answer' });

  await new Promise(r => setTimeout(r, 500));
  console.log('Active rooms after answer:', activeCallRooms.size);

  client1.emit('call-end', { targetSocketId: client2.id });

  await new Promise(r => setTimeout(r, 500));
  console.log('Active rooms after end:', activeCallRooms.size);

  if (activeCallRooms.size === 0) {
    console.log('✅ activeCallRooms cleared after call end');
  } else {
    console.log('❌ activeCallRooms not cleared');
  }

  client1.close();
  client2.close();
  server.close(() => process.exit(0));
})();
