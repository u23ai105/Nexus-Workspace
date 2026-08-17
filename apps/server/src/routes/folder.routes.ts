import { Router, Response } from 'express';
import { prisma } from '@nexus/database';
import { AuthRequest } from '../middlewares/auth.middleware';
import { getUserRole } from '../utils/rbac';

const router = Router({ mergeParams: true });

// Note: Ensure authentication middleware is used in the parent router

// Get all folders in a workspace
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { workspaceId } = req.params as { workspaceId: string };
    const isArchived = req.query.isArchived === 'true';
    
    const role = await getUserRole(userId, workspaceId);
    if (!role) {
      return res.status(403).json({ error: 'Forbidden access to this workspace' });
    }

    const folders = await prisma.folder.findMany({
      where: { workspaceId, isArchived },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({ folders });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch folders' });
  }
});

// Create a folder in a workspace
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { workspaceId } = req.params as { workspaceId: string };
    const { name, parentId } = req.body;
    
    const role = await getUserRole(userId, workspaceId);
    if (!role) {
      return res.status(403).json({ error: 'Forbidden access to this workspace' });
    }
    if (role === 'VIEWER') {
      return res.status(403).json({ error: 'Viewers cannot create folders' });
    }

    const folder = await prisma.folder.create({
      data: {
        name: name || 'New Folder',
        workspaceId,
        parentId: parentId || null
      }
    });
    
    res.json(folder);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create folder' });
  }
});

// Rename a folder
router.patch('/:folderId', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { workspaceId, folderId } = req.params as { workspaceId: string; folderId: string };
    const { name, isArchived } = req.body;
    
    const folderExists = await prisma.folder.findUnique({ where: { id: folderId } });
    if (!folderExists || folderExists.workspaceId !== workspaceId) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    const role = await getUserRole(userId, workspaceId);
    if (!role) {
      return res.status(403).json({ error: 'Forbidden access to this workspace' });
    }
    if (role === 'VIEWER') {
      return res.status(403).json({ error: 'Viewers cannot edit folders' });
    }

    const folder = await prisma.folder.update({
      where: { id: folderId },
      data: { 
        ...(name !== undefined && { name }),
        ...(isArchived !== undefined && { isArchived })
      }
    });
    
    res.json(folder);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update folder' });
  }
});

// Move a folder
router.patch('/:folderId/move', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { workspaceId, folderId } = req.params as { workspaceId: string; folderId: string };
    const { parentId } = req.body;
    
    const folderExists = await prisma.folder.findUnique({ where: { id: folderId } });
    if (!folderExists || folderExists.workspaceId !== workspaceId) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    const role = await getUserRole(userId, workspaceId);
    if (!role) {
      return res.status(403).json({ error: 'Forbidden access to this workspace' });
    }
    if (role === 'VIEWER') {
      return res.status(403).json({ error: 'Viewers cannot move folders' });
    }

    const folder = await prisma.folder.update({
      where: { id: folderId },
      data: { parentId: parentId || null }
    });
    
    res.json(folder);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to move folder' });
  }
});

// Delete a folder
router.delete('/:folderId', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { workspaceId, folderId } = req.params as { workspaceId: string; folderId: string };
    
    const folderExists = await prisma.folder.findUnique({ where: { id: folderId } });
    if (!folderExists || folderExists.workspaceId !== workspaceId) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    const role = await getUserRole(userId, workspaceId);
    if (!role) {
      return res.status(403).json({ error: 'Forbidden access to this workspace' });
    }
    if (role !== 'OWNER' && role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only owners and admins can permanently delete folders' });
    }

    await prisma.folder.delete({
      where: { id: folderId }
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete folder' });
  }
});

export default router;
