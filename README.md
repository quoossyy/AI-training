# Medusa Store — E2E Tests (Playwright)

Automated UI tests for the Medusa Store QA Sandbox using **Playwright** and **TypeScript**.

> **Status: DRAFT** — updated with Claude on 2026-11-03 against commit `6b9b877`, pending review by Hanna Koval.
> More docs: [Onboarding](docs/ONBOARDING.md) · [Architecture](docs/ARCHITECTURE.md) · [Changelog](docs/CHANGELOG.md)

## 🎯 Target

| Key          | Value                                                              |
|--------------|--------------------------------------------------------------------|
| **Stand**    | Your own Medusa Store, issued with your task (own DB, own bugs)    |
| **Entry**    | `SESSION_URL`: the session link of your stand (a secret)           |
| **Locale**   | `/dk` (all storefront paths start with it)                         |
| **Admin**    | Medusa Admin at `/app` (credentials from the access dialog)        |
| **Coverage** | Login, Customer Account, Admin                                     |

> The reference tests show the **code style and architecture**, not a green run: your stand may contain defects in any area.

---

## 🛠 Tech Stack

| Layer         | Choice                                   |
|---------------|------------------------------------------|
| Framework     | Playwright Test                          |
| Language      | TypeScript (strict)                      |
| Pattern       | Page Object Model (POM)                  |
| Auth Strategy | `storageState` (session, customer and admin created once in setup) |
| Config        | `.env` via dotenv                        |
| Lint          | ESLint (`@eslint/js` + `typescript-eslint` + `eslint-plugin-playwright`) |
| Reporter      | HTML + JSON (`test-results/results.json`) |

---

## 📁 Project Structure

```
AI-training/
├── config/
│   └── env.ts                       # Env variables + storageState paths
├── data/
│   └── customer.ts                  # Test data factory (unique customer)
├── pages/                           # Page Objects — selectors live ONLY here
│   ├── login/
│   │   ├── login.page.ts
│   │   └── register.page.ts
│   ├── admin/                       # Medusa Admin (/app): no data-testid, use roles
│   │   ├── admin-sidebar.component.ts
│   │   ├── admin-login.page.ts
│   │   ├── admin-orders.page.ts
│   │   └── admin-customers.page.ts
│   └── account/
│       ├── account-nav.component.ts # Side nav shared by /dk/account/* pages
│       ├── overview.page.ts
│       └── profile.page.ts
├── helpers/
│   ├── auth.helper.ts               # Open session link, register customer
│   └── customer.helper.ts           # Save/load the customer created in setup
├── fixtures/
│   └── index.ts                     # Custom fixtures: import test/expect from here
├── tests/
│   ├── auth/
│   │   ├── global.setup.ts          # Opens session link, registers customer, saves storageState
│   │   ├── admin.setup.ts           # Opens session link, logs in to admin, saves storageState
│   │   └── login.spec.ts
│   ├── admin/
│   │   └── admin.spec.ts
│   └── account/
│       └── profile-navigation.spec.ts
├── docs/                            # Onboarding, architecture, changelog
├── .github/workflows/playwright.yml # CI: lint + typecheck, e2e when SESSION_URL is set
├── playwright/.auth/                # Saved sessions (gitignored)
├── .env.example
├── eslint.config.mjs
├── package.json                     # npm scripts, engines.node
├── playwright.config.ts
└── tsconfig.json
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** `^20.19.0 || ^22.13.0 || >=24` (`engines.node` in `package.json`, set by ESLint 10) ([download](https://nodejs.org/))
- The values of **your own stand** from your task: session link and admin credentials

### Installation

```powershell
npm ci                               # exact versions from package-lock.json, as in CI
npx playwright install chromium

# Create your local env file and fill in the values of YOUR stand (from your task)
Copy-Item .env.example .env          # bash: cp .env.example .env
```

| Variable | Required | What it is |
| --- | --- | --- |
| `SESSION_URL` | Yes, for any run | Session link of your stand (a secret: it selects the stand via cookie) |
| `ADMIN_EMAIL` | Yes, for any run | Medusa Admin credentials: the `setup` project always logs in to the admin too |
| `ADMIN_PASSWORD` | Yes, for any run | Same as above |
| `ADMIN_URL` | No | Admin link from the access dialog; without it the admin opens at `/app` |

> Work in a **private** repository of your own (never a public fork): your solutions must not be visible to others. Keep `.env` out of git: `SESSION_URL` is a secret.

Step-by-step first run with expected results: [docs/ONBOARDING.md](docs/ONBOARDING.md).

### Running

| Command               | What it does                               |
|-----------------------|--------------------------------------------|
| `npm test`            | Run all tests (headless)                   |
| `npm run test:headed` | Run with a visible browser                 |
| `npm run test:ui`     | Playwright UI mode                         |
| `npm run report`      | Open the last HTML report                  |
| `npm run lint`        | ESLint (enforces the architecture rules)   |
| `npm run typecheck`   | TypeScript check without emitting          |

```powershell
# Run a single file (the setup project still runs first)
npx playwright test tests/auth/login.spec.ts

# Only regenerate all sessions in playwright/.auth/ (customer AND admin)
npx playwright test --project=setup

# Rerun a file with the sessions you already have, skipping setup
npx playwright test tests/auth/login.spec.ts --no-deps
```

---

## 🔐 Authentication

The stand is selected by a **cookie** that the session link sets; all stands share one host.

1. The `setup` project runs **first** and contains **both** `tests/auth/*.setup.ts` files; `chromium` and `admin` depend on it, so any run needs the admin credentials too. `global.setup.ts` opens `SESSION_URL` (the stand cookie is set), saves it to `playwright/.auth/session.json`, then registers a new customer with a unique email and saves the logged-in state to `playwright/.auth/customer.json`. The customer credentials go to `playwright/.auth/customer-data.json` and are available in tests as the `customer` fixture.
2. The `chromium` project loads the customer session for every test — **no repeated logins**.
3. Tests that check the login itself keep the stand cookie but drop the customer:

```typescript
import { SESSION_STORAGE_STATE } from '../../config/env';

test.use({ storageState: SESSION_STORAGE_STATE });
```

**Admin.** `ADMIN_EMAIL` / `ADMIN_PASSWORD` are the **Medusa Admin** (`/app`) credentials of your stand; they do not work on the storefront login (`/dk/account`). `admin.setup.ts` logs in and saves `playwright/.auth/admin.json`; specs in `tests/admin/` run in the `admin` project with that session, everything else runs in the `chromium` project with the customer session. `ADMIN_URL` (the admin link from the access dialog) is optional: like the session link it selects the stand by cookie, so without it the admin is opened at `/app`.

> The Medusa Admin UI has no `data-testid`: locate elements by role, name or placeholder (`getByRole`, `getByPlaceholder`), still only inside Page Objects.

> ⚠️ `.env` and `playwright/.auth/` are **gitignored** and must never be committed. In CI the values come from GitHub Secrets `SESSION_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` (and optionally `ADMIN_URL`) of your own repository; without `SESSION_URL` the e2e step is skipped and only lint and typecheck run.

---

## 🏗 Architecture Rules

| Rule | Description | Enforced by |
|------|-------------|-------------|
| **POM** | Every page/component has its own class in `pages/`. Selectors live **only** inside Page Objects. | ESLint: no `locator()` / `getBy*()` in `tests/` |
| **Navigation via POM** | Tests open pages with Page Object `goto()`, not `page.goto()`. | ESLint |
| **`data-testid` locators** | Use `getByTestId(...)`; scope with a parent (`this.root.getByTestId(...)`) instead of XPath or indexes. | Review |
| **Actions in POM, assertions in tests** | Page Objects expose locators and actions; `expect(...)` lives in the spec. | Review |
| **Web-first assertions** | `await expect(locator).toBeVisible()` etc. — they auto-wait. | Review |
| **No hard waits** | No `waitForTimeout`. Wait for an element or URL. | ESLint |
| **No focused or skipped tests** | No `test.only` / `test.skip` in committed code. | ESLint |
| **Test isolation** | Each test can run on its own, in any order. | Review |
| **Unique test data** | Stand data persists between runs: create data through `data/` factories with unique values, never hardcode emails. | Review |
| **Naming** | `ID: what is expected`, e.g. `AUTH-02: error is shown for a wrong password`. | Review |

---

## 📋 Test Cases

| ID      | Description                                    | File                                    | Automated |
|---------|------------------------------------------------|-----------------------------------------|-----------|
| AUTH-01 | Customer logs in with valid credentials        | `tests/auth/login.spec.ts`              | ✅        |
| AUTH-02 | Error is shown for a wrong password            | `tests/auth/login.spec.ts`              | ✅        |
| ACC-01  | Profile page opens from the account navigation | `tests/account/profile-navigation.spec.ts` | ✅     |
| ADM-01  | Admin logs in with valid credentials           | `tests/admin/admin.spec.ts`             | ✅        |
| ADM-02  | Customer registered on the storefront is listed in admin | `tests/admin/admin.spec.ts`   | ✅        |

✅ = the case is automated. It is not a run result: on your stand a test may fail because of a product defect.

---

## ⚙️ Configuration

Key settings in `playwright.config.ts`:

| Setting      | Value                                   |
|--------------|-----------------------------------------|
| `testDir`    | `./tests`                               |
| `projects`   | `setup` (`*.setup.ts`) → `chromium` (all but `tests/admin/`, customer session) and `admin` (`tests/admin/`, admin session); see [Architecture](docs/ARCHITECTURE.md) |
| `baseURL`    | Host of `SESSION_URL` from `.env`       |
| `retries`    | 1 on CI, 0 locally                      |
| `workers`    | 1 (one stand = one database)            |
| `reporter`   | HTML + JSON (`test-results/results.json`) |
| `trace`      | On first retry                          |
| `screenshot` | Only on failure                         |

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| `Missing env variable SESSION_URL` | Copy `.env.example` to `.env` and fill it in. Without it even `--list` fails: the config reads it on load |
| `Missing env variable ADMIN_EMAIL` / `ADMIN_PASSWORD` (in `admin.setup.ts`), other tests "did not run" | The admin login is part of `setup`, which every project depends on: fill in the admin credentials too |
| `The stand rejected SESSION_URL (403)` or the page says "A session link is required" | The link was revoked (new link, stand handed over or released). Take a fresh link from your task, update `.env`, rerun |
| `The stand does not respond (HTTP 502)` | The link is valid but the stand services are down or still starting. Wait a minute and rerun; if it persists, contact the support of your task |
| `ENOENT: customer.json` / `customer-data.json` | The sessions were never created: either `setup` failed (see its error) or you ran with `--no-deps` on a fresh checkout. Run `npx playwright test --project=setup` |
| `Strict mode violation` | Element found multiple times — scope it: `getByTestId('parent').getByTestId('child')` |
| PowerShell script error | Run: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser` |
| Timeout on `fill()` | Wrong selector — use `npx playwright codegen <url>` to find the `data-testid` (storefront) or the role/name (Admin has no `data-testid`) |
| `waitForLoadState('networkidle')` never resolves | The storefront keeps background requests open; wait for a specific element instead |

---

## 📄 License

Private — QA Sandbox project.
