/**
 * PSP Adapter Utilities
 *
 * Common utilities for session manipulation and validation.
 */

import { createHash } from 'crypto';
import type {
  PSPSession,
  PSPCookie,
  PSPOrigin,
  PSPSessionSummary,
} from '@samihalawa/psp-types';

/**
 * Calculate checksum for PSP session
 */
export function calculateChecksum(session: PSPSession): string {
  const content = JSON.stringify({
    cookies: session.cookies,
    origins: session.origins,
    indexedDB: session.indexedDB,
  });
  return createHash('sha256').update(content).digest('hex');
}

/**
 * Validate PSP session checksum
 */
export function validateChecksum(session: PSPSession): boolean {
  if (!session.checksum) {
    return true; // No checksum to validate
  }
  return calculateChecksum(session) === session.checksum;
}

/**
 * Add checksum to PSP session
 */
export function addChecksum(session: PSPSession): PSPSession {
  return {
    ...session,
    checksum: calculateChecksum(session),
  };
}

/**
 * Check if session has expired
 */
export function isSessionExpired(session: PSPSession): boolean {
  if (!session.timestamps.expires) {
    return false;
  }
  return new Date(session.timestamps.expires) < new Date();
}

/**
 * Get session age in milliseconds
 */
export function getSessionAge(session: PSPSession): number {
  const created = new Date(session.timestamps.created);
  return Date.now() - created.getTime();
}

/**
 * Filter cookies by domain
 */
export function filterCookiesByDomain(
  cookies: PSPCookie[],
  domain: string
): PSPCookie[] {
  const normalizedDomain = domain.toLowerCase();
  return cookies.filter((cookie) => {
    const cookieDomain = cookie.domain.toLowerCase().replace(/^\./, '');
    return (
      cookieDomain === normalizedDomain ||
      normalizedDomain.endsWith('.' + cookieDomain)
    );
  });
}

/**
 * Filter origins by pattern
 */
export function filterOriginsByPattern(
  origins: PSPOrigin[],
  pattern: string | RegExp
): PSPOrigin[] {
  const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
  return origins.filter((origin) => regex.test(origin.origin));
}

/**
 * Merge two PSP sessions (cookies and origins)
 */
export function mergeSessions(
  base: PSPSession,
  overlay: PSPSession
): PSPSession {
  const now = new Date().toISOString();

  // Merge cookies (overlay takes precedence)
  const cookieMap = new Map<string, PSPCookie>();
  for (const cookie of base.cookies) {
    const key = `${cookie.domain}|${cookie.path}|${cookie.name}`;
    cookieMap.set(key, cookie);
  }
  for (const cookie of overlay.cookies) {
    const key = `${cookie.domain}|${cookie.path}|${cookie.name}`;
    cookieMap.set(key, cookie);
  }

  // Merge origins (overlay takes precedence)
  const originMap = new Map<string, PSPOrigin>();
  for (const origin of base.origins) {
    originMap.set(origin.origin, origin);
  }
  for (const origin of overlay.origins) {
    const existing = originMap.get(origin.origin);
    if (existing) {
      // Merge localStorage entries
      const entryMap = new Map<string, string>();
      for (const entry of existing.localStorage) {
        entryMap.set(entry.key, entry.value);
      }
      for (const entry of origin.localStorage) {
        entryMap.set(entry.key, entry.value);
      }
      originMap.set(origin.origin, {
        origin: origin.origin,
        localStorage: Array.from(entryMap.entries()).map(([key, value]) => ({
          key,
          value,
        })),
      });
    } else {
      originMap.set(origin.origin, origin);
    }
  }

  return {
    ...base,
    cookies: Array.from(cookieMap.values()),
    origins: Array.from(originMap.values()),
    timestamps: {
      ...base.timestamps,
      updated: now,
    },
  };
}

/**
 * Create session summary for listing
 */
export function createSessionSummary(session: PSPSession): PSPSessionSummary {
  return {
    id: session.id,
    name: session.name,
    tags: session.tags,
    cookieCount: session.cookies.length,
    originCount: session.origins.length,
    source: session.source,
    timestamps: session.timestamps,
  };
}

/**
 * Remove expired cookies from session
 */
export function removeExpiredCookies(session: PSPSession): PSPSession {
  const now = Date.now() / 1000; // Current time in seconds
  return {
    ...session,
    cookies: session.cookies.filter((cookie) => {
      if (!cookie.expires || cookie.expires === -1) {
        return true; // Session cookie, keep it
      }
      return cookie.expires > now;
    }),
    timestamps: {
      ...session.timestamps,
      updated: new Date().toISOString(),
    },
  };
}

/**
 * Sanitize session for export (remove sensitive metadata)
 */
export function sanitizeSession(session: PSPSession): PSPSession {
  return {
    ...session,
    source: {
      ...session.source,
      profilePath: undefined, // Remove local path
    },
  };
}

/**
 * Clone session with new ID
 */
export function cloneSession(
  session: PSPSession,
  newId: string,
  newName?: string
): PSPSession {
  const now = new Date().toISOString();
  return {
    ...session,
    id: newId,
    name: newName || `${session.name} (copy)`,
    timestamps: {
      ...session.timestamps,
      created: now,
      updated: now,
    },
  };
}

/**
 * Get cookie statistics
 */
export function getCookieStats(session: PSPSession): {
  total: number;
  httpOnly: number;
  secure: number;
  sessionCookies: number;
  persistentCookies: number;
  domains: number;
} {
  const domains = new Set(session.cookies.map((c) => c.domain));
  return {
    total: session.cookies.length,
    httpOnly: session.cookies.filter((c) => c.httpOnly).length,
    secure: session.cookies.filter((c) => c.secure).length,
    sessionCookies: session.cookies.filter(
      (c) => !c.expires || c.expires === -1
    ).length,
    persistentCookies: session.cookies.filter(
      (c) => c.expires && c.expires !== -1
    ).length,
    domains: domains.size,
  };
}

/**
 * Get localStorage statistics
 */
export function getLocalStorageStats(session: PSPSession): {
  origins: number;
  totalEntries: number;
  totalSize: number;
} {
  let totalEntries = 0;
  let totalSize = 0;

  for (const origin of session.origins) {
    totalEntries += origin.localStorage.length;
    for (const entry of origin.localStorage) {
      totalSize += entry.key.length + entry.value.length;
    }
  }

  return {
    origins: session.origins.length,
    totalEntries,
    totalSize,
  };
}
