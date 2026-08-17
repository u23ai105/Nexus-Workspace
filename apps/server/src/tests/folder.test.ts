import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import folderRoutes from '../routes/folder.routes';
import * as rbac from '../utils/rbac';
import { prisma } from '@nexus/database';

vi.mock('@nexus/database', () => ({
  prisma: {
    folder: {
      findMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    }
  }
}));

const mockGetUserRole = vi.spyOn(rbac, 'getUserRole');

const app = express();
app.use(express.json());

// Mock auth middleware to inject fake user
app.use((req: any, res, next) => {
  req.user = req.headers['x-user-id'] ? { id: req.headers['x-user-id'] } : undefined;
  next();
});

app.use('/api/workspaces/:workspaceId/folders', folderRoutes);

describe('Folder Routes RBAC', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /', () => {
    it('should reject unauthenticated users', async () => {
      const res = await request(app).get('/api/workspaces/ws1/folders');
      expect(res.status).toBe(401);
    });

    it('should reject if user has no role in workspace', async () => {
      mockGetUserRole.mockResolvedValue(null);
      const res = await request(app).get('/api/workspaces/ws1/folders').set('x-user-id', 'user1');
      expect(res.status).toBe(403);
    });

    it('should allow VIEWER', async () => {
      mockGetUserRole.mockResolvedValue('VIEWER');
      (prisma.folder.findMany as any).mockResolvedValue([]);
      const res = await request(app).get('/api/workspaces/ws1/folders').set('x-user-id', 'user1');
      expect(res.status).toBe(200);
    });
  });

  describe('POST /', () => {
    it('should reject VIEWER from creating a folder', async () => {
      mockGetUserRole.mockResolvedValue('VIEWER');
      const res = await request(app).post('/api/workspaces/ws1/folders').set('x-user-id', 'user1').send({ name: 'Test' });
      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/Viewers cannot create/i);
    });

    it('should allow EDITOR, ADMIN, OWNER to create folder', async () => {
      mockGetUserRole.mockResolvedValue('EDITOR');
      (prisma.folder.create as any).mockResolvedValue({ id: 'f1', name: 'Test' });
      const res = await request(app).post('/api/workspaces/ws1/folders').set('x-user-id', 'user1').send({ name: 'Test' });
      expect(res.status).toBe(200);
    });
  });

  describe('PATCH /:folderId (Rename/Archive)', () => {
    it('should reject if folder does not exist or cross-workspace', async () => {
      (prisma.folder.findUnique as any).mockResolvedValue({ id: 'f1', workspaceId: 'other-ws' });
      const res = await request(app).patch('/api/workspaces/ws1/folders/f1').set('x-user-id', 'user1').send({ name: 'New' });
      expect(res.status).toBe(404);
    });

    it('should reject VIEWER from renaming', async () => {
      (prisma.folder.findUnique as any).mockResolvedValue({ id: 'f1', workspaceId: 'ws1' });
      mockGetUserRole.mockResolvedValue('VIEWER');
      const res = await request(app).patch('/api/workspaces/ws1/folders/f1').set('x-user-id', 'user1').send({ name: 'New' });
      expect(res.status).toBe(403);
    });

    it('should allow EDITOR', async () => {
      (prisma.folder.findUnique as any).mockResolvedValue({ id: 'f1', workspaceId: 'ws1' });
      mockGetUserRole.mockResolvedValue('EDITOR');
      (prisma.folder.update as any).mockResolvedValue({ id: 'f1', name: 'New' });
      const res = await request(app).patch('/api/workspaces/ws1/folders/f1').set('x-user-id', 'user1').send({ name: 'New' });
      expect(res.status).toBe(200);
    });
  });

  describe('DELETE /:folderId', () => {
    it('should reject EDITOR from permanently deleting', async () => {
      (prisma.folder.findUnique as any).mockResolvedValue({ id: 'f1', workspaceId: 'ws1' });
      mockGetUserRole.mockResolvedValue('EDITOR');
      const res = await request(app).delete('/api/workspaces/ws1/folders/f1').set('x-user-id', 'user1');
      expect(res.status).toBe(403);
    });

    it('should allow ADMIN to permanently delete', async () => {
      (prisma.folder.findUnique as any).mockResolvedValue({ id: 'f1', workspaceId: 'ws1' });
      mockGetUserRole.mockResolvedValue('ADMIN');
      (prisma.folder.delete as any).mockResolvedValue({ id: 'f1' });
      const res = await request(app).delete('/api/workspaces/ws1/folders/f1').set('x-user-id', 'user1');
      expect(res.status).toBe(200);
    });

    it('should allow OWNER to permanently delete', async () => {
      (prisma.folder.findUnique as any).mockResolvedValue({ id: 'f1', workspaceId: 'ws1' });
      mockGetUserRole.mockResolvedValue('OWNER');
      (prisma.folder.delete as any).mockResolvedValue({ id: 'f1' });
      const res = await request(app).delete('/api/workspaces/ws1/folders/f1').set('x-user-id', 'user1');
      expect(res.status).toBe(200);
    });
  });
});
