import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { prisma } from '@nexus/database';

export const getDMHistory = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { otherUserId } = req.params;

    const messages = await prisma.directMessage.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: userId }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        sender: {
          select: { id: true, name: true, username: true, email: true }
        }
      }
    });

    res.json({ messages: messages.reverse() });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch DM history' });
  }
};

export const getDMSummary = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Find all users the current user has exchanged messages with
    const dms = await prisma.directMessage.findMany({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }]
      },
      orderBy: { createdAt: 'desc' },
      include: {
        sender: { select: { id: true, name: true, username: true, email: true } },
        receiver: { select: { id: true, name: true, username: true, email: true } }
      }
    });

    const userMap = new Map();

    for (const dm of dms) {
      const isSender = dm.senderId === userId;
      const otherUser = isSender ? dm.receiver : dm.sender;
      const otherId = otherUser.id;

      if (!userMap.has(otherId)) {
        userMap.set(otherId, {
          user: otherUser,
          lastMessage: dm.content,
          lastMessageAt: dm.createdAt,
          unreadCount: 0
        });
      }
      
      // If I am the receiver and it's not read
      if (!isSender && !dm.isRead) {
        userMap.get(otherId).unreadCount++;
      }
    }

    res.json({ summaries: Array.from(userMap.values()) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch DM summaries' });
  }
};

export const markDMAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { otherUserId } = req.params;

    await prisma.directMessage.updateMany({
      where: {
        senderId: otherUserId,
        receiverId: userId,
        isRead: false
      },
      data: { isRead: true }
    });

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to mark DMs as read' });
  }
};
