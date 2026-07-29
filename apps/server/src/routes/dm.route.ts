import { Router } from 'express';
import { getDMHistory, getDMSummary, markDMAsRead } from '../controllers/dm.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticateJWT);

router.get('/summary', getDMSummary);
router.get('/:otherUserId', getDMHistory);
router.patch('/:otherUserId/read', markDMAsRead);

export default router;
