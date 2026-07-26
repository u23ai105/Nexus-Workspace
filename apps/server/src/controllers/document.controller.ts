import { Response } from 'express';
import { prisma } from '@nexus/database';
import { AuthRequest } from '../middlewares/auth.middleware';
import { z } from 'zod';

const createDocumentSchema = z.object({
  workspaceId: z.string().min(1, "Workspace ID is required"),
  title: z.string().optional(),
});

const updateDocumentSchema = z.object({
  title: z.string().optional(),
  isArchived: z.boolean().optional(),
  textContent: z.string().optional(),
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
    });

    if (!workspace || workspace.ownerId !== userId) {
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
        textContent: true,
        isArchived: true,
        createdAt: true,
        updatedAt: true,
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      },
      orderBy: { updatedAt: 'desc' },
    });

    res.status(200).json({ documents });
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
        workspace: true,
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (document.workspace.ownerId !== userId && document.creatorId !== userId) {
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

    const { workspaceId, title } = createDocumentSchema.parse(req.body);

    // Verify workspace access
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace || workspace.ownerId !== userId) {
      return res.status(403).json({ error: 'Forbidden access to this workspace' });
    }

    // Smart Untitled incrementing logic
    let finalTitle = title && title.trim() !== '' ? title.trim() : 'Untitled Document';
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
      },
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
    const { title, isArchived, textContent } = updateDocumentSchema.parse(req.body);

    const existing = await prisma.document.findUnique({
      where: { id },
      include: { workspace: true },
    });

    if (!existing || existing.workspace.ownerId !== userId) {
      return res.status(403).json({ error: 'Forbidden or document not found' });
    }

    const updated = await prisma.document.update({
      where: { id },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(isArchived !== undefined && { isArchived }),
        ...(textContent !== undefined && { textContent }),
      },
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

    if (!existing || existing.workspace.ownerId !== userId) {
      return res.status(403).json({ error: 'Forbidden or document not found' });
    }

    await prisma.document.delete({ where: { id } });
    res.status(200).json({ message: 'Document permanently deleted' });
  } catch (error) {
    console.error("Error deleting document:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
