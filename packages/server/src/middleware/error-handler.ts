import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { createLogger } from '../utils/logger';

const logger = createLogger('error-handler');

/**
 * Global error handling middleware
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log the error
  logger.error(err.message, {
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Handle AppError (known application errors)
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        message: err.message,
        code: err.statusCode,
      },
    });
    return;
  }

  // Handle other errors
  res.status(500).json({
    error: {
      message: 'Internal Server Error',
      code: 500,
    },
  });
}
