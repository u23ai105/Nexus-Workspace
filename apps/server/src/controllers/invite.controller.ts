import { Request, Response } from 'express';
import { prisma } from '@nexus/database';
import { AuthRequest } from '../middlewares/auth.middleware';
import crypto from 'crypto';

// Helper to reliably get user's role in a workspace
const getUserRole = async (userId: string, workspaceId: string): Promise<string | null> => {
  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
  if (workspace?.ownerId === userId) return 'OWNER';
  const member = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } }
  });
  if (member && member.status === 'ACCEPTED') return member.role;
  return null;
};

// Generate a cryptographically secure token
const generateToken = () => crypto.randomBytes(32).toString('hex');

// Hash the token for database storage
const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

/**
 * POST /api/workspaces/:workspaceId/invites
 * Generates or regenerates an invite link. Revokes old active ones.
 */
export const generateWorkspaceInvite = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { workspaceId } = req.params;
    const role = await getUserRole(userId, workspaceId);

    // Only OWNER or ADMIN can generate invites
    if (role !== 'OWNER' && role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden. Only admins can generate invite links.' });
    }

    const requestedDefaultRole = req.body.defaultRole || 'VIEWER';
    if (requestedDefaultRole !== 'VIEWER' && requestedDefaultRole !== 'EDITOR') {
      return res.status(400).json({ error: 'Invalid default role. Must be VIEWER or EDITOR.' });
    }

    // Revoke any existing active invites for this workspace
    await prisma.workspaceInvite.updateMany({
      where: {
        workspaceId,
        expiresAt: { gt: new Date() } // currently active
      },
      data: {
        expiresAt: new Date() // expire immediately
      }
    });

    const rawToken = generateToken();
    const tokenHash = hashToken(rawToken);

    // Default expiration: 7 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.workspaceInvite.create({
      data: {
        workspaceId,
        tokenHash,
        createdById: userId,
        defaultRole: requestedDefaultRole,
        expiresAt
      }
    });

    // We only return the raw token ONCE.
    res.status(201).json({ token: rawToken });
  } catch (error) {
    console.error("Error generating invite:", error);
    res.status(500).json({ error: 'Failed to generate invite' });
  }
};

/**
 * GET /api/workspaces/invites/preview/:token
 * Unauthenticated preview of an invite.
 */
export const previewWorkspaceInvite = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    if (!token) return res.status(400).json({ error: 'Token is required' });

    const tokenHash = hashToken(token);

    const invite = await prisma.workspaceInvite.findUnique({
      where: { tokenHash },
      include: {
        workspace: {
          select: { name: true, owner: { select: { name: true, username: true } } }
        }
      }
    });

    if (!invite || (invite.expiresAt && invite.expiresAt < new Date())) {
      return res.status(404).json({ error: 'Invalid or expired invite link' });
    }

    res.status(200).json({
      workspaceName: invite.workspace.name,
      ownerName: invite.workspace.owner.name || invite.workspace.owner.username || 'Someone'
    });
  } catch (error) {
    console.error("Error previewing invite:", error);
    res.status(500).json({ error: 'Failed to preview invite' });
  }
};

/**
 * POST /api/workspaces/invites/:token/join
 * Join the workspace using the invite link.
 */
export const joinWorkspaceViaInvite = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { token } = req.params;
    if (!token) return res.status(400).json({ error: 'Token is required' });

    const tokenHash = hashToken(token);

    const invite = await prisma.workspaceInvite.findUnique({
      where: { tokenHash }
    });

    if (!invite || (invite.expiresAt && invite.expiresAt < new Date())) {
      return res.status(404).json({ error: 'Invalid or expired invite link' });
    }

    // Ensure workspace still exists
    const workspace = await prisma.workspace.findUnique({ where: { id: invite.workspaceId } });
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace no longer exists' });
    }

    // Check if user is already a member or owner
    if (workspace.ownerId === userId) {
      return res.status(200).json({ message: 'Already a member', workspaceId: workspace.id });
    }

    const existingMember = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId: invite.workspaceId } }
    });

    if (existingMember) {
      return res.status(200).json({ message: 'Already a member', workspaceId: workspace.id });
    }

    // Add as member with defaultRole
    await prisma.workspaceMember.create({
      data: {
        userId,
        workspaceId: invite.workspaceId,
        role: invite.defaultRole,
        status: 'ACCEPTED'
      }
    });

    res.status(200).json({ message: 'Successfully joined workspace', workspaceId: workspace.id });
  } catch (error) {
    console.error("Error joining workspace via invite:", error);
    res.status(500).json({ error: 'Failed to join workspace' });
  }
};
