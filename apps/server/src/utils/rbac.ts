import { prisma } from '@nexus/database';

/**
 * Get user's role in a workspace
 * Returns 'OWNER', 'ADMIN', 'EDITOR', 'VIEWER', or null if no access
 */
export const getUserRole = async (userId: string, workspaceId: string): Promise<string | null> => {
  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
  if (!workspace) return null;
  if (workspace.ownerId === userId) return 'OWNER';
  
  const member = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } }
  });
  
  if (member && member.status === 'ACCEPTED') return member.role;
  return null;
};
