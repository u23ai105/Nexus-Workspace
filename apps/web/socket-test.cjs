const { io } = require('socket.io-client');

const token = process.env.SOCKET_TOKEN || 'YOUR_VALID_JWT_HERE';
const userId = process.env.SOCKET_USER_ID || 'YOUR_USER_ID';
const documentId = process.env.DOCUMENT_ID || 'dummy-document-123';

const socket = io('http://localhost:4000', {
  transports: ['websocket'],
  auth: { token },
  reconnection: false,
});

socket.on('connect', () => {
  console.log('✅ connected to socket server:', socket.id);
  socket.emit('join-document', { documentId, userId });
  console.log('📨 emitted join-document:', { documentId, userId });
});

socket.on('joined-document', (data) => {
  console.log('✅ joined-document ack received:', data);
  socket.disconnect();
});

socket.on('connect_error', (err) => {
  console.error('❌ connect_error:', err.message);
  process.exit(1);
});

socket.on('error', (err) => {
  console.error('❌ socket error event:', err);
  socket.disconnect();
});

socket.on('disconnect', (reason) => {
  console.log('⛔ disconnected:', reason);
});
