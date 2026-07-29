import { Response } from 'express';
import { prisma } from '@nexus/database';
import { AuthRequest } from '../middlewares/auth.middleware';

export const getWorkspaceMessages = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { workspaceId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify user has access to workspace
    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    const member = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } }
    });

    if (workspace?.ownerId !== userId && (!member || member.status !== 'ACCEPTED')) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Fetch messages
    const messages = await prisma.message.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
          }
        }
      }
    });

    // Return in ascending order for chat UI
    res.json({ messages: messages.reverse() });
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};
