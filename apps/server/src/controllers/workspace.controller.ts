import { Request, Response } from 'express';
import { prisma } from '@nexus/database';
import { AuthRequest } from '../middlewares/auth.middleware';
import { z } from 'zod';

const createWorkspaceSchema = z.object({
  name: z.string().min(1, "Workspace name is required"),
});

// GET /workspaces -> Get all workspaces for the logged in user
export const getWorkspaces = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const workspaces = await prisma.workspace.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ workspaces });
  } catch (error) {
    console.error("Error fetching workspaces:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /workspaces -> Create a new workspace
export const createWorkspace = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { name } = createWorkspaceSchema.parse(req.body);

    const workspace = await prisma.workspace.create({
      data: {
        name,
        ownerId: userId,
      },
    });

    res.status(201).json({ workspace });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues });
    }
    console.error("Error creating workspace:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
