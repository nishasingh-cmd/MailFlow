import { Request, Response, NextFunction } from 'express';
import 'multer';
import { verifyAccessToken, JwtTokenPayload } from '../utils/jwt';

export interface AuthenticatedRequest extends Request {
  user?: JwtTokenPayload;
  file?: Express.Multer.File;
}

export function authenticateUser(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Missing or malformed Authorization header' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized: Invalid or expired access token' });
    return;
  }
}
