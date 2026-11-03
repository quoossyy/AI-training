# Facts: AI-training

Collected: 2026-11-03T17:26:02.801Z · HEAD: 6b9b877 (task/docs)

## Tracked files (git ls-files)

```
.env.example
.github/workflows/playwright.yml
.gitignore
README.md
config/env.ts
data/customer.ts
eslint.config.mjs
fixtures/index.ts
helpers/auth.helper.ts
helpers/customer.helper.ts
package.json
pages/account/account-nav.component.ts
pages/account/overview.page.ts
pages/account/profile.page.ts
pages/admin/admin-customers.page.ts
pages/admin/admin-login.page.ts
pages/admin/admin-orders.page.ts
pages/admin/admin-sidebar.component.ts
pages/login/login.page.ts
pages/login/register.page.ts
playwright.config.ts
tests/account/profile-navigation.spec.ts
tests/admin/admin.spec.ts
tests/auth/admin.setup.ts
tests/auth/global.setup.ts
tests/auth/login.spec.ts
tsconfig.json
```

## package.json scripts

| Script | Command |
|---|---|
| `test` | `playwright test` |
| `test:headed` | `playwright test --headed` |
| `test:ui` | `playwright test --ui` |
| `report` | `playwright show-report` |
| `lint` | `eslint .` |
| `typecheck` | `tsc` |

## Dependencies: declared, installed, engines.node

| Package | Declared | Installed | engines.node |
|---|---|---|---|
| @eslint/js | ^10.0.1 | 10.0.1 | ^20.19.0 || ^22.13.0 || >=24 |
| @playwright/test | ^1.63.0 | 1.63.0 | >=20 |
| @types/node | ^26.6.2 | 26.6.2 | — |
| dotenv | ^18.0.6 | 18.0.6 | >=12 |
| eslint | ^10.12.0 | 10.12.0 | ^20.19.0 || ^22.13.0 || >=24 |
| eslint-plugin-playwright | ^2.12.1 | 2.12.1 | >=16.9.0 |
| typescript | ^6.0.3 | 6.0.3 | >=14.17 |
| typescript-eslint | ^8.71.1 | 8.71.1 | ^18.18.0 || ^20.9.0 || >=21.1.0 |

## Node requirement

- package.json engines.node: not declared
- .nvmrc / .node-version: none
- Strictest engines among dependencies (the docs must not promise less):
  - @eslint/js: ^20.19.0 || ^22.13.0 || >=24
  - @playwright/test: >=20
  - dotenv: >=12
  - eslint: ^20.19.0 || ^22.13.0 || >=24
  - eslint-plugin-playwright: >=16.9.0
  - typescript: >=14.17
  - typescript-eslint: ^18.18.0 || ^20.9.0 || >=21.1.0
- Local node: v24.19.0

## CI: .github/workflows/playwright.yml (run/uses/secrets lines)

```
  1: name: Playwright Tests
 14: SESSION_URL: ${{ secrets.SESSION_URL }}
 15: ADMIN_URL: ${{ secrets.ADMIN_URL }}
 16: ADMIN_EMAIL: ${{ secrets.ADMIN_EMAIL }}
 17: ADMIN_PASSWORD: ${{ secrets.ADMIN_PASSWORD }}
 19: - uses: actions/checkout@v4
 20: - uses: actions/setup-node@v4
 22: node-version: lts/*
 23: - name: Install dependencies
 24: run: npm ci
 25: - name: Lint
 26: run: npm run lint
 27: - name: Typecheck
 28: run: npm run typecheck
 29: - name: Skip e2e without a stand
 30: if: ${{ env.SESSION_URL == '' }}
 31: run: echo "::notice::Secret SESSION_URL is not set, e2e tests skipped. Add SESSION_URL (and ADMIN_EMAIL / ADMIN_PASSWORD) in Settings > Secrets and variables > Actions."
 32: - name: Install Playwright Browsers
 33: if: ${{ env.SESSION_URL != '' }}
 34: run: npx playwright install --with-deps chromium
 35: - name: Run Playwright tests
 36: if: ${{ env.SESSION_URL != '' }}
 37: run: npx playwright test
 38: - uses: actions/upload-artifact@v4
 39: if: ${{ !cancelled() && env.SESSION_URL != '' }}
 41: name: playwright-report
```

## Env keys (.env.example)

`SESSION_URL`, `ADMIN_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`

## process.env keys read by code

`process.env[name]`, `process.env.ADMIN_URL`, `process.env.CI`, `required('SESSION_URL')`, `required('ADMIN_EMAIL')`, `required('ADMIN_PASSWORD')`

## Exported symbols (key classes and functions)

```
config/env.ts:9:export const env = {
config/env.ts:40:export const SESSION_STORAGE_STATE = 'playwright/.auth/session.json';
config/env.ts:42:export const ADMIN_STORAGE_STATE = 'playwright/.auth/admin.json';
config/env.ts:44:export const CUSTOMER_STORAGE_STATE = 'playwright/.auth/customer.json';
config/env.ts:46:export const CUSTOMER_DATA_FILE = 'playwright/.auth/customer-data.json';
data/customer.ts:1:export interface Customer {
data/customer.ts:9:export function createCustomer(): Customer {
fixtures/index.ts:20:export const test = base.extend<AuthFixtures>({
helpers/auth.helper.ts:7:export class AuthHelper {
helpers/customer.helper.ts:6:export function saveCustomer(customer: Customer) {
helpers/customer.helper.ts:11:export function loadCustomer(): Customer {
pages/account/account-nav.component.ts:4:export class AccountNav {
pages/account/overview.page.ts:5:export class AccountOverviewPage {
pages/account/profile.page.ts:4:export class ProfilePage {
pages/admin/admin-customers.page.ts:4:export class AdminCustomersPage {
pages/admin/admin-login.page.ts:4:export class AdminLoginPage {
pages/admin/admin-orders.page.ts:5:export class AdminOrdersPage {
pages/admin/admin-sidebar.component.ts:4:export class AdminSidebar {
pages/login/login.page.ts:5:export class LoginPage {
pages/login/register.page.ts:5:export class RegisterPage
```

## Git history since 6 months ago

```
6b9b877 2026-10-23 Merge pull request #2 from aitraining-ctrl/feature/base-session-flow
c5ce0db 2026-10-23 Adapt framework to per-user stands with session link and admin
c9c0aaf 2026-10-08 Merge pull request #1 from aitraining-ctrl/fix/framework-cleanup
bf132a2 2026-10-08 Clean up framework: env config, page objects, lint and CI checks
632c57f 2026-09-25 Initial commit: Playwright set up
```

## Files changed per commit (--stat, last 10)

```
--- 6b9b877 2026-10-23 Merge pull request #2 from aitraining-ctrl/feature/base-session-flow
--- c5ce0db 2026-10-23 Adapt framework to per-user stands with session link and admin

 .env.example                           | 10 +++++++-
 .github/workflows/playwright.yml       | 30 ++++++++++++++--------
 README.md                              | 74 ++++++++++++++++++++++++++++++++++++++----------------
 config/env.ts                          | 29 ++++++++++++++++++++-
 data/customer.ts                       | 17 +++++++++++++
 fixtures/index.ts                      | 18 +++++++++++++
 helpers/auth.helper.ts                 | 31 ++++++++++++++++++++++-
 helpers/customer.helper.ts             | 13 ++++++++++
 pages/admin/admin-customers.page.ts    | 32 +++++++++++++++++++++++
 pages/admin/admin-login.page.ts        | 28 +++++++++++++++++++++
 pages/admin/admin-orders.page.ts       | 28 +++++++++++++++++++++
 pages/admin/admin-sidebar.component.ts | 18 +++++++++++++
 pages/login/login.page.ts              |  8 ++++++
 pages/login/register.page.ts           | 33 ++++++++++++++++++++++++
 playwright.config.ts                   | 18 ++++++++-----
 tests/admin/admin.spec.ts              | 28 +++++++++++++++++++++
 tests/auth/admin.setup.ts              | 16 ++++++++++++
 tests/auth/global.setup.ts             | 17 ++++++++++---
 tests/auth/login.spec.ts               | 16 ++++++------
 19 files changed, 411 insertions(+), 53 deletions(-)
--- c9c0aaf 2026-10-08 Merge pull request #1 from aitraining-ctrl/fix/framework-cleanup
--- bf132a2 2026-10-08 Clean up framework: env config, page objects, lint and CI checks

 .env.example                             |    4 +
 .github/workflows/playwright.yml         |   10 +-
 .gitignore                               |    7 +-
 README.md                                |  174 +++----
 config/env.ts                            |   19 +
 eslint.config.mjs                        |   35 ++
 fixtures/{auth.fixtures.ts => index.ts}  |    7 +-
 helpers/auth.helper.ts                   |   11 +-
 package-lock.json                        | 1390 +++++++++++++++++++++++++++++++++++++++++++++++++-
 package.json                             |   19 +-
 pages/account/account-nav.component.ts   |   20 +
 pages/account/overview.page.ts           |   25 +-
 pages/account/profile.page.ts            |   22 +
 pages/login/login.page.ts                |    6 +-
 playwright.config.ts                     |   32 +-
 tests/account/profile-navigation.spec.ts |   11 +
 tests/auth/auth.login.spec.ts            |   14 -
 tests/auth/global.setup.ts               |   18 +-
 tests/auth/login.spec.ts                 |   23 +
 tsconfig.json                            |   15 +
 20 files changed, 1703 insertions(+), 159 deletions(-)
--- 632c57f 2026-09-25 Initial commit: Playwright set up

 .github/workflows/playwright.yml |  27 ++++++++++
 .gitignore                       |   8 +++
 README.md                        | 167 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
 fixtures/auth.fixtures.ts        |  19 +++++++
 helpers/auth.helper.ts           |  16 ++++++
 package-lock.json                |  79 ++++++++++++++++++++++++++++
 package.json                     |  14 +++++
 pages/account/overview.page.ts   |  13 +++++
 pages/login/login.page.ts        |  28 ++++++++++
 playwright.config.ts             |  49 ++++++++++++++++++
 tests/auth/auth.login.spec.ts    |  14 +++++
 tests/auth/global.setup.ts       |  12 +++++
 12 files changed, 446 insertions(+)
```
