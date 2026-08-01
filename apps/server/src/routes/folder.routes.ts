import { Router } from 'express';
import { prisma } from '@nexus/database';

const router = Router({ mergeParams: true });

// Note: Ensure authentication middleware is used in the parent router

// Get all folders in a workspace
router.get('/', async (req, res) => {
  try {
    const { workspaceId } = req.params as { workspaceId: string };
    const isArchived = req.query.isArchived === 'true';
    
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
router.post('/', async (req, res) => {
  try {
    const { workspaceId } = req.params as { workspaceId: string };
    const { name, parentId } = req.body;
    
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
router.patch('/:folderId', async (req, res) => {
  try {
    const { folderId } = req.params;
    const { name, isArchived } = req.body;
    
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
router.patch('/:folderId/move', async (req, res) => {
  try {
    const { folderId } = req.params;
    const { parentId } = req.body;
    
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
router.delete('/:folderId', async (req, res) => {
  try {
    const { folderId } = req.params;
    
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
