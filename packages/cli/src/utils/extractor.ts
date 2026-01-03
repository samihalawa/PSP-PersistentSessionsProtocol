/**
 * PSP CLI Extractor v2.0
 *
 * Extracts browser session data from Chrome profiles using CDP
 * and syncs to PSP Cloud Server using v2 API.
 */

import * as Launcher from 'chrome-launcher';
import puppeteer from 'puppeteer-core';
import axios from 'axios';
import fs from 'fs-extra';
import path from 'path';
import { ChromeProfile } from './scanner.js';
import type { PSPSession } from '@samihalawa/psp-types';
import {
  captureFromCDP,
  addChecksum,
  getCookieStats,
  getLocalStorageStats,
} from '@samihalawa/psp-adapters';

const SERVER_URL = process.env.PSP_SERVER_URL || 'http://localhost:3000';

export interface ExtractOptions {
  serverUrl?: string;
  saveLocal?: boolean;
  localPath?: string;
  skipSync?: boolean;
  origins?: string[];
}

export interface ExtractResult {
  session: PSPSession;
  sessionId?: string;
  localPath?: string;
  stats: {
    cookieCount: number;
    domainCount: number;
    originCount: number;
    localStorageEntries: number;
  };
}

/**
 * Extract session from Chrome profile and optionally sync to server
 */
export async function extractAndSync(
  profile: ChromeProfile,
  onStatus: (msg: string) => void,
  options: ExtractOptions = {}
): Promise<ExtractResult> {
  const serverUrl = options.serverUrl || SERVER_URL;

  onStatus('Preparing profile for extraction...');

  // Launch Chrome with the specific profile
  onStatus('Starting Chrome with profile...');

  let chrome: Launcher.LaunchedChrome | undefined;
  try {
    chrome = await Launcher.launch({
      chromeFlags: [
        '--headless=new',
        `--user-data-dir=${profile.path}`,
        `--profile-directory=${profile.directory}`,
        '--no-first-run',
        '--no-default-browser-check',
      ],
    });
  } catch {
    // Fallback for older Chrome versions
    chrome = await Launcher.launch({
      chromeFlags: [
        '--headless',
        `--user-data-dir=${profile.path}`,
        `--profile-directory=${profile.directory}`,
      ],
    });
  }

  onStatus('Connecting to browser...');

  try {
    const resp = await axios.get(`http://127.0.0.1:${chrome.port}/json/version`);
    const { webSocketDebuggerUrl } = resp.data;

    const browser = await puppeteer.connect({
      browserWSEndpoint: webSocketDebuggerUrl,
    });

    const page = await browser.newPage();
    const client = await page.target().createCDPSession();

    onStatus('Extracting session data via CDP...');

    // Get user agent and viewport
    const userAgent = await browser.userAgent();
    const viewport = page.viewport();

    // Use PSP adapter to capture session
    const session = await captureFromCDP(
      client as any,
      {
        name: `${profile.name} - ${new Date().toISOString()}`,
        profileName: profile.name,
        profilePath: profile.path,
        userAgent,
        viewport: viewport || undefined,
      },
      options.origins || []
    );

    // Add checksum for integrity
    const sessionWithChecksum = addChecksum(session);

    // Get stats
    const cookieStats = getCookieStats(sessionWithChecksum);
    const localStorageStats = getLocalStorageStats(sessionWithChecksum);

    onStatus(
      `✓ Extracted ${cookieStats.total} cookies from ${cookieStats.domains} domains`
    );
    if (localStorageStats.totalEntries > 0) {
      onStatus(
        `✓ Extracted ${localStorageStats.totalEntries} localStorage entries from ${localStorageStats.origins} origins`
      );
    }

    const result: ExtractResult = {
      session: sessionWithChecksum,
      stats: {
        cookieCount: cookieStats.total,
        domainCount: cookieStats.domains,
        originCount: localStorageStats.origins,
        localStorageEntries: localStorageStats.totalEntries,
      },
    };

    // Save locally if requested
    if (options.saveLocal) {
      const localPath =
        options.localPath ||
        path.join(process.cwd(), `${sessionWithChecksum.id}.psp.json`);
      await fs.writeJson(localPath, sessionWithChecksum, { spaces: 2 });
      onStatus(`✓ Session saved locally: ${localPath}`);
      result.localPath = localPath;
    }

    // Sync to server unless skipped
    if (!options.skipSync) {
      onStatus('Syncing to PSP Cloud Server...');

      try {
        const syncResp = await axios.post(
          `${serverUrl}/api/v2/sessions`,
          sessionWithChecksum
        );
        const sessionId = syncResp.data.id;
        result.sessionId = sessionId;

        onStatus(`✓ Session created: ${sessionId}`);

        // Optionally verify by getting stats
        const statsResp = await axios.get(
          `${serverUrl}/api/v2/sessions/${sessionId}/stats`
        );
        onStatus(
          `✓ Server verified: ${statsResp.data.cookies.total} cookies, ${statsResp.data.localStorage.totalEntries} localStorage entries`
        );
      } catch (syncErr: any) {
        const errorMsg =
          syncErr.response?.data?.error || syncErr.message || 'Unknown error';
        onStatus(`⚠ Sync failed: ${errorMsg}`);
        onStatus('Session extracted but not synced to server');
      }
    }

    onStatus('✓ Extraction complete!');

    await browser.close();
    await chrome.kill();

    return result;
  } catch (err: any) {
    onStatus(`Error: ${err.message}`);
    if (chrome) await chrome.kill();
    throw err;
  }
}

/**
 * Export session to file without syncing to server
 */
export async function extractToFile(
  profile: ChromeProfile,
  outputPath: string,
  onStatus: (msg: string) => void,
  options: { origins?: string[] } = {}
): Promise<ExtractResult> {
  return extractAndSync(profile, onStatus, {
    saveLocal: true,
    localPath: outputPath,
    skipSync: true,
    origins: options.origins,
  });
}

/**
 * Import session from file to server
 */
export async function importFromFile(
  filePath: string,
  onStatus: (msg: string) => void,
  options: { serverUrl?: string } = {}
): Promise<{ sessionId: string }> {
  const serverUrl = options.serverUrl || SERVER_URL;

  onStatus(`Reading session from ${filePath}...`);

  if (!(await fs.pathExists(filePath))) {
    throw new Error(`File not found: ${filePath}`);
  }

  const session: PSPSession = await fs.readJson(filePath);

  onStatus(`Importing session: ${session.name}`);
  onStatus(`  - ${session.cookies.length} cookies`);
  onStatus(`  - ${session.origins.length} origins`);

  const resp = await axios.post(`${serverUrl}/api/v2/sessions`, session);

  onStatus(`✓ Session imported: ${resp.data.id}`);

  return { sessionId: resp.data.id };
}

/**
 * List sessions from server
 */
export async function listSessions(
  onStatus: (msg: string) => void,
  options: { serverUrl?: string } = {}
): Promise<any[]> {
  const serverUrl = options.serverUrl || SERVER_URL;

  onStatus('Fetching sessions from server...');

  const resp = await axios.get(`${serverUrl}/api/v2/sessions`);

  onStatus(`Found ${resp.data.count} sessions`);

  return resp.data.sessions;
}

/**
 * Connect to a session (launch browser with session)
 */
export async function connectToSession(
  sessionId: string,
  onStatus: (msg: string) => void,
  options: { serverUrl?: string; headless?: boolean } = {}
): Promise<{ browserWSEndpoint: string; browserId: string }> {
  const serverUrl = options.serverUrl || SERVER_URL;

  onStatus(`Connecting to session ${sessionId}...`);

  const resp = await axios.post(`${serverUrl}/api/v2/sessions/${sessionId}/connect`, {
    headless: options.headless ?? false,
  });

  onStatus(`✓ Browser launched: ${resp.data.browserId}`);
  onStatus(`  WebSocket: ${resp.data.browserWSEndpoint}`);
  onStatus(`  Domains: ${resp.data.domains?.join(', ') || 'none'}`);

  return {
    browserWSEndpoint: resp.data.browserWSEndpoint,
    browserId: resp.data.browserId,
  };
}
