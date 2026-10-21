// @ts-check
const { defineConfig, devices } = require('@playwright/test');
require('dotenv').config({ quiet: true });

module.exports = defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 10_000 },

  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,

  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: process.env.BASE_URL || 'https://practicesoftwaretesting.com',
    viewport: { width: 1280, height: 720 },
    testIdAttribute: 'data-test',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    // API tests: no browser needed, run once
    { name: 'api', testMatch: '**/tests/api/**/*.spec.js' },

    // Logs in once and saves the session to .auth/user.json
    { name: 'setup', testMatch: '**/tests/setup/*.setup.js', use: { ...devices['Desktop Chrome'] } },

    // UI tests: run on all three browsers, after the setup has finished
    { name: 'chromium', testIgnore: '**/tests/api/**', dependencies: ['setup'], use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox',  testIgnore: '**/tests/api/**', dependencies: ['setup'], use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit',   testIgnore: '**/tests/api/**', dependencies: ['setup'], use: { ...devices['Desktop Safari'] } },
  ],
});