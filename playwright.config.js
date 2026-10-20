// @ts-check
const { defineConfig, devices } = require('@playwright/test');
require('dotenv').config();

module.exports = defineConfig({
  testDir: './tests',
  timeout: 30_000,                       // max time for one test
  expect: { timeout: 5_000 },            // max time for one assertion

  fullyParallel: true,                   // run tests in parallel
  forbidOnly: !!process.env.CI,          // fail CI if test.only is left in code
  retries: process.env.CI ? 2 : 0,       // retry flaky tests only in CI
  workers: process.env.CI ? 2 : undefined, // CI: 2 workers, local: automatic

  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: process.env.BASE_URL || 'https://practicesoftwaretesting.com',
    viewport: { width: 1280, height: 720 },
    testIdAttribute: 'data-test',        // makes page.getByTestId() use data-test
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox',  use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit',   use: { ...devices['Desktop Safari'] } },
  ],
});