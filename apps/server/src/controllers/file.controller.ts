import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '@nexus/database';
import { AuthRequest } from '../middlewares/auth.middleware';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
let supabase: ReturnType<typeof createClient> | null = null;

if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
}

// Helper to get user's role in a workspace
const getUserRole = async (userId: string, workspaceId: string): Promise<string | null> => {
  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
  if (workspace?.ownerId === userId) return 'OWNER';
  const member = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } }
  });
  if (member && member.status === 'ACCEPTED') return member.role;
  return null;
};

// POST /files/upload
export const uploadFile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const workspaceId = req.body.workspaceId;
    const folderId = req.body.folderId || null;
    if (!workspaceId) return res.status(400).json({ error: 'workspaceId is required' });

    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const file = req.file;

    // Verify workspace access and role
    const role = await getUserRole(userId, workspaceId);
    if (!role) {
      return res.status(403).json({ error: 'Forbidden access to this workspace' });
    }
    if (role === 'VIEWER') {
      return res.status(403).json({ error: 'Forbidden: Viewers cannot upload files' });
    }

    // Verify cross-workspace ID manipulation for folder
    if (folderId) {
      const folder = await prisma.folder.findUnique({ where: { id: folderId } });
      if (!folder || folder.workspaceId !== workspaceId) {
        return res.status(400).json({ error: 'Invalid destination folder' });
      }
    }
    
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase Storage is not configured on the server. Please add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to .env' });
    }

    // Sanitize filename and create unique path
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '');
    const filePath = `workspaces/${workspaceId}/${Date.now()}-${sanitizedName}`;

    // Upload to Supabase Storage (bucket name: 'nexus-storage')
    const bucketName = process.env.SUPABASE_STORAGE_BUCKET || 'nexus-storage';
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      return res.status(500).json({ error: 'Failed to upload to storage bucket. Does the bucket exist?' });
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    // Save metadata in database
    const dbFile = await prisma.file.create({
      data: {
        filename: file.originalname,
        url: publicUrl,
        mimeType: file.mimetype,
        size: file.size,
        workspaceId,
        folderId,
        uploaderId: userId,
      }
    });

    res.status(201).json({ file: dbFile });
  } catch (error) {
    console.error("Error uploading file:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /files?workspaceId=...
export const getFiles = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const workspaceId = req.query.workspaceId as string;
    const isArchived = req.query.isArchived === 'true';
    if (!workspaceId) return res.status(400).json({ error: 'workspaceId is required' });

    const files = await prisma.file.findMany({
      where: { workspaceId, isArchived },
      orderBy: { createdAt: 'desc' },
      include: {
        uploader: {
          select: { name: true, email: true }
        }
      }
    });

    res.status(200).json({ files });
  } catch (error) {
    console.error("Error fetching files:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// DELETE /files/:id
export const deleteFile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;

    const file = await prisma.file.findUnique({
      where: { id }
    });

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    const role = await getUserRole(userId, file.workspaceId);
    if (!role) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (role !== 'OWNER' && role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden: Only owners and admins can permanently delete files' });
    }

    if (supabase) {
      const bucketName = process.env.SUPABASE_STORAGE_BUCKET || 'nexus-storage';
      // Extract filepath from public URL
      const urlParts = file.url.split(`/public/${bucketName}/`);
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        const { error: deleteError } = await supabase.storage
          .from(bucketName)
          .remove([filePath]);
        
        if (deleteError) {
          console.error('Supabase delete error:', deleteError);
        }
      }
    }

    await prisma.file.delete({ where: { id } });

    res.status(200).json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error("Error deleting file:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateFileSchema = z.object({
  filename: z.string().min(1, "Filename cannot be empty").optional(),
  isArchived: z.boolean().optional(),
  folderId: z.string().nullable().optional(),
});

// PATCH /files/:id
export const updateFile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    const { filename, isArchived, folderId } = updateFileSchema.parse(req.body);

    const file = await prisma.file.findUnique({ where: { id } });
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    const role = await getUserRole(userId, file.workspaceId);
    if (!role || role === 'VIEWER') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // If moving to a new folder, verify the folder exists in the same workspace
    if (folderId !== undefined && folderId !== null) {
      const folder = await prisma.folder.findUnique({ where: { id: folderId } });
      if (!folder || folder.workspaceId !== file.workspaceId) {
        return res.status(400).json({ error: 'Invalid destination folder' });
      }
    }

    let finalFolderId = folderId !== undefined ? folderId : file.folderId;
    if (isArchived === false && finalFolderId) {
      const parentFolder = await prisma.folder.findUnique({ where: { id: finalFolderId } });
      if (!parentFolder || parentFolder.isArchived) {
        finalFolderId = null; // Restore to root if parent is archived or missing
      }
    }

    const updatedFile = await prisma.file.update({
      where: { id },
      data: { 
        ...(filename !== undefined && { filename: filename.trim() }),
        ...(isArchived !== undefined && { isArchived }),
        folderId: finalFolderId
      }
    });

    res.status(200).json({ file: updatedFile });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues });
    }
    console.error("Error updating file:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
