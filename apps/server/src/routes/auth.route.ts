import { Router } from 'express';
import { register, login } from '../controllers/auth.controller';

const router = Router();

// Route: POST /auth/register
router.post('/register', register);

// Route: POST /auth/login
router.post('/login', login);

export default router;
