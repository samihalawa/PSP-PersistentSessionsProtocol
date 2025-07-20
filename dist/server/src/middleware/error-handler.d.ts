import { Request, Response, NextFunction } from 'express';
/**
 * Global error handling middleware
 */
export declare function errorHandler(err: Error, req: Request, res: Response, next: NextFunction): void;
