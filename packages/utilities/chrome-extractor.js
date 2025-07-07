/**
 * Chrome Session Extractor - Local Chrome User Data Extraction
 * 
 * This utility extracts Chrome user data including cookies, localStorage,
 * profiles, and session data for PSP integration with Cloudflare rendering.
 */

import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import crypto from 'crypto';
import zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);
import { PSPSessionBuilder } from '../core/src/schema.js';

export class ChromeSessionExtractor {
    constructor(options = {}) {
        this.options = {
            profileName: options.profileName || 'Default',
            chromePath: options.chromePath || this._getDefaultChromePath(),
            extractCookies: options.extractCookies !== false,
            extractLocalStorage: options.extractLocalStorage !== false,
            extractHistory: options.extractHistory !== false,
            extractBookmarks: options.extractBookmarks !== false,
            includePasswords: options.includePasswords || false, // Security sensitive
            ...options
        };
    }

    /**
     * Extract complete Chrome session data
     */
    async extractSession(sessionId = null) {
        try {
            sessionId = sessionId || `chrome_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            const profilePath = path.join(this.options.chromePath, this.options.profileName);
            
            // Verify Chrome profile exists
            await this._verifyProfileExists(profilePath);
            
            // Extract all session components in parallel for better performance
            const [cookies, localStorage, history, bookmarks, preferences] = await Promise.all([
                this.options.extractCookies ? this._extractCookies(profilePath) : [],
                this.options.extractLocalStorage ? this._extractLocalStorage(profilePath) : {},
                this.options.extractHistory ? this._extractHistory(profilePath) : [],
                this.options.extractBookmarks ? this._extractBookmarks(profilePath) : {},
                this._extractPreferences(profilePath)
            ]);

            // Get current tab information if Chrome is running
            const currentTabs = await this._extractCurrentTabs(profilePath).catch(() => []);

            // Build PSP session
            const sessionBuilder = new PSPSessionBuilder()
                .sessionId(sessionId)
                .provider('chrome_local')
                .cookies(cookies)
                .localStorage(localStorage)
                .metadata({
                    platform: os.platform(),
                    chromePath: this.options.chromePath,
                    profileName: this.options.profileName,
                    extractedAt: new Date().toISOString(),
                    history: history.slice(0, 100), // Limit history for size
                    bookmarks,
                    preferences: this._sanitizePreferences(preferences),
                    currentTabs,
                    userAgent: preferences?.user_agent || null
                });

            // Set current URL from active tab if available
            if (currentTabs.length > 0) {
                const activeTab = currentTabs.find(tab => tab.active) || currentTabs[0];
                sessionBuilder.currentUrl(activeTab.url);
            }

            return sessionBuilder.build();

        } catch (error) {
            throw new Error(`Failed to extract Chrome session: ${error.message}`);
        }
    }

    /**
     * Extract cookies from Chrome's cookie database
     */
    async _extractCookies(profilePath) {
        try {
            const cookieDbPath = path.join(profilePath, 'Cookies');
            
            // Check if cookie database exists
            try {
                await fs.access(cookieDbPath);
            } catch {
                console.warn('Chrome cookies database not found, skipping cookie extraction');
                return [];
            }

            // Create temporary copy to avoid locking issues
            const tempCookieDb = path.join(os.tmpdir(), `chrome_cookies_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.db`);
            await this._safeFileCopy(cookieDbPath, tempCookieDb);

            try {
                const db = await open({
                    filename: tempCookieDb,
                    driver: sqlite3.Database,
                    mode: sqlite3.OPEN_READONLY
                });

                const query = `
                    SELECT 
                        name,
                        value,
                        host_key as domain,
                        path,
                        expires_utc,
                        is_secure as secure,
                        is_httponly as httpOnly,
                        samesite
                    FROM cookies 
                    WHERE expires_utc > ? 
                    ORDER BY host_key, name
                `;

                const currentTime = Date.now() * 1000; // Chrome uses microseconds
                const rows = await db.all(query, [currentTime]);
                await db.close();

                // Convert Chrome cookies to standard format
                return rows.map(row => ({
                    name: row.name,
                    value: row.value,
                    domain: row.domain.startsWith('.') ? row.domain : `.${row.domain}`,
                    path: row.path,
                    expires: row.expires_utc > 0 ? Math.floor(row.expires_utc / 1000000) : -1,
                    secure: Boolean(row.secure),
                    httpOnly: Boolean(row.httpOnly),
                    sameSite: this._convertSameSite(row.samesite)
                }));

            } finally {
                // Clean up temporary file
                await fs.unlink(tempCookieDb).catch(() => {});
            }

        } catch (error) {
            console.warn(`Failed to extract cookies: ${error.message}`);
            return [];
        }
    }

    /**
     * Safe file copy with retry mechanism
     */
    async _safeFileCopy(source, destination, maxRetries = 3) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                await fs.copyFile(source, destination);
                return;
            } catch (error) {
                if (attempt === maxRetries) {
                    throw error;
                }
                // Wait before retry with exponential backoff
                await new Promise(resolve => setTimeout(resolve, attempt * 100));
            }
        }
    }

    /**
     * Compress session data for better performance
     */
    async _compressSessionData(sessionData) {
        try {
            const jsonString = JSON.stringify(sessionData);
            const compressed = await gzip(jsonString);
            return {
                compressed: true,
                data: compressed.toString('base64'),
                originalSize: jsonString.length,
                compressedSize: compressed.length
            };
        } catch (error) {
            console.warn('Failed to compress session data:', error.message);
            return { compressed: false, data: sessionData };
        }
    }

    /**
     * Decompress session data
     */
    async _decompressSessionData(compressedData) {
        try {
            if (!compressedData.compressed) {
                return compressedData.data;
            }
            const buffer = Buffer.from(compressedData.data, 'base64');
            const decompressed = await gunzip(buffer);
            return JSON.parse(decompressed.toString());
        } catch (error) {
            console.warn('Failed to decompress session data:', error.message);
            return compressedData.data;
        }
    }

    /**
     * Extract localStorage data from Chrome's leveldb
     */
    async _extractLocalStorage(profilePath) {
        try {
            const localStoragePath = path.join(profilePath, 'Local Storage', 'leveldb');
            
            // Check if localStorage directory exists
            try {
                await fs.access(localStoragePath);
            } catch {
                console.warn('Chrome localStorage not found, skipping localStorage extraction');
                return {};
            }

            const localStorage = {};

            // Read .ldb files for localStorage data in parallel
            const files = await fs.readdir(localStoragePath);
            const ldbFiles = files.filter(file => file.endsWith('.ldb'));

            // Process files in parallel for better performance
            const filePromises = ldbFiles.map(async (file) => {
                try {
                    const filePath = path.join(localStoragePath, file);
                    const data = await fs.readFile(filePath);
                    return this._parseLevelDBData(data);
                } catch (error) {
                    console.warn(`Failed to read localStorage file ${file}: ${error.message}`);
                    return {};
                }
            });

            const results = await Promise.all(filePromises);
            results.forEach(entries => Object.assign(localStorage, entries));

            return localStorage;

        } catch (error) {
            console.warn(`Failed to extract localStorage: ${error.message}`);
            return {};
        }
    }

    /**
     * Extract browsing history from Chrome's history database
     */
    async _extractHistory(profilePath) {
        try {
            const historyDbPath = path.join(profilePath, 'History');
            
            try {
                await fs.access(historyDbPath);
            } catch {
                console.warn('Chrome history database not found, skipping history extraction');
                return [];
            }

            const tempHistoryDb = path.join(os.tmpdir(), `chrome_history_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.db`);
            await this._safeFileCopy(historyDbPath, tempHistoryDb);

            try {
                const db = await open({
                    filename: tempHistoryDb,
                    driver: sqlite3.Database,
                    mode: sqlite3.OPEN_READONLY
                });

                const query = `
                    SELECT 
                        url,
                        title,
                        visit_count,
                        last_visit_time
                    FROM urls 
                    ORDER BY last_visit_time DESC 
                    LIMIT 1000
                `;

                const rows = await db.all(query);
                await db.close();

                return rows.map(row => ({
                    url: row.url,
                    title: row.title,
                    visitCount: row.visit_count,
                    lastVisit: new Date(Math.floor(row.last_visit_time / 1000) - 11644473600000).toISOString()
                }));

            } finally {
                await fs.unlink(tempHistoryDb).catch(() => {});
            }

        } catch (error) {
            console.warn(`Failed to extract history: ${error.message}`);
            return [];
        }
    }

    /**
     * Extract bookmarks from Chrome's bookmarks file
     */
    async _extractBookmarks(profilePath) {
        try {
            const bookmarksPath = path.join(profilePath, 'Bookmarks');
            
            try {
                await fs.access(bookmarksPath);
            } catch {
                console.warn('Chrome bookmarks file not found, skipping bookmarks extraction');
                return {};
            }

            const bookmarksData = await fs.readFile(bookmarksPath, 'utf8');
            const bookmarks = JSON.parse(bookmarksData);

            // Extract and flatten bookmark structure
            return {
                bookmarkBar: this._flattenBookmarkFolder(bookmarks.roots.bookmark_bar),
                otherBookmarks: this._flattenBookmarkFolder(bookmarks.roots.other),
                syncedBookmarks: this._flattenBookmarkFolder(bookmarks.roots.synced)
            };

        } catch (error) {
            console.warn(`Failed to extract bookmarks: ${error.message}`);
            return {};
        }
    }

    /**
     * Extract Chrome preferences
     */
    async _extractPreferences(profilePath) {
        try {
            const preferencesPath = path.join(profilePath, 'Preferences');
            
            try {
                await fs.access(preferencesPath);
            } catch {
                console.warn('Chrome preferences file not found');
                return {};
            }

            const preferencesData = await fs.readFile(preferencesPath, 'utf8');
            return JSON.parse(preferencesData);

        } catch (error) {
            console.warn(`Failed to extract preferences: ${error.message}`);
            return {};
        }
    }

    /**
     * Extract current tab information from Chrome sessions
     */
    async _extractCurrentTabs(profilePath) {
        try {
            const currentTabsPath = path.join(profilePath, 'Current Tabs');
            const currentSessionPath = path.join(profilePath, 'Current Session');
            
            // Try to read current tabs or session files
            let tabsData = null;
            
            try {
                tabsData = await fs.readFile(currentTabsPath);
            } catch {
                try {
                    tabsData = await fs.readFile(currentSessionPath);
                } catch {
                    return [];
                }
            }

            // Parse Chrome session format (simplified)
            const tabs = this._parseChromeSessions(tabsData);
            return tabs;

        } catch (error) {
            console.warn(`Failed to extract current tabs: ${error.message}`);
            return [];
        }
    }

    /**
     * Get default Chrome data directory path based on OS with fallback detection
     */
    _getDefaultChromePath() {
        const platform = os.platform();
        const homeDir = os.homedir();
        
        let possiblePaths = [];

        switch (platform) {
            case 'win32':
                possiblePaths = [
                    path.join(homeDir, 'AppData', 'Local', 'Google', 'Chrome', 'User Data'),
                    path.join(homeDir, 'AppData', 'Local', 'Chromium', 'User Data'),
                    path.join(homeDir, 'AppData', 'Local', 'Microsoft', 'Edge', 'User Data'),
                    path.join('C:', 'Program Files', 'Google', 'Chrome', 'Application', 'User Data'),
                    path.join('C:', 'Program Files (x86)', 'Google', 'Chrome', 'Application', 'User Data')
                ];
                break;
            case 'darwin':
                possiblePaths = [
                    path.join(homeDir, 'Library', 'Application Support', 'Google', 'Chrome'),
                    path.join(homeDir, 'Library', 'Application Support', 'Chromium'),
                    path.join(homeDir, 'Library', 'Application Support', 'Microsoft Edge'),
                    path.join(homeDir, 'Library', 'Application Support', 'Brave Browser'),
                    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
                    '/Applications/Chromium.app/Contents/MacOS/Chromium'
                ];
                break;
            case 'linux':
                possiblePaths = [
                    path.join(homeDir, '.config', 'google-chrome'),
                    path.join(homeDir, '.config', 'chromium'),
                    path.join(homeDir, '.config', 'microsoft-edge'),
                    path.join(homeDir, '.config', 'brave-browser'),
                    path.join(homeDir, 'snap', 'chromium', 'common', 'chromium'),
                    '/opt/google/chrome',
                    '/usr/bin/google-chrome',
                    '/usr/bin/chromium-browser'
                ];
                break;
            default:
                // Try generic Unix-like paths
                possiblePaths = [
                    path.join(homeDir, '.config', 'google-chrome'),
                    path.join(homeDir, '.config', 'chromium'),
                    path.join(homeDir, '.chrome'),
                    path.join(homeDir, '.chromium')
                ];
        }

        // Return the first existing path
        for (const chromePath of possiblePaths) {
            try {
                if (fs.statSync && fs.statSync(chromePath).isDirectory()) {
                    return chromePath;
                }
            } catch (error) {
                // Path doesn't exist, continue checking
                continue;
            }
        }

        // If no paths found, return the most common default
        return possiblePaths[0];
    }

    /**
     * Detect Chrome installation and return multiple possible profile locations
     */
    async _detectChromeInstallations() {
        const platform = os.platform();
        const installations = [];

        try {
            const possiblePaths = this._getAllPossibleChromePaths();
            
            for (const chromePath of possiblePaths) {
                try {
                    const stats = await fs.stat(chromePath);
                    if (stats.isDirectory()) {
                        const profiles = await this._getProfilesInDirectory(chromePath);
                        installations.push({
                            chromePath,
                            platform,
                            profiles,
                            type: this._detectChromeType(chromePath)
                        });
                    }
                } catch (error) {
                    // Path doesn't exist or is inaccessible
                    continue;
                }
            }

            return installations;
        } catch (error) {
            console.warn('Failed to detect Chrome installations:', error.message);
            return [];
        }
    }

    /**
     * Get all possible Chrome installation paths for the current platform
     */
    _getAllPossibleChromePaths() {
        const platform = os.platform();
        const homeDir = os.homedir();
        
        switch (platform) {
            case 'win32':
                return [
                    path.join(homeDir, 'AppData', 'Local', 'Google', 'Chrome', 'User Data'),
                    path.join(homeDir, 'AppData', 'Local', 'Chromium', 'User Data'),
                    path.join(homeDir, 'AppData', 'Local', 'Microsoft', 'Edge', 'User Data'),
                    path.join(homeDir, 'AppData', 'Local', 'BraveSoftware', 'Brave-Browser', 'User Data'),
                    path.join('C:', 'Program Files', 'Google', 'Chrome', 'Application', 'User Data'),
                    path.join('C:', 'Program Files (x86)', 'Google', 'Chrome', 'Application', 'User Data')
                ];
                
            case 'darwin':
                return [
                    path.join(homeDir, 'Library', 'Application Support', 'Google', 'Chrome'),
                    path.join(homeDir, 'Library', 'Application Support', 'Chromium'),
                    path.join(homeDir, 'Library', 'Application Support', 'Microsoft Edge'),
                    path.join(homeDir, 'Library', 'Application Support', 'BraveSoftware', 'Brave-Browser')
                ];
                
            case 'linux':
                return [
                    path.join(homeDir, '.config', 'google-chrome'),
                    path.join(homeDir, '.config', 'chromium'),
                    path.join(homeDir, '.config', 'microsoft-edge'),
                    path.join(homeDir, '.config', 'BraveSoftware', 'Brave-Browser'),
                    path.join(homeDir, 'snap', 'chromium', 'current', '.config', 'chromium'),
                    path.join(homeDir, '.var', 'app', 'com.google.Chrome', 'config', 'google-chrome')
                ];
                
            default:
                return [
                    path.join(homeDir, '.config', 'google-chrome'),
                    path.join(homeDir, '.config', 'chromium')
                ];
        }
    }

    /**
     * Get all profiles in a Chrome directory
     */
    async _getProfilesInDirectory(chromeDir) {
        try {
            const entries = await fs.readdir(chromeDir, { withFileTypes: true });
            const profiles = [];
            
            for (const entry of entries) {
                if (entry.isDirectory()) {
                    const profilePath = path.join(chromeDir, entry.name);
                    const preferencesPath = path.join(profilePath, 'Preferences');
                    
                    try {
                        await fs.access(preferencesPath);
                        profiles.push({
                            directory: entry.name,
                            path: profilePath,
                            name: entry.name
                        });
                    } catch {
                        // Not a valid Chrome profile
                    }
                }
            }
            
            return profiles;
        } catch (error) {
            return [];
        }
    }

    /**
     * Detect Chrome browser type from path
     */
    _detectChromeType(chromePath) {
        const lowerPath = chromePath.toLowerCase();
        
        if (lowerPath.includes('edge')) return 'Microsoft Edge';
        if (lowerPath.includes('brave')) return 'Brave Browser';
        if (lowerPath.includes('chromium')) return 'Chromium';
        if (lowerPath.includes('chrome')) return 'Google Chrome';
        
        return 'Unknown Chrome-based Browser';
    }

    /**
     * Verify Chrome profile exists
     */
    async _verifyProfileExists(profilePath) {
        try {
            const stats = await fs.stat(profilePath);
            if (!stats.isDirectory()) {
                throw new Error(`Profile path is not a directory: ${profilePath}`);
            }
        } catch (error) {
            throw new Error(`Chrome profile not found at: ${profilePath}. Make sure Chrome is installed and the profile exists.`);
        }
    }

    /**
     * Convert Chrome SameSite values to standard format
     */
    _convertSameSite(sameSite) {
        switch (sameSite) {
            case 0: return 'None';
            case 1: return 'Lax';
            case 2: return 'Strict';
            default: return 'Lax';
        }
    }

    /**
     * Parse LevelDB data for localStorage extraction
     */
    _parseLevelDBData(buffer) {
        const localStorage = {};
        
        try {
            // Simple text-based parsing for localStorage entries
            const text = buffer.toString('utf8', 0, Math.min(buffer.length, 10000));
            const lines = text.split('\n');
            
            for (const line of lines) {
                if (line.includes('localStorage') && line.includes('://')) {
                    // Extract domain and key-value pairs
                    const matches = line.match(/https?:\/\/([^\/]+).*?"([^"]+)":"([^"]+)"/g);
                    if (matches) {
                        for (const match of matches) {
                            const parts = match.match(/https?:\/\/([^\/]+).*?"([^"]+)":"([^"]+)"/);
                            if (parts) {
                                const [, domain, key, value] = parts;
                                if (!localStorage[domain]) localStorage[domain] = {};
                                localStorage[domain][key] = value;
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.warn(`Failed to parse LevelDB data: ${error.message}`);
        }
        
        return localStorage;
    }

    /**
     * Flatten bookmark folder structure
     */
    _flattenBookmarkFolder(folder) {
        if (!folder || !folder.children) return [];
        
        const bookmarks = [];
        
        for (const item of folder.children) {
            if (item.type === 'url') {
                bookmarks.push({
                    name: item.name,
                    url: item.url,
                    dateAdded: item.date_added
                });
            } else if (item.type === 'folder') {
                bookmarks.push(...this._flattenBookmarkFolder(item));
            }
        }
        
        return bookmarks;
    }

    /**
     * Parse Chrome session files (simplified implementation)
     */
    _parseChromeSessions(buffer) {
        const tabs = [];
        
        try {
            // Chrome session files use a binary format
            // This is a simplified text-based extraction
            const text = buffer.toString('utf8', 0, Math.min(buffer.length, 10000));
            
            // Look for URL patterns
            const urlMatches = text.match(/https?:\/\/[^\s\x00-\x1f]+/g);
            if (urlMatches) {
                urlMatches.forEach((url, index) => {
                    tabs.push({
                        url,
                        active: index === 0, // Assume first URL is active
                        index
                    });
                });
            }
        } catch (error) {
            console.warn(`Failed to parse Chrome sessions: ${error.message}`);
        }
        
        return tabs;
    }

    /**
     * Sanitize preferences to remove sensitive data
     */
    _sanitizePreferences(preferences) {
        if (!preferences) return {};
        
        const sanitized = { ...preferences };
        
        // Remove sensitive preference keys
        const sensitiveKeys = [
            'password_manager',
            'autofill',
            'credentials',
            'signin',
            'sync'
        ];
        
        sensitiveKeys.forEach(key => {
            delete sanitized[key];
        });
        
        // Keep only useful browser configuration
        return {
            default_search_provider_data: sanitized.default_search_provider_data,
            homepage: sanitized.homepage,
            session: sanitized.session,
            browser: sanitized.browser,
            extensions: sanitized.extensions ? Object.keys(sanitized.extensions) : []
        };
    }

    /**
     * Export session to multiple formats
     */
    async exportSession(sessionData, format = 'json', outputPath = null) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const defaultPath = outputPath || `chrome-session-${timestamp}`;
        
        switch (format.toLowerCase()) {
            case 'json':
                const jsonPath = `${defaultPath}.json`;
                await fs.writeFile(jsonPath, JSON.stringify(sessionData, null, 2));
                return jsonPath;
                
            case 'psp':
                const pspPath = `${defaultPath}.psp`;
                await fs.writeFile(pspPath, JSON.stringify(sessionData));
                return pspPath;
                
            default:
                throw new Error(`Unsupported export format: ${format}`);
        }
    }

    /**
     * List available Chrome profiles
     */
    async listProfiles() {
        try {
            const chromeDir = this.options.chromePath;
            const entries = await fs.readdir(chromeDir, { withFileTypes: true });
            
            const profiles = [];
            
            for (const entry of entries) {
                if (entry.isDirectory()) {
                    const profilePath = path.join(chromeDir, entry.name);
                    const preferencesPath = path.join(profilePath, 'Preferences');
                    
                    try {
                        await fs.access(preferencesPath);
                        
                        // Read profile name from preferences
                        const preferences = JSON.parse(await fs.readFile(preferencesPath, 'utf8'));
                        const profileName = preferences.profile?.name || entry.name;
                        
                        profiles.push({
                            directory: entry.name,
                            name: profileName,
                            path: profilePath
                        });
                    } catch {
                        // Skip directories without valid Chrome profile
                    }
                }
            }
            
            return profiles;
        } catch (error) {
            throw new Error(`Failed to list Chrome profiles: ${error.message}`);
        }
    }
}

export default ChromeSessionExtractor;