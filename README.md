# Medusa Store — E2E Tests (Playwright)

Automated UI tests for the Medusa Store QA Sandbox using **Playwright** and **TypeScript**.

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
| Auth Strategy | `storageState` (session + customer created once in setup) |
| Config        | `.env` via dotenv                        |
| Lint          | ESLint + `eslint-plugin-playwright`      |
| Reporter      | HTML + JSON (`test-results/results.json`) |

---

## 📁 Project Structure

```
AI-training/
├── config/
│   └── env.ts                       # Env variables + storageState paths
├── data/
│   ├── customer.ts                  # Test data factory (unique customer)
│   └── address.ts                   # Test data factory (unique address)
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
│       ├── profile.page.ts
│       ├── addresses.page.ts
│       ├── add-address-modal.component.ts # "Add address" dialog (portal, scoped from page)
│       └── address-card.component.ts      # One saved address card
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
│       ├── profile-navigation.spec.ts
│       └── addresses.spec.ts
├── playwright/.auth/                # Saved sessions (gitignored)
├── .env.example
├── eslint.config.mjs
├── playwright.config.ts
└── tsconfig.json
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18+ ([download](https://nodejs.org/))

### Installation

```powershell
npm install
npx playwright install chromium

# Create your local env file and fill in the values of YOUR stand (from your task)
Copy-Item .env.example .env
```

> Work in a **private** repository of your own (never a public fork): your solutions must not be visible to others. Keep `.env` out of git: `SESSION_URL` is a secret.

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
# Run a single file
npx playwright test tests/auth/login.spec.ts

# Only regenerate the auth session
npx playwright test --project=setup
```

---

## 🔐 Authentication

The stand is selected by a **cookie** that the session link sets; all stands share one host.

1. The `setup` project runs **first**: it opens `SESSION_URL` (the stand cookie is set), saves it to `playwright/.auth/session.json`, then registers a new customer with a unique email and saves the logged-in state to `playwright/.auth/customer.json`. The customer credentials go to `playwright/.auth/customer-data.json` and are available in tests as the `customer` fixture.
2. The `chromium` project loads the customer session for every test — **no repeated logins**.
3. Tests that check the login itself keep the stand cookie but drop the customer:

```typescript
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
| **Test isolation** | Each test can run on its own, in any order. | Review |
| **Unique test data** | Stand data persists between runs: create data through `data/` factories with unique values, never hardcode emails. | Review |
| **Naming** | `ID: what is expected`, e.g. `AUTH-02: error is shown for a wrong password`. | Review |

---

## 📋 Test Cases

| ID      | Description                                    | File                                    | Status |
|---------|------------------------------------------------|-----------------------------------------|--------|
| AUTH-01 | Customer logs in with valid credentials        | `tests/auth/login.spec.ts`              | ✅     |
| AUTH-02 | Error is shown for a wrong password            | `tests/auth/login.spec.ts`              | ✅     |
| ACC-01  | Profile page opens from the account navigation | `tests/account/profile-navigation.spec.ts` | ✅  |
| ACC-02  | New address is added to the address book       | `tests/account/addresses.spec.ts`       | ✅     |
| ACC-03  | Address with empty required fields is not saved | `tests/account/addresses.spec.ts`      | ✅     |
| ADM-01  | Admin logs in with valid credentials           | `tests/admin/admin.spec.ts`             | ✅     |
| ADM-02  | Customer registered on the storefront is listed in admin | `tests/admin/admin.spec.ts`   | ✅     |

---

## ⚙️ Configuration

Key settings in `playwright.config.ts`:

| Setting      | Value                                   |
|--------------|-----------------------------------------|
| `testDir`    | `./tests`                               |
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
| `Missing env variable SESSION_URL` | Copy `.env.example` to `.env` and fill it in |
| `The stand rejected SESSION_URL (403)` or the page says "A session link is required" | The link was revoked (new link, stand handed over or released). Take a fresh link from your task, update `.env`, rerun |
| `The stand does not respond (HTTP 502)` | The link is valid but the stand services are down or still starting. Wait a minute and rerun; if it persists, contact the support of your task |
| `ENOENT: customer.json` / `customer-data.json` | Run `npx playwright test --project=setup` first |
| `Strict mode violation` | Element found multiple times — scope it: `getByTestId('parent').getByTestId('child')` |
| PowerShell script error | Run: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser` |
| Timeout on `fill()` | Wrong selector — use `npx playwright codegen <url>` to find the `data-testid` |
| `waitForLoadState('networkidle')` never resolves | The storefront keeps background requests open; wait for a specific element instead |

---

## 📄 License

Private — QA Sandbox project.
