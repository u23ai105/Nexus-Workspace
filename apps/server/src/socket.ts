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
import { prisma } from '@nexus/database';

const FRONTEND_ORIGIN = process.env.CLIENT_URL || 'http://localhost:5173';

const saveTimers = new Map<string, NodeJS.Timeout>();
const lastActivityLog = new Map<string, number>();

// Presentation State Tracking
// Key: workspaceId, Value: { presenterId: string, role: string, documentId: string, peerId: string }
const activePresentations = new Map<string, { presenterId: string; role: string; documentId: string; peerId?: string }>();

const scheduleSaveToDb = (roomName: string, ydoc: Y.Doc, userId?: string) => {
  if (saveTimers.has(roomName)) return;

  const timer = setTimeout(async () => {
    saveTimers.delete(roomName);
    const documentId = roomName.replace('document:', '');
    try {
      const state = Y.encodeStateAsUpdate(ydoc);
      const updatedDoc = await prisma.document.update({
        where: { id: documentId },
        data: { yjsState: Buffer.from(state) },
        select: { workspaceId: true, title: true }
      });
      console.log(`[Yjs] Auto-saved snapshot to DB for ${roomName} (${state.length} bytes)`);

      // Log activity if userId is provided and we haven't logged one recently
      if (userId && userId !== 'unknown' && updatedDoc) {
        const activityKey = `${documentId}-${userId}`;
        const lastLogged = lastActivityLog.get(activityKey) || 0;
        const now = Date.now();
        // Throttle to 5 minutes (300000 ms) to avoid spamming while still being responsive for the user testing it now
        if (now - lastLogged > 300000) {
          lastActivityLog.set(activityKey, now);
          await prisma.workspaceActivity.create({
            data: {
              workspaceId: updatedDoc.workspaceId,
              actorId: userId,
              type: 'DOCUMENT_MODIFIED',
              entityType: 'Document',
              entityId: documentId,
              metadata: { title: updatedDoc.title }
            }
          });
          console.log(`[Yjs] Logged DOCUMENT_MODIFIED activity for user ${userId} on doc ${documentId}`);
        }
      }
    } catch (err) {
      console.error(`[Yjs] Failed to auto-save snapshot for ${roomName}:`, err);
    }
  }, 3000);

  saveTimers.set(roomName, timer);
};

const flushSaveToDb = async (roomName: string, ydoc: Y.Doc) => {
  if (saveTimers.has(roomName)) {
    clearTimeout(saveTimers.get(roomName)!);
    saveTimers.delete(roomName);
  }
  const documentId = roomName.replace('document:', '');
  try {
    const state = Y.encodeStateAsUpdate(ydoc);
    await prisma.document.update({
      where: { id: documentId },
      data: { yjsState: Buffer.from(state) },
    });
    console.log(`[Yjs] Flushed final snapshot to DB on room destroy for ${roomName} (${state.length} bytes)`);
  } catch (err) {
    console.error(`[Yjs] Failed to flush snapshot for ${roomName}:`, err);
  }
};

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
const getOrCreateRoom = async (roomName: string, documentId: string) => {
  if (!docStores.has(roomName)) {
    const ydoc = new Y.Doc();
    const awareness = new Awareness(ydoc);

    // Try loading existing binary snapshot from database
    try {
      const docRecord = await prisma.document.findUnique({
        where: { id: documentId },
        select: { yjsState: true }
      });
      if (docRecord && docRecord.yjsState) {
        Y.applyUpdate(ydoc, new Uint8Array(docRecord.yjsState));
        console.log(`[Yjs] Loaded existing snapshot from DB for ${roomName} (${docRecord.yjsState.length} bytes)`);
      }
    } catch (err) {
      console.error(`[Yjs] Error loading snapshot from DB for ${roomName}:`, err);
    }

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
const removeClientFromRoom = async (roomName: string, clientId: string) => {
  const room = docStores.get(roomName);
  if (room) {
    room.clients.delete(clientId);

    // Clean up empty room to prevent memory leaks
    if (room.clients.size === 0) {
      await flushSaveToDb(roomName, room.ydoc);
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

    if (userId !== 'unknown') {
      socket.join(`user:${userId}`);
    }

    let currentRoomName: string | null = null;

    /**
     * Handle join-document event
     * This is where a user joins a collaborative document
     */
    socket.on('join-document', async ({ documentId, userId: joinUserId }: { documentId: string; userId: string }) => {
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

      // Get or create the Y.Doc for this room (loading from DB if available)
      const room = await getOrCreateRoom(roomName, documentId);
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

        const userId = socket.data.user?.id;

        // Schedule debounce save to PostgreSQL
        scheduleSaveToDb(currentRoomName, room.ydoc, userId);

        // Broadcast the update to all other clients in the room
        socket.to(currentRoomName).emit('update', data);

        console.log(`[Yjs] Update from ${socket.id} applied and broadcast in ${currentRoomName}`);
      } catch (error) {
        console.error(`[Yjs] Error applying update from ${socket.id}:`, error);
      }
    });

    /**
     * Handle canvas-update for tldraw sync
     * Client sends changes; server broadcasts them to others
     */
    socket.on('canvas-update', (data: any) => {
      if (!currentRoomName) {
        console.warn(`[Canvas] Received update from ${socket.id} but not in a room`);
        return;
      }
      
      // Broadcast the update to all other clients in the room
      socket.to(currentRoomName).emit('canvas-update', data);
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
    socket.on('disconnect', async (reason) => {
      console.log(`[Socket] Disconnected: ${socket.id} user=${userId} reason=${reason}`);

      if (currentRoomName) {
        await removeClientFromRoom(currentRoomName, socket.id);
        console.log(`[Room] User ${userId} left ${currentRoomName}`);
      }
    });

    /**
     * Handle chat join
     */
    socket.on('chat:join', (workspaceId: string) => {
      if (workspaceId) {
        socket.join(`chat:${workspaceId}`);
        console.log(`[Chat] User ${userId} joined chat for workspace ${workspaceId}`);
      }
    });

    /**
     * Handle Workspace Join (for presentation & global presence)
     */
    socket.on('workspace:join', (workspaceId: string) => {
      if (workspaceId) {
        socket.join(`workspace:${workspaceId}`);
        console.log(`[Workspace] User ${userId} joined workspace signaling room ${workspaceId}`);
        
        // If there's an active presentation in this workspace, notify the joining user
        const presentation = activePresentations.get(workspaceId);
        if (presentation) {
          socket.emit('presentation:active', presentation);
        }
      }
    });

    /**
     * Presentation Signaling
     */
    socket.on('presentation:start', (data: { workspaceId: string, documentId: string, role: string, peerId?: string }) => {
      if (!data.workspaceId || !data.documentId) return;
      
      // Basic Role Check logic can be done here or trusted from client
      if (data.role === 'VIEWER') return;

      activePresentations.set(data.workspaceId, {
        presenterId: userId,
        role: data.role,
        documentId: data.documentId,
        peerId: data.peerId
      });

      console.log(`[Presentation] User ${userId} started presenting in workspace ${data.workspaceId}`);
      io.to(`workspace:${data.workspaceId}`).emit('presentation:started', activePresentations.get(data.workspaceId));
    });

    socket.on('presentation:stop', (workspaceId: string) => {
      const presentation = activePresentations.get(workspaceId);
      if (presentation && presentation.presenterId === userId) {
        activePresentations.delete(workspaceId);
        io.to(`workspace:${workspaceId}`).emit('presentation:stopped');
        console.log(`[Presentation] User ${userId} stopped presenting in workspace ${workspaceId}`);
      }
    });

    socket.on('presentation:switch_doc', (data: { workspaceId: string, documentId: string }) => {
      const presentation = activePresentations.get(data.workspaceId);
      if (presentation && presentation.presenterId === userId) {
        presentation.documentId = data.documentId;
        io.to(`workspace:${data.workspaceId}`).emit('presentation:doc_switched', { documentId: data.documentId });
      }
    });

    // Handle scroll sync with basic RBAC priority
    // Higher privilege overrides lower privilege. (OWNER > ADMIN > EDITOR)
    const rolePriority = { 'OWNER': 3, 'ADMIN': 2, 'EDITOR': 1, 'VIEWER': 0 };
    
    socket.on('presentation:scroll', (data: { workspaceId: string, scrollY: number, role: string }) => {
      const presentation = activePresentations.get(data.workspaceId);
      if (!presentation) return;

      const currentPresenterPriority = rolePriority[presentation.role as keyof typeof rolePriority] || 0;
      const incomingPriority = rolePriority[data.role as keyof typeof rolePriority] || 0;

      // Only allow scroll if incoming is presenter or has HIGHER priority (if same priority, presenter wins to prevent fighting)
      if (userId === presentation.presenterId || incomingPriority > currentPresenterPriority) {
        // If someone with higher priority scrolled, they take over the presentation role for scrolling
        if (incomingPriority > currentPresenterPriority) {
           presentation.presenterId = userId;
           presentation.role = data.role;
           io.to(`workspace:${data.workspaceId}`).emit('presentation:takeover', { presenterId: userId, role: data.role });
        }
        
        socket.to(`workspace:${data.workspaceId}`).emit('presentation:sync_scroll', { scrollY: data.scrollY });
      }
    });

    // Audio Admin Controls
    socket.on('presentation:mute_user', (data: { workspaceId: string, targetUserId: string }) => {
      // Assuming authorization check was done on client before sending this,
      // but ideally we'd check if `userId` is ADMIN/OWNER in DB here.
      io.to(`workspace:${data.workspaceId}`).emit('presentation:force_mute', { targetUserId: data.targetUserId });
    });

    /**
     * Handle new chat messages
     */
    socket.on('chat:message', async (data: { workspaceId: string; content: string }) => {
      try {
        if (!data.workspaceId || !data.content || userId === 'unknown') return;

        // Save to DB
        const message = await prisma.message.create({
          data: {
            workspaceId: data.workspaceId,
            senderId: userId,
            content: data.content
          },
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                username: true,
                email: true
              }
            }
          }
        });

        // Broadcast to workspace chat room
        io.to(`chat:${data.workspaceId}`).emit('chat:message', message);
      } catch (err) {
        console.error(`[Chat] Error sending message from ${userId}:`, err);
      }
    });

    /**
     * Handle Global DM join
     */
    socket.on('dm:join', (otherUserId: string) => {
      if (otherUserId && userId !== 'unknown') {
        const roomName = `dm:${[userId, otherUserId].sort().join('-')}`;
        socket.join(roomName);
        console.log(`[DM] User ${userId} joined DM room ${roomName}`);
      }
    });

    /**
     * Handle Global DM message
     */
    socket.on('dm:message', async (data: { otherUserId: string; content: string }) => {
      try {
        if (!data.otherUserId || !data.content || userId === 'unknown') return;

        const message = await prisma.directMessage.create({
          data: {
            senderId: userId,
            receiverId: data.otherUserId,
            content: data.content
          },
          include: {
            sender: {
              select: { id: true, name: true, username: true, email: true }
            }
          }
        });

        const roomName = `dm:${[userId, data.otherUserId].sort().join('-')}`;

        // Broadcast to both users in the room
        io.to(roomName).emit('dm:message', message);

        // Also emit a notification to the receiver's personal global room if they have one open
        io.to(`user:${data.otherUserId}`).emit('dm:notification', message);
      } catch (err) {
        console.error(`[DM] Error sending DM from ${userId}:`, err);
      }
    });

    socket.on('error', (err) => {
      console.error(`[Socket] Error on ${socket.id}:`, err);
    });
  });

  return io;
};
