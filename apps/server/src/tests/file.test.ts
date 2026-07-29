import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../index';
import { prisma } from '@nexus/database';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

// Mock Prisma
vi.mock('@nexus/database', () => ({
  prisma: {
    workspace: {
      findUnique: vi.fn(),
    },
    file: {
      findMany: vi.fn(),
      create: vi.fn(),
    }
  },
}));

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ data: { path: 'test' }, error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://supabase.com/file' } }),
      })),
    }
  })),
}));

describe('File API', () => {
  const token = jwt.sign({ id: 'user-1', email: 'test@test.com' }, process.env.JWT_SECRET || 'secret');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch files for a workspace', async () => {
    const mockFiles = [{ id: 'file-1', filename: 'test.png', url: 'https://supabase.com/file' }];
    vi.mocked(prisma.file.findMany).mockResolvedValue(mockFiles as any);

    const res = await request(app)
      .get('/api/files?workspaceId=ws-1')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.files).toEqual(mockFiles);
  });

  it('should fail to fetch if no workspaceId', async () => {
    const res = await request(app)
      .get('/api/files')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
  });
});
