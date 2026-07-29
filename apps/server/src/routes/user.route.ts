import { Router } from 'express';
import { searchUsers } from '../controllers/user.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';

const router = Router();

// Search users by username or email
router.get('/search', authenticateJWT, searchUsers);

export default router;
