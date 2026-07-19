/**
 * Socket.io Client Test Script
 * 
 * This script connects to the Nexus Socket.io server with JWT authentication,
 * joins a document room, and listens for events.
 * 
 * Usage:
 *   node test-socket-client.js
 * 
 * Make sure:
 * 1. Backend server is running (npm run dev in apps/server)
 * 2. .env file is set up in apps/server with JWT_SECRET
 */

const { io } = require('socket.io-client');
const jwt = require('jsonwebtoken');

// Configuration
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:4000';
const JWT_SECRET = process.env.JWT_SECRET || 'test_secret_key';
const TEST_USER_ID = 'test-user-001';
const TEST_USER_EMAIL = 'test@example.com';
const TEST_DOCUMENT_ID = 'dummy-doc-12345';

console.log('🚀 Socket.io Client Test Script');
console.log('================================');
console.log(`Server URL: ${SERVER_URL}`);
console.log(`Test User ID: ${TEST_USER_ID}`);
console.log(`Test Document ID: ${TEST_DOCUMENT_ID}`);
console.log('');

// Generate a valid JWT token
const generateToken = () => {
  const payload = {
    id: TEST_USER_ID,
    email: TEST_USER_EMAIL,
  };

  const token = jwt.sign(payload, JWT_SECRET, {
    expiresIn: '1h',
    algorithm: 'HS256',
  });

  console.log('✅ Generated JWT Token:');
  console.log(`   ${token}\n`);
  return token;
};

// Create Socket.io client with JWT authentication
const createSocketClient = (token) => {
  const socket = io(SERVER_URL, {
    transports: ['websocket'],
    auth: {
      token: token, // Pass JWT in auth payload
    },
  });

  return socket;
};

// Main test flow
const runTest = async () => {
  try {
    // Step 1: Generate JWT
    const token = generateToken();

    // Step 2: Create Socket client
    console.log('📡 Connecting to server...\n');
    const socket = createSocketClient(token);

    // Step 3: Listen for 'connect' event
    socket.on('connect', () => {
      console.log(`✅ CONNECTED: Socket ID = ${socket.id}`);
      console.log(`   Status: Successfully authenticated with JWT\n`);

      // Step 4: Emit 'join-document' event
      console.log('📤 Emitting join-document event...\n');
      socket.emit('join-document', {
        documentId: TEST_DOCUMENT_ID,
        userId: TEST_USER_ID,
      });
    });

    // Step 5: Listen for acknowledgment events
    socket.on('joined-document', (data) => {
      console.log(`✅ JOINED DOCUMENT:`);
      console.log(`   Document ID: ${data.documentId}`);
      console.log(`   Message: Successfully joined the room\n`);
    });

    // Listen for error events
    socket.on('error', (error) => {
      console.log(`❌ ERROR EVENT RECEIVED:`);
      console.log(`   ${error.message || error}\n`);
    });

    // Listen for custom error responses
    socket.on('connect_error', (error) => {
      console.log(`❌ CONNECTION ERROR:`);
      console.log(`   ${error.message || error}\n`);
    });

    // Listen for disconnect
    socket.on('disconnect', (reason) => {
      console.log(`🔌 DISCONNECTED: ${reason}\n`);
      process.exit(0);
    });

    // Auto-disconnect after 5 seconds for demo purposes
    setTimeout(() => {
      console.log('⏱️  Demo timeout - disconnecting...\n');
      socket.disconnect();
    }, 5000);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

// Run the test
runTest();
