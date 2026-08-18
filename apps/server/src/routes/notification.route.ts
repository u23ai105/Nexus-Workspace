import { Router } from 'express';
import { 
  getNotifications, 
  getDoneNotifications, 
  getUnreadCount, 
  markAsRead, 
  markAllAsRead, 
  archiveNotification, 
  archiveAll 
} from '../controllers/notification.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';

const router = Router();

// Protect all notification routes
router.use(authenticateJWT);

// Route: GET /api/notifications
router.get('/', getNotifications);

// Route: GET /api/notifications/done
router.get('/done', getDoneNotifications);

// Route: GET /api/notifications/unread-count
router.get('/unread-count', getUnreadCount);

// Route: PATCH /api/notifications/read-all
router.patch('/read-all', markAllAsRead);

// Route: PATCH /api/notifications/archive-all
router.patch('/archive-all', archiveAll);

// Route: PATCH /api/notifications/:id/read
router.patch('/:id/read', markAsRead);

// Route: PATCH /api/notifications/:id/archive
router.patch('/:id/archive', archiveNotification);

export default router;
