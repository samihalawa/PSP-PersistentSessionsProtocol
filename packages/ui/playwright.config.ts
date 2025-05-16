import { PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
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

export default config;