"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// Make sure screenshots directory exists
const screenshotsDir = path_1.default.join(__dirname, '../screenshots');
if (!fs_1.default.existsSync(screenshotsDir)) {
    fs_1.default.mkdirSync(screenshotsDir, { recursive: true });
}
// Function to create clean filenames
const cleanFileName = (name) => {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '-');
};
test_1.test.describe('PSP Dashboard Screenshots', () => {
    // Capture each main page
    (0, test_1.test)('capture dashboard page', async ({ page }) => {
        await page.goto('http://localhost:3000/');
        // Wait for content to load
        await page.waitForSelector('text=Dashboard', { state: 'visible' });
        await page.waitForTimeout(1000); // Wait for animations
        await page.screenshot({
            path: path_1.default.join(screenshotsDir, 'dashboard.png'),
            fullPage: true
        });
    });
    (0, test_1.test)('capture sessions page', async ({ page }) => {
        await page.goto('http://localhost:3000/sessions');
        // Wait for content to load
        await page.waitForSelector('text=Sessions', { state: 'visible' });
        await page.waitForTimeout(1000); // Wait for animations
        await page.screenshot({
            path: path_1.default.join(screenshotsDir, 'sessions-list.png'),
            fullPage: true
        });
        // Capture session creation dialog
        await page.click('text=Create');
        await page.waitForSelector('text=Create New Session', { state: 'visible' });
        await page.screenshot({
            path: path_1.default.join(screenshotsDir, 'create-session.png')
        });
        await page.click('text=Cancel');
    });
    (0, test_1.test)('capture session details page', async ({ page }) => {
        // Go to sessions page first
        await page.goto('http://localhost:3000/sessions');
        await page.waitForSelector('text=Sessions', { state: 'visible' });
        // Click on the first session in the list
        await page.click('text=View Session >> nth=0');
        await page.waitForSelector('text=Session Metadata', { state: 'visible' });
        await page.waitForTimeout(1000); // Wait for animations
        // Capture main details view
        await page.screenshot({
            path: path_1.default.join(screenshotsDir, 'session-details.png'),
            fullPage: true
        });
        // Capture each tab
        const tabs = ['Cookies', 'Local Storage', 'Session Storage', 'Network', 'DOM', 'Recording'];
        for (const tab of tabs) {
            await page.click(`text=${tab}`);
            await page.waitForTimeout(500); // Wait for tab to change
            await page.screenshot({
                path: path_1.default.join(screenshotsDir, `session-details-${cleanFileName(tab)}.png`),
                fullPage: false
            });
        }
    });
    (0, test_1.test)('capture recorder page', async ({ page }) => {
        await page.goto('http://localhost:3000/recorder');
        // Wait for content to load
        await page.waitForSelector('text=Session Recorder', { state: 'visible' });
        await page.waitForTimeout(1000); // Wait for animations
        await page.screenshot({
            path: path_1.default.join(screenshotsDir, 'recorder.png'),
            fullPage: true
        });
    });
    (0, test_1.test)('capture history page', async ({ page }) => {
        await page.goto('http://localhost:3000/history');
        // Wait for content to load
        await page.waitForSelector('text=Session History', { state: 'visible' });
        await page.waitForTimeout(1000); // Wait for animations
        await page.screenshot({
            path: path_1.default.join(screenshotsDir, 'history.png'),
            fullPage: true
        });
    });
    (0, test_1.test)('capture settings page', async ({ page }) => {
        await page.goto('http://localhost:3000/settings');
        // Wait for content to load
        await page.waitForSelector('text=Settings', { state: 'visible' });
        await page.waitForTimeout(1000); // Wait for animations
        await page.screenshot({
            path: path_1.default.join(screenshotsDir, 'settings.png'),
            fullPage: true
        });
    });
    (0, test_1.test)('capture dark mode', async ({ page }) => {
        // Go to settings page
        await page.goto('http://localhost:3000/settings');
        // Toggle dark mode
        await page.waitForSelector('text=/Dark Mode/', { state: 'visible' });
        await page.click('text=/Dark Mode/');
        await page.waitForTimeout(1000); // Wait for theme change
        // Go to dashboard page to capture dark mode
        await page.goto('http://localhost:3000/');
        await page.waitForSelector('text=Dashboard', { state: 'visible' });
        await page.screenshot({
            path: path_1.default.join(screenshotsDir, 'dashboard-dark.png'),
            fullPage: true
        });
    });
});
