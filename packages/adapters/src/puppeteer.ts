/**
 * Puppeteer Adapter for PSP
 *
 * Converts between PSP session format and Puppeteer cookies.
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  PSPSession,
  PSPCookie,
  PSPBrowserContext,
  PSPSource,
  PuppeteerCookie,
} from '@samihalawa/psp-types';

export interface PuppeteerToPSPOptions {
  name: string;
  description?: string;
  tags?: string[];
  userAgent?: string;
  viewport?: { width: number; height: number };
}

/**
 * Convert Puppeteer cookies to PSP session format
 */
export function puppeteerToPSP(
  cookies: PuppeteerCookie[],
  options: PuppeteerToPSPOptions
): PSPSession {
  const now = new Date().toISOString();

  // Convert Puppeteer cookies to PSP format
  const pspCookies: PSPCookie[] = cookies.map((cookie) => ({
    name: cookie.name,
    value: cookie.value,
    domain: cookie.domain,
    path: cookie.path,
    expires: cookie.expires,
    httpOnly: cookie.httpOnly ?? false,
    secure: cookie.secure ?? false,
    sameSite: cookie.sameSite ?? 'Lax',
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
    type: 'puppeteer',
    captureMethod: 'cdp',
  };

  return {
    $schema: 'https://psp.dev/schema/v2.json',
    protocolVersion: '2.0.0',
    id: uuidv4(),
    name: options.name,
    description: options.description,
    tags: options.tags,
    cookies: pspCookies,
    origins: [],
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
 * Convert PSP session to Puppeteer cookie format
 */
export function pspToPuppeteer(session: PSPSession): PuppeteerCookie[] {
  return session.cookies.map((cookie) => ({
    name: cookie.name,
    value: cookie.value,
    domain: cookie.domain,
    path: cookie.path,
    expires: cookie.expires,
    httpOnly: cookie.httpOnly,
    secure: cookie.secure,
    sameSite: cookie.sameSite,
  }));
}

/**
 * Capture session from Puppeteer page
 *
 * @example
 * ```typescript
 * const session = await captureFromPuppeteer(page, { name: 'My Session' });
 * ```
 */
export async function captureFromPuppeteer(
  page: {
    cookies(): Promise<PuppeteerCookie[]>;
    evaluate<T>(fn: () => T): Promise<T>;
  },
  options: PuppeteerToPSPOptions
): Promise<PSPSession> {
  const cookies = await page.cookies();
  const session = puppeteerToPSP(cookies, options);

  // Try to extract localStorage via page.evaluate
  try {
    const localStorageData = await page.evaluate(() => {
      const data: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          data[key] = localStorage.getItem(key) || '';
        }
      }
      return {
        origin: window.location.origin,
        data,
      };
    });

    if (Object.keys(localStorageData.data).length > 0) {
      session.origins.push({
        origin: localStorageData.origin,
        localStorage: Object.entries(localStorageData.data).map(([key, value]) => ({
          key,
          value,
        })),
      });
    }
  } catch {
    // localStorage extraction failed, continue without it
  }

  return session;
}

/**
 * Restore PSP session to Puppeteer page
 *
 * @example
 * ```typescript
 * await restoreToPuppeteer(page, session);
 * ```
 */
export async function restoreToPuppeteer(
  page: {
    setCookie(...cookies: PuppeteerCookie[]): Promise<void>;
    setUserAgent?(userAgent: string): Promise<void>;
    setViewport?(viewport: { width: number; height: number }): Promise<void>;
  },
  session: PSPSession
): Promise<void> {
  // Set cookies
  const cookies = pspToPuppeteer(session);
  if (cookies.length > 0) {
    await page.setCookie(...cookies);
  }

  // Set user agent if available
  if (page.setUserAgent && session.browserContext.userAgent) {
    await page.setUserAgent(session.browserContext.userAgent);
  }

  // Set viewport if available
  if (page.setViewport && session.browserContext.viewport) {
    await page.setViewport({
      width: session.browserContext.viewport.width,
      height: session.browserContext.viewport.height,
    });
  }
}
