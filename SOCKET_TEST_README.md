# Socket.io Client Test Script - Instructions

## Overview
The `test-socket-client.js` script tests the Socket.io server connection with JWT authentication. It:
1. ✅ Generates a valid JWT token using the JWT_SECRET from your environment
2. ✅ Connects to the Socket.io server with JWT in the auth payload
3. ✅ Listens for the 'connect' event and logs success
4. ✅ Emits a 'join-document' event with a dummy document ID
5. ✅ Listens for acknowledgment ('joined-document') or error events
6. ✅ Auto-disconnects after 5 seconds

## Prerequisites

### 1. Install Global Dependencies
```bash
npm install -g socket.io-client jsonwebtoken
```

**OR** use a local node_modules approach:

```bash
cd D:\nexsus_workspace\nexsus_project\Nexus-Workspace
npm install socket.io-client jsonwebtoken --save-dev
```

### 2. Set Up Environment Variables
Make sure your `.env` file is configured in `apps/server/.env`:
```
JWT_SECRET=your_secret_key_here
PORT=4000
CLIENT_URL=http://localhost:5173
DATABASE_URL=postgresql://user:password@localhost:5432/nexus_db
DIRECT_URL=postgresql://user:password@localhost:5432/nexus_db
```

### 3. Start the Backend Server
In one terminal, start the Express + Socket.io server:
```bash
cd D:\nexsus_workspace\nexsus_project\Nexus-Workspace
corepack pnpm run -w dev
```
Or specifically for the server:
```bash
cd apps/server
npm run dev
```

Wait for the output: `Server is running on http://localhost:4000`

## Running the Test Script

### Option A: Global Dependencies
```bash
cd D:\nexsus_workspace\nexsus_project\Nexus-Workspace
node test-socket-client.js
```

### Option B: Using npx (without global install)
```bash
cd D:\nexsus_workspace\nexsus_project\Nexus-Workspace
npx node test-socket-client.js
```

### Option C: With Custom Environment Variables
```bash
# Override server URL
$env:SERVER_URL="http://localhost:4000"; $env:JWT_SECRET="your_secret"; node test-socket-client.js

# PowerShell syntax:
$env:SERVER_URL="http://localhost:4000"; $env:JWT_SECRET="test_secret_key"; node test-socket-client.js
```

### Option D: From CMD/PowerShell with Environment Set
**PowerShell:**
```powershell
$env:JWT_SECRET="test_secret_key"
$env:SERVER_URL="http://localhost:4000"
node test-socket-client.js
```

**CMD:**
```batch
set JWT_SECRET=test_secret_key
set SERVER_URL=http://localhost:4000
node test-socket-client.js
```

## Expected Output

```
🚀 Socket.io Client Test Script
================================
Server URL: http://localhost:4000
Test User ID: test-user-001
Test Document ID: dummy-doc-12345

✅ Generated JWT Token:
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InRlc3QtdXNlci0wMDEiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJpYXQiOjE2ODM0NTY3ODEsImV4cCI6MTY4MzQ2MDM4MX0.abc...

📡 Connecting to server...

✅ CONNECTED: Socket ID = XyZ_abc123
   Status: Successfully authenticated with JWT

📤 Emitting join-document event...

✅ JOINED DOCUMENT:
   Document ID: dummy-doc-12345
   Message: Successfully joined the room

⏱️  Demo timeout - disconnecting...

🔌 DISCONNECTED: client namespace disconnect
```

## Troubleshooting

### Error: "Cannot find module 'socket.io-client'"
```bash
npm install -g socket.io-client jsonwebtoken
```

### Error: "Authentication token is required"
- Check that JWT_SECRET environment variable is set
- Ensure your .env file has `JWT_SECRET=your_value`

### Error: "Connection refused"
- Backend server is not running
- Start it with: `corepack pnpm run -w dev` in the workspace root

### Error: "EADDRINUSE :::4000"
- Port 4000 is already in use
- Kill the process or change PORT in .env

### Token Expired or Invalid
- The test script auto-generates a token valid for 1 hour
- If needed, modify the expiresIn value in the script

## Customizing the Test

Edit the constants in `test-socket-client.js`:
```javascript
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:4000';
const JWT_SECRET = process.env.JWT_SECRET || 'test_secret_key';
const TEST_USER_ID = 'test-user-001';           // Change this
const TEST_USER_EMAIL = 'test@example.com';     // Change this
const TEST_DOCUMENT_ID = 'dummy-doc-12345';     // Change this
```

## What the Script Tests

1. **JWT Authentication** ✅
   - Generates a valid token using your JWT_SECRET
   - Passes it in the auth payload

2. **WebSocket Connection** ✅
   - Connects via WebSocket transport
   - Verifies the server accepts the JWT

3. **Room Joining** ✅
   - Emits join-document with documentId and userId
   - Listens for joined-document acknowledgment

4. **Error Handling** ✅
   - Logs connection errors
   - Logs event errors
   - Catches and reports JWT validation failures

## Next Steps

Once the test passes:
1. Verify your backend Socket.io server is working
2. Test the frontend at `http://localhost:5173`
3. Try multi-client connections to test collaboration features
