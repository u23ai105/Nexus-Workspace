import { Router } from 'express';
import { getWorkspaces, createWorkspace } from '../controllers/workspace.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';

const router = Router();

// Protect all workspace routes with the JWT middleware
router.use(authenticateJWT);

// Route: GET /api/workspaces
router.get('/', getWorkspaces);

// Route: POST /api/workspaces
router.post('/', createWorkspace);

export default router;
