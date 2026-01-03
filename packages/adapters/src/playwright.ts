/**
 * Playwright Adapter for PSP
 *
 * Converts between PSP session format and Playwright storage state.
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  PSPSession,
  PSPCookie,
  PSPOrigin,
  PSPBrowserContext,
  PSPSource,
  PlaywrightStorageState,
  PlaywrightCookie,
  PlaywrightOrigin,
  PSP_PROTOCOL_VERSION,
  PSP_SCHEMA_URL,
} from '@samihalawa/psp-types';

export interface PlaywrightToPSPOptions {
  name: string;
  description?: string;
  tags?: string[];
  browserContext?: Partial<PSPBrowserContext>;
}

export interface PSPToPlaywrightOptions {
  includeSessionStorage?: boolean;
}

/**
 * Convert Playwright storage state to PSP session format
 */
export function playwrightToPSP(
  storageState: PlaywrightStorageState,
  options: PlaywrightToPSPOptions
): PSPSession {
  const now = new Date().toISOString();

  // Convert Playwright cookies to PSP format
  const cookies: PSPCookie[] = storageState.cookies.map((cookie) => ({
    name: cookie.name,
    value: cookie.value,
    domain: cookie.domain,
    path: cookie.path,
    expires: cookie.expires,
    httpOnly: cookie.httpOnly,
    secure: cookie.secure,
    sameSite: cookie.sameSite,
  }));

  // Convert Playwright origins to PSP format
  const origins: PSPOrigin[] = storageState.origins.map((origin) => ({
    origin: origin.origin,
    localStorage: origin.localStorage.map((item) => ({
      key: item.name,
      value: item.value,
    })),
  }));

  // Build browser context
  const browserContext: PSPBrowserContext = {
    userAgent: options.browserContext?.userAgent ||
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    viewport: options.browserContext?.viewport || {
      width: 1920,
      height: 1080,
    },
    ...options.browserContext,
  };

  // Build source metadata
  const source: PSPSource = {
    type: 'playwright',
    captureMethod: 'storage-state',
  };

  return {
    $schema: 'https://psp.dev/schema/v2.json',
    protocolVersion: '2.0.0',
    id: uuidv4(),
    name: options.name,
    description: options.description,
    tags: options.tags,
    cookies,
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
 * Convert PSP session to Playwright storage state format
 */
export function pspToPlaywright(
  session: PSPSession,
  options: PSPToPlaywrightOptions = {}
): PlaywrightStorageState {
  // Convert PSP cookies to Playwright format
  const cookies: PlaywrightCookie[] = session.cookies.map((cookie) => ({
    name: cookie.name,
    value: cookie.value,
    domain: cookie.domain,
    path: cookie.path,
    expires: cookie.expires ?? -1,
    httpOnly: cookie.httpOnly,
    secure: cookie.secure,
    sameSite: cookie.sameSite,
  }));

  // Convert PSP origins to Playwright format
  const origins: PlaywrightOrigin[] = session.origins.map((origin) => ({
    origin: origin.origin,
    localStorage: origin.localStorage.map((entry) => ({
      name: entry.key,
      value: entry.value,
    })),
  }));

  return {
    cookies,
    origins,
  };
}

/**
 * Create PSP session from Playwright BrowserContext
 *
 * @example
 * ```typescript
 * const session = await captureFromPlaywright(context, { name: 'My Session' });
 * ```
 */
export async function captureFromPlaywright(
  context: { storageState(): Promise<PlaywrightStorageState> },
  options: PlaywrightToPSPOptions
): Promise<PSPSession> {
  const storageState = await context.storageState();
  return playwrightToPSP(storageState, options);
}

/**
 * Restore PSP session to Playwright BrowserContext
 *
 * @example
 * ```typescript
 * const context = await browser.newContext({
 *   storageState: pspToPlaywright(session)
 * });
 * ```
 */
export function getPlaywrightContextOptions(
  session: PSPSession
): { storageState: PlaywrightStorageState } & Partial<{
  userAgent: string;
  viewport: { width: number; height: number };
  locale: string;
  timezoneId: string;
  colorScheme: 'light' | 'dark' | 'no-preference';
  geolocation: { latitude: number; longitude: number; accuracy?: number };
}> {
  const storageState = pspToPlaywright(session);

  return {
    storageState,
    userAgent: session.browserContext.userAgent,
    viewport: session.browserContext.viewport ? {
      width: session.browserContext.viewport.width,
      height: session.browserContext.viewport.height,
    } : undefined,
    locale: session.browserContext.locale,
    timezoneId: session.browserContext.timezoneId,
    colorScheme: session.browserContext.colorScheme,
    geolocation: session.browserContext.geolocation,
  };
}

/**
 * Load PSP session from JSON file and convert to Playwright format
 */
export async function loadPlaywrightSession(
  filePath: string
): Promise<PlaywrightStorageState> {
  const fs = await import('fs/promises');
  const content = await fs.readFile(filePath, 'utf-8');
  const session: PSPSession = JSON.parse(content);
  return pspToPlaywright(session);
}

/**
 * Save Playwright storage state to PSP format
 */
export async function savePlaywrightSession(
  storageState: PlaywrightStorageState,
  filePath: string,
  options: PlaywrightToPSPOptions
): Promise<void> {
  const fs = await import('fs/promises');
  const session = playwrightToPSP(storageState, options);
  await fs.writeFile(filePath, JSON.stringify(session, null, 2));
}
