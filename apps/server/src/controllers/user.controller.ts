import { Request, Response } from 'express';
import { prisma } from '@nexus/database';

export const searchUsers = async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    
    if (!query || query.length < 2) {
      return res.json({ users: [] });
    }

    // Use current user's ID to exclude them from the search results
    // req.user should be populated by the auth middleware
    const currentUserId = (req as any).user?.id;

    const users = await prisma.user.findMany({
      where: {
        AND: [
          currentUserId ? { id: { not: currentUserId } } : {},
          {
            OR: [
              { username: { contains: query, mode: 'insensitive' } },
              { email: { contains: query, mode: 'insensitive' } }
            ]
          }
        ]
      },
      select: {
        id: true,
        username: true,
        email: true,
        name: true
      },
      take: 10
    });

    res.json({ users });
  } catch (error) {
    console.error("Search users error:", error);
    res.status(500).json({ error: 'Failed to search users' });
  }
};
