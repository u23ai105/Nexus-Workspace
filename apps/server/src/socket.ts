import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import { Awareness, applyAwarenessUpdate, encodeAwarenessUpdate } from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import * as map from 'lib0/map';

const FRONTEND_ORIGIN = process.env.CLIENT_URL || 'http://localhost:5173';

export interface SocketJwtPayload {
  id: string;
  email: string;
  iat?: number;
  exp?: number;
}

/**
 * In-memory store of Y.Doc instances per room
 * Key: roomName (e.g., "document:doc-123")
 * Value: { ydoc: Y.Doc, awareness: Awareness, clients: Set<string> }
 */
const docStores = new Map<
  string,
  {
    ydoc: Y.Doc;
    awareness: Awareness;
    clients: Set<string>;
  }
>();

/**
 * Get or create a Y.Doc instance for a room
 */
const getOrCreateRoom = (roomName: string) => {
  if (!docStores.has(roomName)) {
    const ydoc = new Y.Doc();
    const awareness = new Awareness(ydoc);

    docStores.set(roomName, {
      ydoc,
      awareness,
      clients: new Set(),
    });

    console.log(`[Yjs] Created new document room: ${roomName}`);
  }

  return docStores.get(roomName)!;
};

/**
 * Remove a client from a room and clean up if empty
 */
const removeClientFromRoom = (roomName: string, clientId: string) => {
  const room = docStores.get(roomName);
  if (room) {
    room.clients.delete(clientId);

    // Clean up empty room to prevent memory leaks
    if (room.clients.size === 0) {
      room.ydoc.destroy();
      room.awareness.destroy();
      docStores.delete(roomName);
      console.log(`[Yjs] Destroyed empty document room: ${roomName}`);
    }
  }
};

/**
 * Encode and send a Yjs sync message
 */
const sendSync = (socket: Socket, roomName: string, encoder: encoding.Encoder) => {
  socket.emit('sync', Array.from(encoding.toUint8Array(encoder)));
};

/**
 * Send the full state of the Y.Doc to a client (for initial sync)
 */
const sendFullUpdate = (socket: Socket, ydoc: Y.Doc) => {
  const encoder = encoding.createEncoder();
  syncProtocol.writeUpdate(encoder, Y.encodeStateAsUpdate(ydoc));
  socket.emit('sync', Array.from(encoding.toUint8Array(encoder)));
};

const verifySocketToken = (token: string): SocketJwtPayload => {
  const secret = process.env.JWT_SECRET || 'fallback_secret';
  return jwt.verify(token, secret) as SocketJwtPayload;
};

const socketAuthMiddleware = (socket: Socket, next: (err?: Error) => void) => {
  const authToken = socket.handshake.auth?.token || socket.handshake.headers.authorization;

  if (!authToken) {
    return next(new Error('Authentication token is required'));
  }

  const token = typeof authToken === 'string' && authToken.startsWith('Bearer ')
    ? authToken.split(' ')[1]
    : authToken;

  if (!token) {
    return next(new Error('Invalid authentication token format'));
  }

  try {
    const user = verifySocketToken(token);
    socket.data.user = user;
    next();
  } catch (error) {
    console.error('Socket auth failed:', error);
    next(new Error('Unauthorized'));
  }
};

export const createSocketServer = (server: HttpServer) => {
  const io = new SocketIOServer(server, {
    cors: {
      origin: (origin, callback) => {
        // Allow any localhost origin (covers port fallbacks like 5175)
        if (!origin || /^http:\/\/localhost(:\d+)?$/.test(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`CORS not allowed for origin: ${origin}`));
        }
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.use(socketAuthMiddleware);

  io.on('connection', (socket) => {
    const userId = socket.data.user?.id ?? 'unknown';
    console.log(`[Socket] Connected: ${socket.id} user=${userId}`);

    let currentRoomName: string | null = null;

    /**
     * Handle join-document event
     * This is where a user joins a collaborative document
     */
    socket.on('join-document', ({ documentId, userId: joinUserId }: { documentId: string; userId: string }) => {
      if (!documentId || !joinUserId) {
        socket.emit('error', { message: 'documentId and userId are required' });
        return;
      }

      const authUserId = socket.data.user?.id;
      if (authUserId !== joinUserId) {
        socket.emit('error', { message: 'userId does not match authenticated user' });
        return;
      }

      const roomName = `document:${documentId}`;

      // Get or create the Y.Doc for this room
      const room = getOrCreateRoom(roomName);
      room.clients.add(socket.id);

      // Join the Socket.IO room
      socket.join(roomName);
      currentRoomName = roomName;

      console.log(`[Room] User ${joinUserId} joined ${roomName}. Clients in room: ${room.clients.size}`);

      // Send acknowledgment
      socket.emit('joined-document', { documentId });

      // Send the full initial state of the Y.Doc to the newly joined client
      console.log(`[Yjs] Sending initial state to ${socket.id}`);
      sendFullUpdate(socket, room.ydoc);
    });

    /**
     * Handle Yjs sync messages from client (step-1)
     * Client sends its state vector; server responds with needed updates
     */
    socket.on('sync', (data: Uint8Array | number[]) => {
      if (!currentRoomName) {
        console.warn(`[Yjs] Received sync from ${socket.id} but not in a room`);
        return;
      }

      const room = docStores.get(currentRoomName);
      if (!room) {
        console.warn(`[Yjs] Room ${currentRoomName} not found`);
        return;
      }

      const uint8Array = new Uint8Array(data);
      const decoder = decoding.createDecoder(uint8Array);
      const encoder = encoding.createEncoder();

      try {
        syncProtocol.readSyncStep1(decoder, encoder, room.ydoc);

        if (encoding.length(encoder) > 1) {
          sendSync(socket, currentRoomName, encoder);
        }
      } catch (error) {
        console.error(`[Yjs] Error processing sync from ${socket.id}:`, error);
      }
    });

    /**
     * Handle document updates from client
     * Client sends changes; server applies them and broadcasts to all other users
     */
    socket.on('update', (data: Uint8Array | number[]) => {
      if (!currentRoomName) {
        console.warn(`[Yjs] Received update from ${socket.id} but not in a room`);
        return;
      }

      const room = docStores.get(currentRoomName);
      if (!room) {
        console.warn(`[Yjs] Room ${currentRoomName} not found`);
        return;
      }

      try {
        const uint8Array = new Uint8Array(data);
        Y.applyUpdate(room.ydoc, uint8Array, socket.id);

        // Broadcast the update to all other clients in the room
        socket.to(currentRoomName).emit('update', data);

        console.log(`[Yjs] Update from ${socket.id} applied and broadcast in ${currentRoomName}`);
      } catch (error) {
        console.error(`[Yjs] Error applying update from ${socket.id}:`, error);
      }
    });

    /**
     * Handle awareness updates (user presence, cursor position, etc.)
     */
    socket.on('awareness', (data: Uint8Array | number[]) => {
      if (!currentRoomName) {
        console.warn(`[Awareness] Received update from ${socket.id} but not in a room`);
        return;
      }

      const room = docStores.get(currentRoomName);
      if (!room) {
        console.warn(`[Awareness] Room ${currentRoomName} not found`);
        return;
      }

      try {
        const uint8Array = new Uint8Array(data);
        applyAwarenessUpdate(room.awareness, uint8Array, socket.id);

        // Broadcast awareness update to all other clients in the room
        socket.to(currentRoomName).emit('awareness', data);

        console.log(`[Awareness] Update from ${socket.id} broadcast in ${currentRoomName}`);
      } catch (error) {
        console.error(`[Awareness] Error applying update from ${socket.id}:`, error);
      }
    });

    /**
     * Handle disconnect - clean up the client and room if empty
     */
    socket.on('disconnect', (reason) => {
      console.log(`[Socket] Disconnected: ${socket.id} user=${userId} reason=${reason}`);

      if (currentRoomName) {
        removeClientFromRoom(currentRoomName, socket.id);
        console.log(`[Room] User ${userId} left ${currentRoomName}`);
      }
    });

    socket.on('error', (err) => {
      console.error(`[Socket] Error on ${socket.id}:`, err);
    });
  });

  return io;
};
