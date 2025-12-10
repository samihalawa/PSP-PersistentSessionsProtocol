import * as Launcher from 'chrome-launcher';
import puppeteer from 'puppeteer-core';
import axios from 'axios';
import { ChromeProfile } from './scanner.js';

const SERVER_URL = process.env.PSP_SERVER_URL || 'http://localhost:3000';

export async function extractAndSync(profile: ChromeProfile, onStatus: (msg: string) => void) {
  onStatus('Preparing profile for sync...');

  // Launch Chrome with the specific profile
  onStatus('Waiting for profile to start...');
  
  let chrome;
  try {
    chrome = await Launcher.launch({
      chromeFlags: [
        '--headless=new',
        `--user-data-dir=${profile.path}`,
        `--profile-directory=${profile.directory}`,
        '--no-first-run',
        '--no-default-browser-check'
      ]
    });
  } catch (e) {
     // fallback
     chrome = await Launcher.launch({
      chromeFlags: [
        '--headless', 
         `--user-data-dir=${profile.path}`,
        `--profile-directory=${profile.directory}`
      ]
    });
  }

  onStatus('Extracting profile data...');
  
  try {
    const resp = await axios.get(`http://127.0.0.1:${chrome.port}/json/version`);
    const { webSocketDebuggerUrl } = resp.data;
    
    const browser = await puppeteer.connect({
      browserWSEndpoint: webSocketDebuggerUrl
    });

    const page = await browser.newPage();
    
    // 1. Extract Cookies (CDP)
    const client = await page.target().createCDPSession();
    const { cookies } = await client.send('Network.getAllCookies');
    
    const cookieCount = cookies.length;
    const domainCount = new Set(cookies.map(c => c.domain)).size;
    onStatus(`✓ Extracted ${cookieCount} cookies from ${domainCount} domains`);

    // 2. Extract Metadata
    const userAgent = await browser.userAgent();
    const viewport = page.viewport();

    // Prepare payload (PSP Protocol Format)
    const payload = {
      name: `${profile.name} - ${new Date().toISOString()}`,
      cookies: cookies,
      localStorage: [], // TODO: Future extraction
      userAgent,
      viewport
    };

    onStatus('Creating remote session...');
    // Updated endpoint: /api/v1/sessions
    const syncResp = await axios.post(`${SERVER_URL}/api/v1/sessions`, payload);
    const sessionId = syncResp.data.id;
    
    onStatus(`✓ Session created: ${sessionId}`);
    onStatus(`ℹ️  ID Copied to clipboard (simulated)`); 
    
    // Optional: Trigger remote launch to verify
    onStatus('Verifying remote session...');
    const launchResp = await axios.post(`${SERVER_URL}/api/v1/sessions/${sessionId}/connect`);
    
    onStatus(`✓ Remote browser ready: ${launchResp.data.browserWSEndpoint}`);
    onStatus('✓ Sync complete!');

    await browser.close();
    await chrome.kill();
    
    return true;

  } catch (err: any) {
    onStatus(`Error: ${err.message}`);
    if (chrome) await chrome.kill();
    throw err;
  }
}