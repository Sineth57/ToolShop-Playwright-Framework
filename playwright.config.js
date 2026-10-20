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

    // UI tests: run on all three browsers
    { name: 'chromium', testIgnore: '**/tests/api/**', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox',  testIgnore: '**/tests/api/**', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit',   testIgnore: '**/tests/api/**', use: { ...devices['Desktop Safari'] } },
  ],
});