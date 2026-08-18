import { Router } from 'express';
import {
  getDocuments,
  getDocumentById,
  createDocument,
  updateDocument,
  deleteDocument,
  favoriteDocument,
  unfavoriteDocument,
} from '../controllers/document.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';

const router = Router();

// Protect all document routes with the JWT middleware
router.use(authenticateJWT);

// Route: GET /api/documents?workspaceId=...&isArchived=false
router.get('/', getDocuments);

// Route: GET /api/documents/:id
router.get('/:id', getDocumentById);

// Route: POST /api/documents -> create with smart untitled auto-increment
router.post('/', createDocument);

// Route: PATCH /api/documents/:id -> update title / archive / textContent
router.patch('/:id', updateDocument);

// Route: DELETE /api/documents/:id -> permanently delete
router.delete('/:id', deleteDocument);

// Route: POST /api/documents/:id/favorite -> favorite document
router.post('/:id/favorite', favoriteDocument);

// Route: DELETE /api/documents/:id/favorite -> unfavorite document
router.delete('/:id/favorite', unfavoriteDocument);

export default router;
