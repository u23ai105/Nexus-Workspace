import { Router } from 'express';
import { aiPrompt, workspaceChat } from '../controllers/ai.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';

const router = Router();

// Apply auth middleware to all AI routes
router.use(authenticateJWT);

router.post('/prompt', aiPrompt);
router.post('/workspace-chat', workspaceChat);

export default router;
