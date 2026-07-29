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
      where: {
        OR: [
          { ownerId: userId },
          { members: { some: { userId: userId, status: 'ACCEPTED' } } }
        ]
      },
      include: {
        members: {
          where: { userId }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const workspacesWithRole = workspaces.map(ws => {
      let role = 'VIEWER';
      if (ws.ownerId === userId) {
        role = 'OWNER';
      } else if (ws.members.length > 0) {
        role = ws.members[0].role;
      }
      
      const { members, ...workspaceData } = ws;
      return {
        ...workspaceData,
        userRole: role
      };
    });

    res.status(200).json({ workspaces: workspacesWithRole });
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
        members: {
          create: {
            userId: userId,
            role: 'OWNER',
            status: 'ACCEPTED'
          }
        }
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

// DELETE /workspaces/:id -> Delete a workspace
export const deleteWorkspace = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const workspaceId = req.params.id;
    if (!workspaceId) return res.status(400).json({ error: 'Workspace ID required' });

    // Verify ownership
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId }
    });

    if (!workspace) return res.status(404).json({ error: 'Workspace not found' });
    if (workspace.ownerId !== userId) return res.status(403).json({ error: 'Forbidden' });

    await prisma.workspace.delete({
      where: { id: workspaceId }
    });

    res.status(200).json({ message: 'Workspace deleted successfully' });
  } catch (error) {
    console.error("Error deleting workspace:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateWorkspaceSchema = z.object({
  name: z.string().min(1, "Workspace name is required"),
});

// PATCH /workspaces/:id -> Update a workspace
export const updateWorkspace = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const workspaceId = req.params.id;
    if (!workspaceId) return res.status(400).json({ error: 'Workspace ID required' });

    const { name } = updateWorkspaceSchema.parse(req.body);

    // Verify ownership or admin role
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: { members: { where: { userId, status: 'ACCEPTED' } } }
    });

    if (!workspace) return res.status(404).json({ error: 'Workspace not found' });
    
    let isAuthorized = false;
    if (workspace.ownerId === userId) {
      isAuthorized = true;
    } else if (workspace.members.length > 0 && workspace.members[0].role === 'ADMIN') {
      isAuthorized = true;
    }

    if (!isAuthorized) {
      return res.status(403).json({ error: 'Forbidden. Only owners and admins can rename workspaces.' });
    }

    const updatedWorkspace = await prisma.workspace.update({
      where: { id: workspaceId },
      data: { name: name.trim() }
    });

    res.status(200).json({ workspace: updatedWorkspace });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues });
    }
    console.error("Error updating workspace:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
