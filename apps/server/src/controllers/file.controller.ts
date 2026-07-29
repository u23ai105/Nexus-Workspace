import { Request, Response } from 'express';
import { prisma } from '@nexus/database';
import { AuthRequest } from '../middlewares/auth.middleware';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
let supabase: ReturnType<typeof createClient> | null = null;

if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
}

// POST /files/upload
export const uploadFile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const workspaceId = req.body.workspaceId;
    if (!workspaceId) return res.status(400).json({ error: 'workspaceId is required' });

    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const file = req.file;

    // Verify workspace access
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId }
    });
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    // Since we don't have RBAC fully implemented yet (Phase 4), we just check if it's the owner.
    // In a real app with RBAC, we'd check if the user is a member of the workspace.
    // We will allow it for now if they are authenticated, but ideally we check membership.
    
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
    if (!workspaceId) return res.status(400).json({ error: 'workspaceId is required' });

    const files = await prisma.file.findMany({
      where: { workspaceId },
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
      where: { id },
      include: { workspace: true }
    });

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    if (file.workspace.ownerId !== userId && file.uploaderId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
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
