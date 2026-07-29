import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.route';
import workspaceRoutes from './routes/workspace.route';
import documentRoutes from './routes/document.route';
import fileRoutes from './routes/file.route';
import invitationRoutes from './routes/invitation.route';
import userRoutes from './routes/user.route';
import messageRoutes from './routes/message.route';
import dmRoutes from './routes/dm.route';

dotenv.config();

export const app = express();
const PORT = process.env.PORT || 4000;

// Security Middlewares
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g., server-to-server) or any localhost origin
    if (!origin || /^http:\/\/localhost(:\d+)?$/.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS not allowed for origin: ${origin}`));
    }
  },
  credentials: true,
}));

// Body Parsing Middleware
app.use(express.json());

// Basic health check route
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', message: 'Nexus Server is running!' });
});

// API Routes
app.use('/auth', authRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/workspaces/:workspaceId/messages', messageRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/invitations', invitationRoutes);
app.use('/api/dms', dmRoutes);
app.use('/api/users', userRoutes);

// Start Server if not in test mode
let server: any;
if (process.env.NODE_ENV !== 'test') {
  server = app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });

  // Socket.io real-time engine
  const { createSocketServer } = require('./socket');
  const io = createSocketServer(server);
  app.set('io', io);

  // Graceful shutdown handlers for fast and clean dev reloads
  const { prisma } = require('@nexus/database');

  const shutdown = async () => {
    console.log('[Server] Graceful shutdown initiated...');
    server.close(() => {
      console.log('[Server] HTTP server closed.');
    });
    await prisma.$disconnect();
    console.log('[Server] Database pool disconnected.');
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
