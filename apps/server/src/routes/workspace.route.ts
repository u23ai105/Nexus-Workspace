import { Router } from 'express';
import { getWorkspaces, createWorkspace, deleteWorkspace, updateWorkspace, getActivity, emptyTrash } from '../controllers/workspace.controller';
import { getMembers, inviteMember, updateMemberRole, removeMember } from '../controllers/member.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';

const router = Router();

// Protect all workspace routes with the JWT middleware
router.use(authenticateJWT);

// Route: GET /api/workspaces
router.get('/', getWorkspaces);

// Route: POST /api/workspaces
router.post('/', createWorkspace);

// Route: DELETE /api/workspaces/:id
router.delete('/:id', deleteWorkspace);

// Route: PATCH /api/workspaces/:id
router.patch('/:id', updateWorkspace);

// Route: GET /api/workspaces/:workspaceId/activity
router.get('/:workspaceId/activity', getActivity);

// --- Workspace Member Routes ---
router.get('/:workspaceId/members', getMembers);
router.post('/:workspaceId/members/invite', inviteMember);
router.patch('/:workspaceId/members/:memberId', updateMemberRole);
router.delete('/:workspaceId/members/:memberId', removeMember);

// Route: DELETE /api/workspaces/:workspaceId/trash
router.delete('/:workspaceId/trash', emptyTrash);

export default router;
