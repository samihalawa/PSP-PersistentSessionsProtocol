/**
 * Chrome DevTools Protocol (CDP) Adapter for PSP
 *
 * Converts between PSP session format and CDP cookies/storage.
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  PSPSession,
  PSPCookie,
  PSPOrigin,
  PSPBrowserContext,
  PSPSource,
  CDPCookie,
} from '@samihalawa/psp-types';

export interface CDPToPSPOptions {
  name: string;
  description?: string;
  tags?: string[];
  profileName?: string;
  profilePath?: string;
  userAgent?: string;
  viewport?: { width: number; height: number };
}

export interface CDPLocalStorageData {
  origin: string;
  entries: Array<{ key: string; value: string }>;
}

/**
 * Convert CDP cookies to PSP session format
 */
export function cdpToPSP(
  cookies: CDPCookie[],
  localStorageData: CDPLocalStorageData[] = [],
  options: CDPToPSPOptions
): PSPSession {
  const now = new Date().toISOString();

  // Convert CDP cookies to PSP format (preserving all attributes)
  const pspCookies: PSPCookie[] = cookies.map((cookie) => ({
    name: cookie.name,
    value: cookie.value,
    domain: cookie.domain,
    path: cookie.path,
    expires: cookie.session ? undefined : cookie.expires,
    httpOnly: cookie.httpOnly,
    secure: cookie.secure,
    sameSite: cookie.sameSite ?? 'Lax',
    priority: cookie.priority,
    sameParty: cookie.sameParty,
    sourceScheme: cookie.sourceScheme,
    sourcePort: cookie.sourcePort,
    partitionKey: cookie.partitionKey,
  }));

  // Convert localStorage data to PSP format
  const origins: PSPOrigin[] = localStorageData.map((data) => ({
    origin: data.origin,
    localStorage: data.entries.map((entry) => ({
      key: entry.key,
      value: entry.value,
    })),
  }));

  // Build browser context
  const browserContext: PSPBrowserContext = {
    userAgent: options.userAgent ||
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    viewport: options.viewport || {
      width: 1920,
      height: 1080,
    },
  };

  // Build source metadata
  const source: PSPSource = {
    type: 'chrome',
    captureMethod: 'cdp',
    profileName: options.profileName,
    profilePath: options.profilePath,
  };

  return {
    $schema: 'https://psp.dev/schema/v2.json',
    protocolVersion: '2.0.0',
    id: uuidv4(),
    name: options.name,
    description: options.description,
    tags: options.tags,
    cookies: pspCookies,
    origins,
    browserContext,
    source,
    timestamps: {
      created: now,
      updated: now,
      captured: now,
    },
  };
}

/**
 * Convert PSP session to CDP cookie format
 */
export function pspToCDP(session: PSPSession): CDPCookie[] {
  return session.cookies.map((cookie) => ({
    name: cookie.name,
    value: cookie.value,
    domain: cookie.domain,
    path: cookie.path,
    expires: cookie.expires ?? -1,
    size: cookie.name.length + cookie.value.length,
    httpOnly: cookie.httpOnly,
    secure: cookie.secure,
    session: !cookie.expires || cookie.expires === -1,
    sameSite: cookie.sameSite,
    priority: cookie.priority,
    sameParty: cookie.sameParty,
    sourceScheme: cookie.sourceScheme,
    sourcePort: cookie.sourcePort,
    partitionKey: cookie.partitionKey,
  }));
}

/**
 * CDP Session interface for type safety
 */
interface CDPSession {
  send(method: 'Network.getAllCookies'): Promise<{ cookies: CDPCookie[] }>;
  send(
    method: 'Network.setCookies',
    params: { cookies: CDPCookie[] }
  ): Promise<void>;
  send(method: 'Network.clearBrowserCookies'): Promise<void>;
  send(
    method: 'DOMStorage.getDOMStorageItems',
    params: { storageId: { securityOrigin: string; isLocalStorage: boolean } }
  ): Promise<{ entries: string[][] }>;
  send(
    method: 'DOMStorage.setDOMStorageItem',
    params: {
      storageId: { securityOrigin: string; isLocalStorage: boolean };
      key: string;
      value: string;
    }
  ): Promise<void>;
}

/**
 * Capture session from CDP client
 *
 * @example
 * ```typescript
 * const client = await page.target().createCDPSession();
 * const session = await captureFromCDP(client, { name: 'My Session' });
 * ```
 */
export async function captureFromCDP(
  cdpSession: CDPSession,
  options: CDPToPSPOptions,
  origins: string[] = []
): Promise<PSPSession> {
  // Get all cookies via CDP
  const { cookies } = await cdpSession.send('Network.getAllCookies');

  // Get localStorage for each origin
  const localStorageData: CDPLocalStorageData[] = [];
  for (const origin of origins) {
    try {
      const { entries } = await cdpSession.send('DOMStorage.getDOMStorageItems', {
        storageId: { securityOrigin: origin, isLocalStorage: true },
      });

      localStorageData.push({
        origin,
        entries: entries.map((entry) => ({
          key: entry[0],
          value: entry[1],
        })),
      });
    } catch {
      // Origin localStorage not accessible, skip
    }
  }

  return cdpToPSP(cookies, localStorageData, options);
}

/**
 * Restore PSP session via CDP client
 *
 * @example
 * ```typescript
 * const client = await page.target().createCDPSession();
 * await restoreToCDP(client, session);
 * ```
 */
export async function restoreToCDP(
  cdpSession: CDPSession,
  session: PSPSession,
  clearExisting: boolean = false
): Promise<void> {
  // Clear existing cookies if requested
  if (clearExisting) {
    await cdpSession.send('Network.clearBrowserCookies');
  }

  // Set cookies via CDP
  const cookies = pspToCDP(session);
  if (cookies.length > 0) {
    await cdpSession.send('Network.setCookies', { cookies });
  }

  // Set localStorage for each origin
  for (const origin of session.origins) {
    for (const entry of origin.localStorage) {
      try {
        await cdpSession.send('DOMStorage.setDOMStorageItem', {
          storageId: { securityOrigin: origin.origin, isLocalStorage: true },
          key: entry.key,
          value: entry.value,
        });
      } catch {
        // Failed to set localStorage item, continue
      }
    }
  }
}

/**
 * Get unique domains from PSP session cookies
 */
export function getSessionDomains(session: PSPSession): string[] {
  const domains = new Set<string>();
  for (const cookie of session.cookies) {
    domains.add(cookie.domain.replace(/^\./, ''));
  }
  return Array.from(domains);
}

/**
 * Get unique origins from PSP session
 */
export function getSessionOrigins(session: PSPSession): string[] {
  return session.origins.map((o) => o.origin);
}
