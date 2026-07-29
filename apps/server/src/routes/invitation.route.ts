import { Router } from 'express';
import { getInvitations, acceptInvitation, declineInvitation } from '../controllers/member.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';

const router = Router();

// Protect all invitation routes with the JWT middleware
router.use(authenticateJWT);

// Route: GET /api/invitations
router.get('/', getInvitations);

// Route: PATCH /api/invitations/:workspaceId/accept
router.patch('/:workspaceId/accept', acceptInvitation);

// Route: PATCH /api/invitations/:workspaceId/decline
router.patch('/:workspaceId/decline', declineInvitation);

export default router;
