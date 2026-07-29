import { Router } from 'express';
import multer from 'multer';
import { authenticateJWT } from '../middlewares/auth.middleware';
import { uploadFile, getFiles, deleteFile } from '../controllers/file.controller';

const router = Router();

// Configure multer for memory storage since we upload directly to Supabase
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

router.use(authenticateJWT);

// Route: GET /api/files?workspaceId=...
router.get('/', getFiles);

// Route: POST /api/files/upload
router.post('/upload', upload.single('file'), uploadFile);
// Route: DELETE /api/files/:id
router.delete('/:id', deleteFile);

export default router;
