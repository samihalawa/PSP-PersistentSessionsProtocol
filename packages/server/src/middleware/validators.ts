import { Request, Response, NextFunction } from 'express';
import { BadRequestError } from '../utils/errors';

/**
 * Validates session creation/update requests
 */
export function validateSession(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const { name } = req.body;

  // Validate required fields
  if (!name) {
    throw new BadRequestError('Session name is required');
  }

  // Validate name
  if (typeof name !== 'string' || name.trim().length === 0) {
    throw new BadRequestError('Session name must be a non-empty string');
  }

  // Validate tags if present
  if (req.body.tags !== undefined) {
    if (!Array.isArray(req.body.tags)) {
      throw new BadRequestError('Tags must be an array');
    }

    // Check if all tags are strings
    for (const tag of req.body.tags) {
      if (typeof tag !== 'string' || tag.trim().length === 0) {
        throw new BadRequestError('Tags must be non-empty strings');
      }
    }
  }

  next();
}
