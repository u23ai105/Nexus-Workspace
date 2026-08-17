import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../index';
import { prisma } from '@nexus/database';
import jwt from 'jsonwebtoken';

// Mock Prisma
vi.mock('@nexus/database', () => ({
  prisma: {
    workspace: {
      findMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

describe('Workspace API', () => {
  const token = jwt.sign({ id: 'user-1', email: 'test@test.com' }, process.env.JWT_SECRET || 'secret');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 if unauthorized', async () => {
    const res = await request(app).get('/api/workspaces');
    expect(res.status).toBe(401);
  });

  it('should fetch workspaces', async () => {
    const mockWorkspaces = [{ id: 'ws-1', name: 'Test WS', ownerId: 'user-1', members: [] }];
    vi.mocked(prisma.workspace.findMany).mockResolvedValue(mockWorkspaces as any);

    const res = await request(app)
      .get('/api/workspaces')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.workspaces).toEqual([{ id: 'ws-1', name: 'Test WS', ownerId: 'user-1', userRole: 'OWNER' }]);
  });

  it('should create a workspace', async () => {
    const mockWs = { id: 'ws-2', name: 'New WS', ownerId: 'user-1' };
    vi.mocked(prisma.workspace.create).mockResolvedValue(mockWs as any);

    const res = await request(app)
      .post('/api/workspaces')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'New WS' });

    expect(res.status).toBe(201);
    expect(res.body.workspace).toEqual(mockWs);
  });

  it('should delete a workspace if owner', async () => {
    const mockWs = { id: 'ws-1', name: 'Test WS', ownerId: 'user-1' };
    vi.mocked(prisma.workspace.findUnique).mockResolvedValue(mockWs as any);
    vi.mocked(prisma.workspace.delete).mockResolvedValue(mockWs as any);

    const res = await request(app)
      .delete('/api/workspaces/ws-1')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
  });
});
