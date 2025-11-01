// Simple token authentication middleware

import { Request, Response, NextFunction } from 'express';
import { config } from '../utils/config';
import { sendError, AppError } from '../utils/errors';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
  };
}

export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    sendError(res, new AppError('Authentication token required', 401));
    return;
  }

  // Simple token comparison
  if (token !== config.apiToken) {
    sendError(res, new AppError('Invalid token', 401));
    return;
  }

  req.user = { userId: 'api-user' };
  next();
};

