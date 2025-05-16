import { Request, Response, NextFunction } from 'express';
/**
 * Authentication middleware
 *
 * This is a simple token-based authentication.
 * In a production environment, you would use a more robust solution like JWT.
 */
export declare function authMiddleware(req: Request, res: Response, next: NextFunction): void;
