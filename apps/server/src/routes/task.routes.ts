import { Router } from 'express';
import { prisma } from '@nexus/database';
import { authenticateJWT } from '../middlewares/auth.middleware';

const router = Router({ mergeParams: true });

router.use(authenticateJWT);

// GET /api/workspaces/:workspaceId/tasks
router.get('/', async (req, res) => {
  try {
    const { workspaceId } = req.params as { workspaceId: string };
    
    const tasks = await prisma.actionItem.findMany({
      where: { workspaceId },
      include: {
        assignee: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({ tasks });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// POST /api/workspaces/:workspaceId/tasks
router.post('/', async (req, res) => {
  try {
    const { workspaceId } = req.params as { workspaceId: string };
    const { content, status, priority, dueDate, assigneeId, documentId } = req.body;
    
    const task = await prisma.actionItem.create({
      data: {
        content,
        status: status || 'TODO',
        priority: priority || 'MEDIUM',
        dueDate: dueDate ? new Date(dueDate) : null,
        workspaceId,
        assigneeId: assigneeId || null,
        documentId: documentId || null
      },
      include: {
        assignee: {
          select: { id: true, name: true, email: true }
        }
      }
    });
    
    res.status(201).json({ task });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// PATCH /api/workspaces/:workspaceId/tasks/:taskId
router.patch('/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const { content, status, priority, dueDate, assigneeId } = req.body;
    
    const task = await prisma.actionItem.update({
      where: { id: taskId },
      data: {
        ...(content !== undefined && { content }),
        ...(status !== undefined && { status }),
        ...(priority !== undefined && { priority }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(assigneeId !== undefined && { assigneeId })
      },
      include: {
        assignee: {
          select: { id: true, name: true, email: true }
        }
      }
    });
    
    res.json({ task });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// DELETE /api/workspaces/:workspaceId/tasks/:taskId
router.delete('/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    
    await prisma.actionItem.delete({
      where: { id: taskId }
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

export default router;
