"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config = {
    testDir: './tests',
    timeout: 30000,
    use: {
        viewport: { width: 1280, height: 720 },
        screenshot: 'only-on-failure',
    },
    projects: [
        {
            name: 'chromium',
            use: { browserName: 'chromium' },
        },
    ],
    reporter: [
        ['html', { outputFolder: 'playwright-report' }],
        ['list'],
    ],
    // Run all tests in parallel
    fullyParallel: true,
    // Retry failed tests to avoid flakiness
    retries: 1,
    // Output folders
    outputDir: 'test-results',
};
exports.default = config;
