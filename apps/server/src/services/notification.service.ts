import { prisma } from '@nexus/database';
import { getIo } from '../socket'; // Need to export `io` or use a method to emit to a specific user

export interface CreateNotificationParams {
  recipientId: string;
  actorId?: string;
  workspaceId?: string;
  type: string;
  title: string;
  message?: string;
  eventId?: string;
  documentId?: string;
  taskId?: string;
  inviteId?: string;
  // If true, forces creation even if recipientId === actorId. 
  // By default, self-notifications are suppressed.
  allowSelfNotification?: boolean;
}

export class NotificationService {
  /**
   * Centralized entry point for creating a persistent notification.
   */
  static async createNotification(params: CreateNotificationParams) {
    const {
      recipientId,
      actorId,
      workspaceId,
      type,
      title,
      message,
      eventId,
      documentId,
      taskId,
      inviteId,
      allowSelfNotification = false,
    } = params;

    // Suppress self-notifications by default
    if (!allowSelfNotification && recipientId === actorId) {
      return null;
    }

    try {
      // If eventId is provided, we can use prisma's unique constraint to prevent duplicates.
      // However, upsert or catch unique constraint error is better.
      let notification;
      
      if (eventId) {
        // Attempt to find existing to prevent duplicate
        const existing = await prisma.notification.findUnique({
          where: { eventId }
        });
        if (existing) {
          // If the event already created a notification, we just return it (idempotent)
          return existing;
        }
      }

      notification = await prisma.notification.create({
        data: {
          recipientId,
          actorId,
          workspaceId,
          type,
          title,
          message,
          eventId,
          documentId,
          taskId,
          inviteId,
        }
      });

      // Targeted realtime delivery using Socket.io
      // We assume users join a room with their userId when they connect.
      // E.g., socket.join(`user:${userId}`)
      const io = getIo();
      if (io) {
        io.to(`user:${recipientId}`).emit('notification:new', notification);
      }

      return notification;
    } catch (error) {
      console.error('Error in NotificationService:', error);
      // If error is unique constraint violation on eventId, we can safely ignore it.
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
         // Idempotency safety net
         return await prisma.notification.findUnique({ where: { eventId: eventId! } });
      }
      throw error;
    }
  }
}
