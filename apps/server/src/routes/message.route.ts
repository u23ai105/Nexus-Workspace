import { Router } from 'express';
import { getWorkspaceMessages } from '../controllers/message.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';

const router = Router({ mergeParams: true });

// Get messages for a workspace (workspaceId comes from parent router in index.ts)
router.get('/', authenticateJWT, getWorkspaceMessages);

export default router;
