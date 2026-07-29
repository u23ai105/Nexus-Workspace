import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extend Express Request object to include our custom user payload
export interface AuthRequest extends Request {
  user?: { id: string; email: string };
  file?: any;
}

export const authenticateJWT = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    // Expected format: "Bearer <token>"
    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret', (err, user) => {
      if (err) {
        return res.status(403).json({ error: 'Invalid or expired token' });
      }

      // Attach the decoded user payload to the request object
      req.user = user as { id: string; email: string };
      next();
    });
  } else {
    res.status(401).json({ error: 'Authorization header missing' });
  }
};
