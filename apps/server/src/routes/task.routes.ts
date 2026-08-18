import { Router, Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { prisma } from '@nexus/database';
import { authenticateJWT } from '../middlewares/auth.middleware';
import { getUserRole } from '../utils/rbac';
import { NotificationService } from '../services/notification.service';

const router = Router({ mergeParams: true });

router.use(authenticateJWT);

// GET /api/workspaces/:workspaceId/tasks
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId } = req.params as { workspaceId: string };
    
    const tasks = await prisma.actionItem.findMany({
      where: { workspaceId },
      include: {
        assignee: {
          select: { id: true, name: true, email: true }
        },
        document: {
          select: { id: true, title: true }
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
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId } = req.params as { workspaceId: string };
    const { content, status, priority, dueDate, assigneeId, documentId } = req.body;
    
    const role = await getUserRole(req.user!.id, workspaceId);
    if (!role || role === 'VIEWER') {
      return res.status(403).json({ error: 'Viewers cannot create tasks' });
    }

    // Enforce cross-workspace scoping
    if (documentId) {
      const doc = await prisma.document.findUnique({ where: { id: documentId } });
      if (!doc || doc.workspaceId !== workspaceId) {
        return res.status(400).json({ error: 'Invalid document reference' });
      }
    }

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
        },
        document: {
          select: { id: true, title: true }
        }
      }
    });

    if (assigneeId) {
      // Fire-and-forget notification
      NotificationService.createNotification({
        recipientId: assigneeId,
        actorId: req.user!.id,
        workspaceId,
        type: 'TASK_ASSIGNED',
        title: 'New Task Assigned',
        message: `You have been assigned to: ${content}`,
        eventId: `TASK_ASSIGNED:${task.id}:${assigneeId}`,
        taskId: task.id,
      }).catch(err => console.error('Failed to notify assignee:', err));
    }
    
    res.status(201).json({ task });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// PATCH /api/workspaces/:workspaceId/tasks/:taskId
router.patch('/:taskId', async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId, taskId } = req.params as { workspaceId: string; taskId: string };
    const { content, status, priority, dueDate, assigneeId } = req.body;
    
    const role = await getUserRole(req.user!.id, workspaceId);
    if (!role || role === 'VIEWER') {
      return res.status(403).json({ error: 'Viewers cannot update tasks' });
    }

    // Ensure assignee is valid
    if (assigneeId) {
      const assigneeRole = await getUserRole(assigneeId, workspaceId);
      if (!assigneeRole) {
        return res.status(400).json({ error: 'Invalid assignee' });
      }
    }

    const previousTask = await prisma.actionItem.findUnique({ where: { id: taskId } });

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
        },
        document: {
          select: { id: true, title: true }
        }
      }
    });

    if (assigneeId && previousTask?.assigneeId !== assigneeId) {
      NotificationService.createNotification({
        recipientId: assigneeId,
        actorId: req.user!.id,
        workspaceId,
        type: 'TASK_ASSIGNED',
        title: 'Task Assigned',
        message: `You have been assigned to: ${task.content}`,
        eventId: `TASK_ASSIGNED:${task.id}:${assigneeId}`,
        taskId: task.id,
      }).catch(err => console.error('Failed to notify assignee on update:', err));
    }
    
    res.json({ task });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// DELETE /api/workspaces/:workspaceId/tasks/:taskId
router.delete('/:taskId', async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId, taskId } = req.params as { workspaceId: string; taskId: string };
    
    const role = await getUserRole(req.user!.id, workspaceId);
    if (!role || role === 'VIEWER') {
      return res.status(403).json({ error: 'Viewers cannot delete tasks' });
    }

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
