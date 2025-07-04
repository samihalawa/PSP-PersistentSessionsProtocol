import { Request, Response, NextFunction } from 'express';
/**
 * Validates session creation/update requests
 */
export declare function validateSession(req: Request, res: Response, next: NextFunction): void;
