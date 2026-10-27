const { defineConfig, devices } = require('@playwright/test');
require('dotenv').config({ quiet: true });

module.exports = defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 15_000 },

  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,       // a test that passes on retry is reported as "flaky"
  workers: Number(process.env.WORKERS) || 2, // set WORKERS=4 (or use --workers=4) to compare speeds

  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['allure-playwright', {
      resultsDir: 'allure-results',
      environmentInfo: {
        Application: 'Practice Software Testing (Toolshop)',
        BASE_URL: process.env.BASE_URL || 'https://practicesoftwaretesting.com',
        API_URL: process.env.API_URL || 'https://api.practicesoftwaretesting.com',
        Node: process.version,
        OS: process.platform,
      },
    }],
  ],

  use: {
    baseURL: process.env.BASE_URL || 'https://practicesoftwaretesting.com',
    viewport: { width: 1280, height: 720 },
    testIdAttribute: 'data-test',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
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