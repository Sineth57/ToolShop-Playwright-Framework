# Toolshop Playwright Test Automation Framework

[![Playwright tests](https://github.com/Sineth57/ToolShop-Playwright-Framework/actions/workflows/playwright.yml/badge.svg)](https://github.com/Sineth57/ToolShop-Playwright-Framework/actions/workflows/playwright.yml)

An end-to-end test automation framework built with **Playwright** (JavaScript) for the
[Toolshop practice application](https://practicesoftwaretesting.com). It combines **UI tests** and
**API tests** in one project, uses the **Page Object Model**, runs in **parallel** on **Chromium, Firefox and WebKit**,
produces **HTML and Allure reports**, and runs in **GitHub Actions**.

---

## Table of contents

1. [Overview](#overview)
2. [Tech stack](#tech-stack)
3. [Project structure](#project-structure)
4. [Installation](#installation)
5. [Configuration](#configuration)
6. [Running the tests](#running-the-tests)
7. [Parallel execution](#parallel-execution)
8. [Reports](#reports)
9. [Framework design](#framework-design)
10. [CI/CD with GitHub Actions](#cicd-with-github-actions)
11. [Running in Docker](#running-in-docker)
12. [Best practices followed](#best-practices-followed)
13. [Troubleshooting](#troubleshooting)

---

## Overview

| Item                   | Details                                                   |
| ---------------------- | --------------------------------------------------------- |
| Application under test | Toolshop: https://practicesoftwaretesting.com             |
| API under test         | https://api.practicesoftwaretesting.com                   |
| API tests              | 151 (positive and negative)                               |
| UI tests               | 142, executed on 3 browsers (426 executions)              |
| Setup                  | 1 login setup test (creates a user and saves the session) |
| **Total**              | **578 test executions**                                   |

**What is covered**

- **UI:** home page (search, sorting, filters, pagination), product page, cart, checkout, login, registration,
  contact form, login session behaviour.
- **UI negative scenarios:** form validations, invalid input, error messages, hostile input (script text), boundary values.
- **API:** auth, products, brands and categories, cart, messages, protected routes.
- **API checks:** status codes, response structure (JSON schema), response time, and error handling for invalid payloads.

---

## Tech stack

| Tool                                                                                                                  | Purpose                                        |
| --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| [Playwright](https://playwright.dev) `^1.64.1`                                                                        | UI and API test runner                         |
| Node.js (LTS)                                                                                                         | Runtime                                        |
| [allure-playwright](https://www.npmjs.com/package/allure-playwright) + [allure](https://www.npmjs.com/package/allure) | Allure reporting                               |
| [Ajv](https://ajv.js.org)                                                                                             | JSON schema validation of API responses        |
| [dotenv](https://www.npmjs.com/package/dotenv)                                                                        | Reads optional settings from a `.env` file     |
| GitHub Actions                                                                                                        | CI pipeline                                    |
| Docker (optional)                                                                                                     | Run the suite in the official Playwright image |

---

## Project structure

```
.
├── .github/workflows/playwright.yml   # CI pipeline (GitHub Actions)
├── api/                               # API clients (AuthApi, ProductsApi, CartApi, InvoicesApi)
├── fixtures/test.js                   # Custom fixtures: page objects, API clients, test data
├── pages/                             # Page Object Model
│   ├── components/NavBar.js           #   shared navigation bar
│   └── HomePage.js, ProductPage.js, CartPage.js, CheckoutPage.js,
│       LoginPage.js, RegisterPage.js, ContactPage.js
├── schemas/                           # JSON schemas used to validate API responses
├── scripts/audit-locators.js          # Helper that lists the data-test locators of each page
├── test-data/                         # External test data (JSON)
│   ├── api-data.json, ui-data.json
│   └── ui-validation-data.json, register-data.json
├── tests/
│   ├── setup/auth.setup.js            # Creates a user, logs in once, saves the session
│   ├── ui/
│   │   ├── positive/                  # UI happy-path tests
│   │   └── negative/                  # UI validation and error tests
│   └── api/
│       ├── positive/                  # API happy-path tests
│       └── negative/                  # API error and invalid-input tests
├── utils/                             # Helpers: env, user factory, price parsing, schema check, timing
├── playwright.config.js               # Playwright configuration
├── Dockerfile, compose.yaml           # Optional Docker run
├── .env.example                       # Example environment settings
└── package.json                       # Dependencies and npm scripts
```

---

## Installation

**Prerequisites:** Node.js (LTS version) and Git.

```bash
# 1. Clone the repository
git clone https://github.com/Sineth57/ToolShop-Playwright-Framework.git
cd ToolShop-Playwright-Framework

# 2. Install the dependencies
npm ci

# 3. Install the Playwright browsers
npx playwright install
```

To install only one browser, for example Chromium: `npx playwright install chromium`.
On Linux, add `--with-deps` to also install the system libraries the browsers need.

> Run every command from the project folder (the one that contains `playwright.config.js`).

---

## Configuration

### `playwright.config.js`

| Setting                    | Value                                                                          |
| -------------------------- | ------------------------------------------------------------------------------ |
| Base URL                   | `BASE_URL` environment variable, default `https://practicesoftwaretesting.com` |
| Viewport                   | 1280 × 720                                                                     |
| Test timeout               | 60 seconds (assertion timeout 15 seconds)                                      |
| Retries                    | 2 in CI, 1 locally (a test that passes on retry is reported as _flaky_)        |
| Parallel execution         | `fullyParallel: true`, workers controlled with `WORKERS` (default 2)           |
| `forbidOnly`               | On in CI, so a forgotten `test.only` fails the build                           |
| Test id attribute          | `data-test` (used by `getByTestId`)                                            |
| Trace / screenshot / video | trace on first retry, screenshot on failure, video on first retry              |
| Reporters                  | list (console), Playwright HTML, Allure                                        |
| Modes                      | headless by default, headed with `--headed`                                    |

**Projects**

| Project                         | What it runs                                                          |
| ------------------------------- | --------------------------------------------------------------------- |
| `api`                           | All tests under `tests/api` (no browser needed, runs once)            |
| `setup`                         | Logs in once and saves the session; the browser projects depend on it |
| `chromium`, `firefox`, `webkit` | All UI tests under `tests/ui`                                         |

### Environment variables

| Variable   | Default                                   | Purpose                                                  |
| ---------- | ----------------------------------------- | -------------------------------------------------------- |
| `BASE_URL` | `https://practicesoftwaretesting.com`     | Web application URL                                      |
| `API_URL`  | `https://api.practicesoftwaretesting.com` | API URL                                                  |
| `WORKERS`  | `2`                                       | Number of parallel workers                               |
| `CI`       | not set                                   | When set, enables CI behaviour (2 retries, `forbidOnly`) |

Optional: copy `.env.example` to `.env` and change the values. The `.env` file is ignored by Git.

---

## Running the tests

### npm scripts

| Command                                                   | What it does                                       |
| --------------------------------------------------------- | -------------------------------------------------- |
| `npm test`                                                | Runs everything: API, setup and all three browsers |
| `npm run test:chromium`                                   | UI tests on Chromium only                          |
| `npm run test:headed`                                     | UI tests on Chromium with the browser visible      |
| `npm run test:ui`                                         | All UI tests                                       |
| `npm run test:api`                                        | All API tests                                      |
| `npm run test:positive` / `npm run test:negative`         | Only positive or only negative tests               |
| `npm run test:ui:positive` / `npm run test:ui:negative`   | UI positive or negative tests                      |
| `npm run test:api:positive` / `npm run test:api:negative` | API positive or negative tests                     |
| `npm run test:allure`                                     | Cleans old Allure output, then runs everything     |

### Playwright commands

```bash
npx playwright test --project=chromium          # one browser
npx playwright test --project=firefox
npx playwright test --project=webkit
npx playwright test --project=api               # API tests only
npx playwright test tests/ui/negative/login.negative.spec.js   # one file
npx playwright test -g "cart"                   # tests whose name contains "cart"
npx playwright test --headed --project=chromium # visible browser
npx playwright test --ui                        # Playwright UI mode (debugging)
```

### CI mode and custom URLs

Environment variables are set differently depending on your shell:

| Shell              | CI mode with one project                                 |
| ------------------ | -------------------------------------------------------- |
| macOS / Linux      | `CI=true npx playwright test --project=chromium`         |
| Windows CMD        | `set CI=true&& npx playwright test --project=chromium`   |
| Windows PowerShell | `$env:CI="true"; npx playwright test --project=chromium` |

Example against a locally running copy of the application (Windows CMD):

```cmd
set BASE_URL=http://localhost:4200&& set API_URL=http://localhost:8091&& npx playwright test --project=chromium
```

> In CMD, write `&&` directly after the value, with no space before it.

---

## Parallel execution

Tests run in parallel (`fullyParallel: true`). Control the number of workers locally or in CI:

```bash
npx playwright test --workers=1     # sequential, the baseline
npx playwright test --workers=4     # parallel, compare the total time
```

You can also set the `WORKERS` environment variable (default 2). To demonstrate the speed-up, run the same
project with `--workers=1` and then `--workers=4` and compare the total time shown at the end of the run.

Tests are independent, which makes parallel runs safe: each test creates its own users and carts through the API
and does not rely on data created by another test.

---

## Reports

### Playwright HTML report (default)

Generated automatically in `playwright-report/` after every run.

```bash
npm run report
# or
npx playwright show-report
```

Failed tests include a screenshot, and tests that were retried include a trace and a video. Open a trace with:

```bash
npx playwright show-trace path/to/trace.zip
```

### Allure report

```bash
npm run test:allure        # run all tests and collect fresh results in allure-results/
npm run allure:generate    # build the report in allure-report/
npm run allure:open        # open the report in the browser
# or generate and open in one step:
npm run allure:report
```

The Allure overview page shows the application, URLs, Node version and operating system of the run.

### Sample report

<!-- Add a screenshot of your Allure or HTML report here, for example:
![Allure report overview](docs/images/allure-overview.png)
-->

_Sample report: see the screenshot above or the report artifacts of the latest
[GitHub Actions run](https://github.com/Sineth57/ToolShop-Playwright-Framework/actions)._

---

## Framework design

### Page Object Model

Every page has a class in `pages/` that holds its locators and actions. Selectors are kept in one place,
use the application's `data-test` attributes through `getByTestId`, and fall back to roles and labels.
Tests only describe behaviour and never contain raw selectors.

### Fixtures (`fixtures/test.js`)

Reusable fixtures extend Playwright's `test`:

| Fixture                                                                                           | Purpose                                              |
| ------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `homePage`, `loginPage`, `registerPage`, `productPage`, `cartPage`, `checkoutPage`, `contactPage` | Page objects                                         |
| `apiRequest`, `authApi`, `products`                                                               | API clients                                          |
| `newUser`                                                                                         | Registers a fresh user through the API               |
| `catalogue`, `product`                                                                            | Products read once per worker from the API           |
| `cartWithProduct`                                                                                 | A cart that already contains one product             |
| `savedUser`                                                                                       | Credentials of the user created by the setup project |

### Login and session

The `setup` project (`tests/setup/auth.setup.js`) creates a new user through the API, logs in once through the UI
and saves the browser session (`storageState`) to `.auth/user.json` and the credentials to
`.auth/user-credentials.json`. The browser projects wait for this setup to finish. The `.auth` folder is ignored by Git.

### Test data

- Static values live in JSON files in `test-data/` (`api-data.json`, `ui-data.json`, `ui-validation-data.json`, `register-data.json`).
- Dynamic values (unique emails, user payloads) are generated by `utils/userFactory.js`, so tests do not collide.
- API calls create the data UI tests need (users, carts), which is faster and more reliable than clicking through the UI.

### API testing

- **Status and structure:** each response is checked for the expected status code and validated against a JSON schema
  from `schemas/` with Ajv (`utils/schema.js`).
- **Performance:** key requests are timed (`utils/timing.js`) and must answer within the limit in `test-data/api-data.json`
  (`maxResponseMs`, currently 4000 ms).
- **Negative cases:** invalid payloads, wrong types, missing fields, unknown ids, protected routes without a token.
- **Known defects:** a test that documents a confirmed application bug is marked with `test.fail()` and a note,
  so it counts as an expected failure and is flagged as soon as the bug is fixed.

### Hooks

`beforeEach` is used for repeated page navigation. Data setup is done in fixtures, which are created per test
and cleaned up automatically.

### Helper script

`node scripts/audit-locators.js --headed` walks the shop flow and prints every `data-test` locator of each page.
This is useful when writing new page objects.

---

## CI/CD with GitHub Actions

The pipeline is defined in `.github/workflows/playwright.yml`.

**Triggers:** every push to `main`/`master`, every pull request, and manual runs
(**Actions → Playwright tests → Run workflow**).

**Jobs**

| Job                             | What it does                                                |
| ------------------------------- | ----------------------------------------------------------- |
| `api`                           | `npx playwright test --project=api`                         |
| `chromium`                      | `npx playwright test --project=chromium`                    |
| `firefox`                       | `npx playwright test --project=firefox`                     |
| `webkit`                        | `npx playwright test --project=webkit`                      |
| `Allure report`                 | Merges the results of all jobs and builds one Allure report |
| `Publish the report` (optional) | Publishes the Allure report to GitHub Pages                 |

The four test jobs run in parallel and do not cancel each other (`fail-fast: false`).

**CI mode:** the `CI` variable is set, so the suite runs with 2 retries and `forbidOnly`.

**Artifacts** (Actions → select a run → _Artifacts_):

| Artifact                      | Content                                                |
| ----------------------------- | ------------------------------------------------------ |
| `playwright-report-<project>` | Playwright HTML report                                 |
| `allure-results-<project>`    | Raw Allure results                                     |
| `allure-report`               | Merged Allure report                                   |
| `test-results-<project>`      | Traces, screenshots and videos (only when a job fails) |

**Optional: publish the Allure report as a web page**

1. _Settings → Pages → Source: GitHub Actions_.
2. _Settings → Secrets and variables → Actions → Variables_ → add `PUBLISH_REPORT` with the value `true`.

**Known limitation**

<!-- UPDATE THIS PARAGRAPH to match the final state of your pipeline. -->

The public Toolshop site is protected by Cloudflare. On GitHub-hosted runners its bot check can block the
Chromium browser, which makes UI tests fail even though they pass locally. Running the UI tests against a copy of the
application started inside the pipeline (Docker Compose) avoids this.

---

## Running in Docker

The `Dockerfile` uses the official Playwright image, so no local browser installation is needed.

```bash
docker compose up --build
```

Reports are written to `./playwright-report` and `./test-results` on your machine. To test another environment, set
`BASE_URL` and `API_URL` before running the command.

---

## Best practices followed

- **No hardcoded waits**: there is no `waitForTimeout` anywhere; tests rely on Playwright's auto-waiting and web-first assertions.
- **Independent tests**: every test creates its own data and can run alone or in any order.
- **Page Object Model** with centralised locators.
- **DRY**: shared logic lives in page objects, fixtures, API clients and utilities.
- **External test data** in JSON files; no hardcoded values in the tests.
- **Meaningful test names** that read as sentences, grouped with `test.describe`.
- **Flaky tests handled properly**: retries in CI, flaky tests are reported as such, and root causes are fixed in the tests
  (for example by waiting for the page's own state instead of waiting for time).
- **Correct async/await** usage throughout.
- **Positive and negative coverage** for both UI and API.

---

## Troubleshooting

| Problem                                                              | Fix                                                                                          |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `Project(s) "chromium" not found`                                    | You are not in the project folder. `cd` into the folder with `playwright.config.js`.         |
| `Executable doesn't exist`                                           | Install the browsers: `npx playwright install`.                                              |
| `set CI=true` has no effect in CMD                                   | Write it without a space before `&&`: `set CI=true&& npx ...`.                               |
| `$env:CI` is not recognised                                          | That syntax is for PowerShell only; use `set CI=true&& ...` in CMD.                          |
| Tests fail only in CI with a "Performing security verification" page | The site's bot check blocked the browser; see [Known limitation](#cicd-with-github-actions). |
| Occasional timeouts                                                  | The public site is shared and can be slow. Re-run the failed tests, or lower `--workers`.    |

---

## Author

Sineth Shashintha: Assignment 6, Playwright Automation.
