import * as crypto from 'crypto';

/**
 * Generates a random ID for sessions
 * @returns A random ID string
 */
export function generateId(): string {
  // Generate a UUID v4 for unique session IDs
  return crypto.randomUUID();
}
