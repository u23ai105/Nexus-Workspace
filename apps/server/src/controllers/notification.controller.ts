import { Response } from 'express';
import { prisma } from '@nexus/database';
import { AuthRequest } from '../middlewares/auth.middleware';

/**
 * GET /api/notifications
 * Returns paginated list of INBOX notifications (archivedAt = null) and invites.
 */
export const getNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const limit = parseInt(req.query.limit as string) || 50;
    const cursor = req.query.cursor as string | undefined;

    // Fetch personal inbox notifications
    const notifications = await prisma.notification.findMany({
      where: { recipientId: userId, archivedAt: null },
      take: limit,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        actor: { select: { id: true, name: true, username: true } },
        workspace: { select: { id: true, name: true } },
      }
    });

    const nextCursor = notifications.length === limit ? notifications[notifications.length - 1].id : null;

    let unifiedItems: any[] = [];

    if (!cursor) {
      const invites = await prisma.workspaceMember.findMany({
        where: { userId, status: 'PENDING' },
        include: {
          workspace: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' }
      });

      unifiedItems = invites.map(inv => ({
        kind: 'invite',
        id: inv.id, 
        workspaceId: inv.workspaceId,
        workspaceName: inv.workspace.name,
        role: inv.role,
        createdAt: inv.createdAt,
      }));
    }

    const mappedNotifications = notifications.map(notif => ({
      kind: 'notification',
      id: notif.id,
      type: notif.type,
      title: notif.title,
      message: notif.message,
      readAt: notif.readAt,
      archivedAt: notif.archivedAt,
      createdAt: notif.createdAt,
      actorName: notif.actor?.name || notif.actor?.username || null,
      workspaceId: notif.workspaceId,
      workspaceName: notif.workspace?.name || null,
      documentId: notif.documentId,
      taskId: notif.taskId,
    }));

    unifiedItems = [...unifiedItems, ...mappedNotifications];

    if (!cursor) {
      unifiedItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    res.status(200).json({
      items: unifiedItems,
      nextCursor
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

/**
 * GET /api/notifications/done
 * Returns paginated list of DONE notifications (archivedAt != null).
 */
export const getDoneNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const limit = parseInt(req.query.limit as string) || 50;
    const cursor = req.query.cursor as string | undefined;

    const notifications = await prisma.notification.findMany({
      where: { recipientId: userId, archivedAt: { not: null } },
      take: limit,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { archivedAt: 'desc' },
      include: {
        actor: { select: { id: true, name: true, username: true } },
        workspace: { select: { id: true, name: true } },
      }
    });

    const nextCursor = notifications.length === limit ? notifications[notifications.length - 1].id : null;

    const mappedNotifications = notifications.map(notif => ({
      kind: 'notification',
      id: notif.id,
      type: notif.type,
      title: notif.title,
      message: notif.message,
      readAt: notif.readAt,
      archivedAt: notif.archivedAt,
      createdAt: notif.createdAt,
      actorName: notif.actor?.name || notif.actor?.username || null,
      workspaceId: notif.workspaceId,
      workspaceName: notif.workspace?.name || null,
      documentId: notif.documentId,
      taskId: notif.taskId,
    }));

    res.status(200).json({
      items: mappedNotifications,
      nextCursor
    });
  } catch (error) {
    console.error('Error fetching done notifications:', error);
    res.status(500).json({ error: 'Failed to fetch done notifications' });
  }
};

/**
 * GET /api/notifications/unread-count
 */
export const getUnreadCount = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Pending invites count towards unread in UI usually, but backend unread count 
    // for badges often just counts actual notifications. Let's do both.
    const notifCount = await prisma.notification.count({
      where: { recipientId: userId, readAt: null, archivedAt: null }
    });
    
    const inviteCount = await prisma.workspaceMember.count({
      where: { userId, status: 'PENDING' }
    });

    res.status(200).json({ unreadCount: notifCount + inviteCount });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
};

/**
 * PATCH /api/notifications/:id/read
 */
export const markAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    
    const { id } = req.params;

    const notif = await prisma.notification.findUnique({ where: { id } });
    if (!notif) return res.status(404).json({ error: 'Notification not found' });
    if (notif.recipientId !== userId) return res.status(403).json({ error: 'Forbidden' });

    const updated = await prisma.notification.update({
      where: { id },
      data: { readAt: new Date() }
    });

    res.status(200).json(updated);
  } catch (error) {
    console.error('Error marking notification read:', error);
    res.status(500).json({ error: 'Failed to mark as read' });
  }
};

/**
 * PATCH /api/notifications/:id/archive
 */
export const archiveNotification = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    
    const { id } = req.params;

    const notif = await prisma.notification.findUnique({ where: { id } });
    if (!notif) return res.status(404).json({ error: 'Notification not found' });
    if (notif.recipientId !== userId) return res.status(403).json({ error: 'Forbidden' });

    const updated = await prisma.notification.update({
      where: { id },
      data: { archivedAt: new Date(), readAt: notif.readAt || new Date() } // also mark read if it wasn't
    });

    res.status(200).json(updated);
  } catch (error) {
    console.error('Error archiving notification:', error);
    res.status(500).json({ error: 'Failed to archive notification' });
  }
};

/**
 * PATCH /api/notifications/archive-all
 */
export const archiveAll = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    await prisma.notification.updateMany({
      where: { recipientId: userId, archivedAt: null },
      data: { archivedAt: new Date(), readAt: new Date() } // implicitly mark read if they weren't
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error archiving all notifications:', error);
    res.status(500).json({ error: 'Failed to archive all' });
  }
};

/**
 * PATCH /api/notifications/read-all
 */
export const markAllAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    await prisma.notification.updateMany({
      where: { recipientId: userId, readAt: null },
      data: { readAt: new Date() }
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error marking all read:', error);
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
};
