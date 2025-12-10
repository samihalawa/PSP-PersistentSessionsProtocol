#!/usr/bin/env node

/**
 * PSP Interactive Browser Launch - Real Implementation
 * Based on web-eval-agent's setup_browser_state approach
 */

import chalk from 'chalk';
import ora from 'ora';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { spawn } from 'child_process';
import { chromium, BrowserContext, Page } from 'playwright';
import { Session, SessionMetadata } from '@psp/core';

export interface LaunchOptions {
  session?: string;
  url?: string;
  profile?: string;
  platform?: string;
  timeout?: number;
  headless?: boolean;
  name?: string;
}

export interface SessionCaptureResult {
  cookies: number;
  localStorage: number;
  sessionStorage: number;
  sessionId: string;
  capturedAt: string;
}

/**
 * Interactive Browser Launch - Main Implementation
 */
export async function launchInteractiveBrowser(options: LaunchOptions): Promise<SessionCaptureResult> {
  const {
    session,
    url = 'about:blank',
    profile = 'default',
    platform,
    timeout = 180000, // 3 minutes
    headless = false,
    name
  } = options;

  console.log(chalk.blue('🚀 PSP Interactive Browser Launch'));
  console.log(chalk.gray('   Based on proven web-eval-agent approach'));
  console.log('');

  // Create PSP directories
  const pspDir = path.join(os.homedir(), '.psp');
  const browserStateDir = path.join(pspDir, 'browser_state');
  const userDataDir = path.join(pspDir, 'user_data', profile);
  
  // Ensure directories exist
  fs.mkdirSync(browserStateDir, { recursive: true });
  fs.mkdirSync(userDataDir, { recursive: true });

  const stateFile = path.join(browserStateDir, `${profile}_state.json`);
  
  console.log(chalk.gray(`📁 User data directory: ${userDataDir}`));
  console.log(chalk.gray(`💾 State will be saved to: ${stateFile}`));
  
  if (url !== 'about:blank') {
    console.log(chalk.gray(`🔗 Target URL: ${url}`));
  }
  
  if (platform) {
    console.log(chalk.gray(`🏷️  Platform: ${platform}`));
  }
  
  console.log('');

  let context: BrowserContext | null = null;
  let page: Page | null = null;
  let spinner: any = null;

  try {
    // Launch browser with persistent context (like web-eval-agent)
    spinner = ora('Launching interactive browser...').start();
    
    context = await chromium.launchPersistentContext(userDataDir, {
      headless: false, // Always visible for user interaction
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 2,
      locale: 'en-US',
      timezoneId: 'America/Los_Angeles',
      permissions: ['geolocation', 'notifications'],
      // Anti-detection measures (inspired by web-eval-agent)
      args: [
        '--no-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
      ],
      ignoreDefaultArgs: ['--enable-automation'],
      // Custom user agent to avoid detection
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    });

    // Add anti-detection script (from web-eval-agent)
    await context.addInitScript(() => {
      // Hide webdriver property
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      });
      
      // Remove automation indicators
      delete (window as any).navigator.webdriver;
      
      // Add chrome runtime (makes it look like real Chrome)
      (window as any).chrome = { runtime: {} };
    });

    spinner.succeed(chalk.green('✅ Browser launched successfully!'));

    // Create a new page and navigate
    page = await context.newPage();
    
    // Navigate to URL if provided
    if (url !== 'about:blank') {
      spinner = ora(`Navigating to ${url}...`).start();
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      spinner.succeed(chalk.green(`✅ Navigated to ${url}`));
    }

    // Show instructions to user
    console.log('');
    console.log(chalk.yellow('📋 INSTRUCTIONS:'));
    console.log(chalk.white('   1. 🔐 Complete your login/authentication in the browser'));
    console.log(chalk.white('   2. 🌐 Navigate to any sites you want to save sessions for'));
    console.log(chalk.white('   3. ❌ Close the browser window when you\'re done'));
    console.log('');
    console.log(chalk.cyan('⏱️  PSP will automatically save your session when you close the browser'));
    console.log(chalk.gray('   💡 Timeout: 3 minutes (will auto-save if reached)'));
    console.log('');

    // Set up page close detection (like web-eval-agent)
    const pageClosePromise = new Promise<'user_close' | 'timeout'>((resolve) => {
      const timeoutId = setTimeout(() => {
        console.log(chalk.yellow('\n⏰ Timeout reached (3 minutes), saving current session...'));
        resolve('timeout');
      }, timeout);

      page!.once('close', () => {
        clearTimeout(timeoutId);
        console.log(chalk.green('\n🖱️  Browser closed by user, saving session...'));
        resolve('user_close');
      });
    });

    // Wait for user to close browser or timeout
    const closeReason = await pageClosePromise;
    
    // Capture and save session state
    spinner = ora('Capturing session state...').start();
    
    // Save browser state (like web-eval-agent approach)
    await context.storageState({ path: stateFile });
    
    // Get additional session information for display
    const cookies = await context.cookies();
    const [localStorageCount, sessionStorageCount] = await page.evaluate(() => {
      const localStorage = window.localStorage;
      const sessionStorage = window.sessionStorage;
      return [localStorage.length, sessionStorage.length];
    });

    // Create or update PSP session
    let sessionId: string;
    let sessionName: string;
    
    if (session) {
      // Update existing session
      sessionId = session;
      sessionName = `Updated ${profile} session`;
    } else {
      // Create new session
      sessionName = name || `${platform || 'Browser'} Session - ${new Date().toLocaleDateString()}`;
      const pspSession = await Session.create({
        name: sessionName,
        description: `Interactive session captured from ${profile} profile`,
        tags: platform ? [platform.toLowerCase(), profile] : [profile],
        storage: 'local'
      });
      sessionId = pspSession.getId();
    }

    // Save additional metadata
    const metadataFile = path.join(browserStateDir, `${profile}_metadata.json`);
    const metadata = {
      sessionId,
      sessionName,
      profile,
      platform,
      url,
      capturedAt: new Date().toISOString(),
      closeReason,
      cookies: cookies.length,
      localStorage: localStorageCount,
      sessionStorage: sessionStorageCount,
      stateFile,
      userDataDir
    };
    
    fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2));
    
    spinner.succeed(chalk.green('✅ Session captured successfully!'));
    
    // Display capture results
    console.log('');
    console.log(chalk.blue('📊 CAPTURE RESULTS:'));
    console.log(chalk.white(`   🆔 Session ID: ${sessionId}`));
    console.log(chalk.white(`   📝 Session Name: ${sessionName}`));
    console.log(chalk.white(`   🍪 Cookies: ${cookies.length}`));
    console.log(chalk.white(`   💾 Local Storage Items: ${localStorageCount}`));
    console.log(chalk.white(`   🗃️  Session Storage Items: ${sessionStorageCount}`));
    console.log(chalk.white(`   📁 Saved to: ${stateFile}`));
    console.log('');
    
    if (closeReason === 'timeout') {
      console.log(chalk.yellow('⚠️  Session saved due to timeout. You can continue this session later.'));
    } else {
      console.log(chalk.green('🎉 Session ready for use! Run `psp list` to see all sessions.'));
    }

    return {
      cookies: cookies.length,
      localStorage: localStorageCount,
      sessionStorage: sessionStorageCount,
      sessionId,
      capturedAt: metadata.capturedAt
    };

  } catch (error) {
    if (spinner) {
      spinner.fail(chalk.red(`❌ Failed to launch browser: ${error}`));
    }
    console.error(chalk.red('Error details:'), error);
    throw error;
  } finally {
    // Cleanup resources
    if (page && !page.isClosed()) {
      try {
        await page.close();
      } catch (e) {
        // Ignore close errors
      }
    }
    
    if (context) {
      try {
        await context.close();
      } catch (e) {
        // Ignore close errors
      }
    }
  }
}

/**
 * Restore session state to a browser context
 */
export async function restoreSessionState(profile: string = 'default'): Promise<string | null> {
  const pspDir = path.join(os.homedir(), '.psp');
  const stateFile = path.join(pspDir, 'browser_state', `${profile}_state.json`);
  
  if (fs.existsSync(stateFile)) {
    return stateFile;
  }
  
  return null;
}

/**
 * List available captured sessions
 */
export async function listCapturedSessions(): Promise<Array<{
  profile: string;
  sessionId: string;
  sessionName: string;
  platform?: string;
  capturedAt: string;
  cookies: number;
  localStorage: number;
}>> {
  const pspDir = path.join(os.homedir(), '.psp');
  const browserStateDir = path.join(pspDir, 'browser_state');
  
  if (!fs.existsSync(browserStateDir)) {
    return [];
  }
  
  const sessions: any[] = [];
  const files = fs.readdirSync(browserStateDir);
  
  for (const file of files) {
    if (file.endsWith('_metadata.json')) {
      try {
        const metadataPath = path.join(browserStateDir, file);
        const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
        sessions.push(metadata);
      } catch (error) {
        // Skip invalid metadata files
        continue;
      }
    }
  }
  
  return sessions.sort((a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime());
}

/**
 * Platform-specific URL suggestions
 */
export const PLATFORM_URLS: Record<string, string> = {
  'gmail': 'https://mail.google.com',
  'github': 'https://github.com',
  'aws': 'https://console.aws.amazon.com',
  'discord': 'https://discord.com/app',
  'slack': 'https://slack.com',
  'notion': 'https://notion.so',
  'figma': 'https://figma.com',
  'linkedin': 'https://linkedin.com',
  'stripe': 'https://dashboard.stripe.com',
  'openai': 'https://chat.openai.com',
  'huggingface': 'https://huggingface.co',
  'reddit': 'https://reddit.com',
  'shopify': 'https://admin.shopify.com',
  'zendesk': 'https://zendesk.com',
  'vercel': 'https://vercel.com/dashboard'
};

/**
 * Get suggested URL for a platform
 */
export function getPlatformUrl(platform: string): string | undefined {
  return PLATFORM_URLS[platform.toLowerCase()];
}