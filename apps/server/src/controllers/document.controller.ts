import { Response } from 'express';
import { prisma } from '@nexus/database';
import { AuthRequest } from '../middlewares/auth.middleware';
import { z } from 'zod';

import { getUserRole } from '../utils/rbac';


const createDocumentSchema = z.object({
  workspaceId: z.string().min(1, "Workspace ID is required"),
  title: z.string().optional(),
  type: z.enum(['TEXT', 'CANVAS']).optional(),
  folderId: z.string().nullable().optional(),
});

const updateDocumentSchema = z.object({
  title: z.string().optional(),
  isArchived: z.boolean().optional(),
  textContent: z.string().optional(),
  folderId: z.string().nullable().optional(),
});

// GET /api/documents?workspaceId=...&isArchived=true/false
export const getDocuments = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { workspaceId, isArchived } = req.query;
    if (!workspaceId || typeof workspaceId !== 'string') {
      return res.status(400).json({ error: 'workspaceId query parameter is required' });
    }

    // Verify user owns or has access to the workspace
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: { members: { where: { userId, status: 'ACCEPTED' } } }
    });

    if (!workspace || (workspace.ownerId !== userId && workspace.members.length === 0)) {
      return res.status(403).json({ error: 'Forbidden access to this workspace' });
    }

    const archivedFilter = isArchived === 'true';

    const documents = await prisma.document.findMany({
      where: {
        workspaceId,
        isArchived: archivedFilter,
      },
      select: {
        id: true,
        title: true,
        isArchived: true,
        type: true,
        folderId: true,
        createdAt: true,
        updatedAt: true,
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        favorites: {
          where: { userId }
        }
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Include the current user's role so the frontend can enforce read-only for VIEWERs
    const userRole = workspace.ownerId === userId ? 'OWNER' : (workspace.members[0]?.role || 'OWNER');
    res.status(200).json({ documents, userRole });
  } catch (error) {
    console.error("Error fetching documents:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/documents/:id -> Get a single document
export const getDocumentById = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        workspace: {
          include: { members: { where: { userId, status: 'ACCEPTED' } } }
        },
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (document.workspace.ownerId !== userId && document.creatorId !== userId && document.workspace.members.length === 0) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    res.status(200).json({ document });
  } catch (error) {
    console.error("Error fetching document:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /api/documents -> Create a new document with smart Untitled naming
export const createDocument = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { workspaceId, title, type, folderId } = createDocumentSchema.parse(req.body);

    // Verify workspace access AND check role (VIEWER cannot create)
    const role = await getUserRole(userId, workspaceId);
    if (!role) {
      return res.status(403).json({ error: 'Forbidden access to this workspace' });
    }
    if (role === 'VIEWER') {
      return res.status(403).json({ error: 'Viewers cannot create documents' });
    }

    // Smart Untitled incrementing logic
    let finalTitle = title && title.trim() !== '' ? title.trim() : 'Untitled Document';
    
    // Verify cross-workspace ID manipulation for folder
    if (folderId) {
      const folder = await prisma.folder.findUnique({ where: { id: folderId } });
      if (!folder || folder.workspaceId !== workspaceId) {
        return res.status(400).json({ error: 'Invalid destination folder' });
      }
    }
    if (finalTitle.startsWith('Untitled Document')) {
      const count = await prisma.document.count({
        where: {
          workspaceId,
          title: { startsWith: 'Untitled Document' },
        },
      });
      if (count > 0 || !title) {
        finalTitle = `Untitled Document ${count + 1}`;
      }
    }

    const document = await prisma.document.create({
      data: {
        title: finalTitle,
        workspaceId,
        creatorId: userId,
        type: type === 'CANVAS' ? 'CANVAS' : 'TEXT',
        folderId: folderId || null,
      },
    });

    await prisma.workspaceActivity.create({
      data: {
        workspaceId,
        actorId: userId,
        type: 'DOCUMENT_CREATED',
        entityType: 'Document',
        entityId: document.id,
        metadata: { title: document.title }
      }
    });

    res.status(201).json({ document });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues });
    }
    console.error("Error creating document:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// PATCH /api/documents/:id -> Update title, archive status, or snippet
export const updateDocument = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    const { title, isArchived, textContent, folderId } = updateDocumentSchema.parse(req.body);

    const existing = await prisma.document.findUnique({
      where: { id },
      include: { workspace: true },
    });

    if (!existing) {
      return res.status(403).json({ error: 'Forbidden or document not found' });
    }

    const role = await getUserRole(userId, existing.workspaceId);
    if (!role) {
      return res.status(403).json({ error: 'Forbidden or document not found' });
    }
    if (role === 'VIEWER') {
      return res.status(403).json({ error: 'Viewers cannot edit documents' });
    }

    // If moving to a new folder, verify the folder exists in the same workspace
    if (folderId !== undefined && folderId !== null) {
      const folder = await prisma.folder.findUnique({ where: { id: folderId } });
      if (!folder || folder.workspaceId !== existing.workspaceId) {
        return res.status(400).json({ error: 'Invalid destination folder' });
      }
    }

    let finalFolderId = folderId !== undefined ? folderId : existing.folderId;
    if (isArchived === false && finalFolderId) {
      const parentFolder = await prisma.folder.findUnique({ where: { id: finalFolderId } });
      if (!parentFolder || parentFolder.isArchived) {
        finalFolderId = null; // Restore to root if parent is archived or missing
      }
    }

    const updated = await prisma.document.update({
      where: { id },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(isArchived !== undefined && { isArchived }),
        ...(textContent !== undefined && { textContent }),
        folderId: finalFolderId,
      },
    });

    const type = isArchived !== undefined ? (isArchived ? 'DOCUMENT_DELETED' : 'DOCUMENT_RESTORED') 
                 : (title !== undefined && title.trim() !== existing.title ? 'DOCUMENT_RENAMED' 
                 : (textContent !== undefined ? 'DOCUMENT_MODIFIED' : 'DOCUMENT_UPDATED'));

    const metadata = type === 'DOCUMENT_RENAMED' 
                     ? { oldTitle: existing.title, newTitle: updated.title } 
                     : { title: updated.title };

    await prisma.workspaceActivity.create({
      data: {
        workspaceId: existing.workspaceId,
        actorId: userId,
        type,
        entityType: 'Document',
        entityId: id,
        metadata
      }
    });

    res.status(200).json({ document: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues });
    }
    console.error("Error updating document:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// DELETE /api/documents/:id -> Permanently delete from database
export const deleteDocument = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    const existing = await prisma.document.findUnique({
      where: { id },
      include: { workspace: true },
    });

    if (!existing) {
      return res.status(403).json({ error: 'Forbidden or document not found' });
    }

    const role = await getUserRole(userId, existing.workspaceId);
    if (!role) {
      return res.status(403).json({ error: 'Forbidden or document not found' });
    }
    if (role !== 'OWNER' && role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden: Only owners and admins can permanently delete documents' });
    }

    await prisma.document.delete({ where: { id } });
    
    await prisma.workspaceActivity.create({
      data: {
        workspaceId: existing.workspaceId,
        actorId: userId,
        type: 'DOCUMENT_DELETED',
        entityType: 'Document',
        entityId: id,
        metadata: { title: existing.title }
      }
    });

    res.status(200).json({ message: 'Document permanently deleted' });
  } catch (error) {
    console.error("Error deleting document:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /api/documents/:id/favorite -> Favorite document
export const favoriteDocument = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;
    
    // Verify document exists and user has access to its workspace
    const document = await prisma.document.findUnique({
      where: { id },
      include: { workspace: true }
    });
    if (!document) return res.status(404).json({ error: 'Document not found' });
    
    const role = await getUserRole(userId, document.workspaceId);
    if (!role) return res.status(403).json({ error: 'Forbidden' });
    
    await prisma.documentFavorite.upsert({
      where: {
        userId_documentId: { userId, documentId: id }
      },
      update: {},
      create: { userId, documentId: id }
    });
    
    res.status(200).json({ message: 'Favorited' });
  } catch (error) {
    console.error("Error favoriting document:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// DELETE /api/documents/:id/favorite -> Unfavorite document
export const unfavoriteDocument = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;
    
    await prisma.documentFavorite.deleteMany({
      where: { userId, documentId: id }
    });
    
    res.status(200).json({ message: 'Unfavorited' });
  } catch (error) {
    console.error("Error unfavoriting document:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

