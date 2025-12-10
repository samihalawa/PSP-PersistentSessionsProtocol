import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '../utils/errors';
import { createLogger } from '../utils/logger';

const logger = createLogger('auth-middleware');

/**
 * Authentication middleware
 *
 * This is a simple token-based authentication.
 * In a production environment, you would use a more robust solution like JWT.
 */
export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Skip authentication for certain endpoints
  if (req.path === '/health' || req.path === '/api-docs') {
    return next();
  }

  // Get the token from the authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or invalid Authorization header');
  }

  const token = authHeader.split(' ')[1];

  // In a real implementation, you would validate the token here
  // For now, just check if it's not empty and matches the configured token
  if (!token || token !== process.env.API_TOKEN) {
    logger.warn('Invalid token', {
      token: token.substring(0, 5) + '...',
      ip: req.ip,
    });
    throw new UnauthorizedError('Invalid token');
  }

  // Token is valid, continue
  next();
}
