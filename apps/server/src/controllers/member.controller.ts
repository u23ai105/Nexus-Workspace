import { Request, Response } from 'express';
import { prisma } from '@nexus/database';
import { AuthRequest } from '../middlewares/auth.middleware';
import { z } from 'zod';

const inviteSchema = z.object({
  email: z.string().email("Invalid email format"),
  role: z.enum(['OWNER', 'ADMIN', 'EDITOR', 'VIEWER']).default('VIEWER'),
});

const updateRoleSchema = z.object({
  role: z.enum(['OWNER', 'ADMIN', 'EDITOR', 'VIEWER']),
});

// Helper to get the role of a user in a workspace
const getCurrentUserRole = async (userId: string, workspaceId: string) => {
  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
  if (workspace?.ownerId === userId) return 'OWNER';
  
  const member = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } }
  });
  if (member && member.status === 'ACCEPTED') return member.role;
  return null;
};

// GET /workspaces/:workspaceId/members
export const getMembers = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { workspaceId } = req.params;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const hasAccess = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } }
    });
    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });

    if (!hasAccess && workspace?.ownerId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: {
        user: {
          select: { id: true, name: true, email: true, username: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    res.status(200).json({ members });
  } catch (error) {
    console.error("Error fetching members:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /workspaces/:workspaceId/members/invite
export const inviteMember = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { workspaceId } = req.params;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const currentUserRole = await getCurrentUserRole(userId, workspaceId);
    if (currentUserRole !== 'OWNER' && currentUserRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden: Requires ADMIN or OWNER role' });
    }

    const { email, role } = inviteSchema.parse(req.body);

    const targetUser = await prisma.user.findUnique({ where: { email } });
    if (!targetUser) {
      return res.status(404).json({ error: 'User with this email not found' });
    }

    const existingMember = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: targetUser.id, workspaceId } }
    });
    
    if (existingMember) {
      return res.status(400).json({ error: 'User is already a member of this workspace' });
    }

    const newMember = await prisma.workspaceMember.create({
      data: {
        workspaceId,
        userId: targetUser.id,
        role,
        status: 'PENDING'
      },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    // Emit real-time notification
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${targetUser.id}`).emit('new-invitation');
    }

    res.status(201).json({ member: newMember });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues });
    }
    console.error("Error inviting member:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// PATCH /workspaces/:workspaceId/members/:memberId
export const updateMemberRole = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { workspaceId, memberId } = req.params;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const currentUserRole = await getCurrentUserRole(userId, workspaceId);
    if (currentUserRole !== 'OWNER' && currentUserRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden: Requires ADMIN or OWNER role' });
    }

    const { role } = updateRoleSchema.parse(req.body);

    const targetMember = await prisma.workspaceMember.findUnique({
      where: { id: memberId, workspaceId }
    });

    if (!targetMember) return res.status(404).json({ error: 'Member not found' });

    // Admins cannot promote someone to OWNER or ADMIN, nor can they change an existing OWNER's or ADMIN's role
    if (currentUserRole === 'ADMIN') {
      if (role === 'OWNER' || role === 'ADMIN') {
        return res.status(403).json({ error: 'Forbidden: Admins cannot grant OWNER or ADMIN roles' });
      }
      if (targetMember.role === 'OWNER' || targetMember.role === 'ADMIN') {
        return res.status(403).json({ error: 'Forbidden: Admins cannot change the role of an OWNER or ADMIN' });
      }
    }

    // Owner cannot demote themselves to non-owner if they are the only owner
    if (targetMember.role === 'OWNER' && role !== 'OWNER') {
      const ownersCount = await prisma.workspaceMember.count({
        where: { workspaceId, role: 'OWNER' }
      });
      if (ownersCount <= 1) {
        return res.status(400).json({ error: 'Cannot demote the last owner of the workspace' });
      }
    }

    const updatedMember = await prisma.workspaceMember.update({
      where: { id: memberId, workspaceId },
      data: { role },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    res.status(200).json({ member: updatedMember });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues });
    }
    console.error("Error updating member role:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// DELETE /workspaces/:workspaceId/members/:memberId
export const removeMember = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { workspaceId, memberId } = req.params;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const currentUserRole = await getCurrentUserRole(userId, workspaceId);
    
    const targetMember = await prisma.workspaceMember.findUnique({
      where: { id: memberId }
    });

    if (!targetMember) return res.status(404).json({ error: 'Member not found' });
    
    // A user can always remove themselves (leave workspace)
    if (targetMember.userId !== userId) {
      if (currentUserRole !== 'OWNER' && currentUserRole !== 'ADMIN') {
        return res.status(403).json({ error: 'Forbidden: Requires ADMIN or OWNER role to remove others' });
      }

      // Admins cannot remove Owners or other Admins
      if (currentUserRole === 'ADMIN' && (targetMember.role === 'OWNER' || targetMember.role === 'ADMIN')) {
        return res.status(403).json({ error: 'Forbidden: Admins cannot remove an OWNER or ADMIN' });
      }
    }
    
    if (targetMember.role === 'OWNER') {
      const ownersCount = await prisma.workspaceMember.count({
        where: { workspaceId, role: 'OWNER' }
      });
      if (ownersCount <= 1) {
        return res.status(400).json({ error: 'Cannot remove the last owner of the workspace' });
      }
    }

    await prisma.workspaceMember.delete({
      where: { id: memberId, workspaceId }
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`user:${targetMember.userId}`).emit('workspace-removed', { workspaceId });
    }

    res.status(200).json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error("Error removing member:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /invitations
export const getInvitations = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const invitations = await prisma.workspaceMember.findMany({
      where: { userId, status: 'PENDING' },
      include: {
        workspace: {
          select: { id: true, name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ invitations });
  } catch (error) {
    console.error("Error fetching invitations:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// PATCH /invitations/:workspaceId/accept
export const acceptInvitation = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { workspaceId } = req.params;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const member = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } }
    });

    if (!member || member.status !== 'PENDING') {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    const updatedMember = await prisma.workspaceMember.update({
      where: { id: member.id },
      data: { status: 'ACCEPTED' }
    });

    res.status(200).json({ member: updatedMember });
  } catch (error) {
    console.error("Error accepting invitation:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// PATCH /invitations/:workspaceId/decline
export const declineInvitation = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { workspaceId } = req.params;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const member = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } }
    });

    if (!member || member.status !== 'PENDING') {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    // Just delete the member record to decline
    await prisma.workspaceMember.delete({
      where: { id: member.id }
    });

    res.status(200).json({ message: 'Invitation declined successfully' });
  } catch (error) {
    console.error("Error declining invitation:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
