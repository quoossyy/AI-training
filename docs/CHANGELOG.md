# What changed

> **Status: DRAFT** — drafted by Claude from `git log main --stat`, checked against the diffs on 2026-11-03, pending review by Hanna Koval.

Architectural changes on `main`, newest first, for test authors. Update this file in the same PR as the change.

## Unreleased: docs update (branch `task/docs`)

- **Node requirement fixed.** `package.json` now declares `engines.node: ^20.19.0 || ^22.13.0 || >=24` (set by ESLint 10; advisory, npm does not block installs). The README used to say v18+, which does not run the current toolchain.
- **New docs:** [ONBOARDING.md](ONBOARDING.md), [ARCHITECTURE.md](ARCHITECTURE.md), this changelog. The README now has the variables table, `--no-deps`, and Troubleshooting for missing admin credentials.

## 2026-10-23 — PR #2: per-user stands with session link and admin (`c5ce0db`, merge `6b9b877`)

### Breaking: how to run

- **`BASE_URL` is replaced by `SESSION_URL`.** `baseURL` is now the origin of the session link. Update your local `.env` from `.env.example`.
- **`ADMIN_EMAIL` / `ADMIN_PASSWORD` changed meaning.** In PR #1 they were a storefront account (setup logged in through `LoginPage` and saved `admin.json`). Now they are the **Medusa Admin** (`/app`) credentials and do not work on the storefront; storefront tests use a customer registered in setup. They are still required for every run: the admin login is part of the `setup` project that all projects depend on.
- **`ADMIN_URL` is new and optional.** Without it the admin opens at `/app/login`.
- **One worker** (one stand = one database). Do not rely on parallelism; keep test data unique.
- **Fail-fast stand checks** in `AuthHelper.openSession()`: `403` means the session link was revoked, `5xx` means the stand is not running.

### New layers and files

- **Setup:** `tests/auth/global.setup.ts` opens the session link, registers a unique customer and saves `session.json` + `customer.json`; `tests/auth/admin.setup.ts` logs in to the admin and saves `admin.json`.
- **Admin:** Page Objects in `pages/admin/` (`AdminLoginPage`, `AdminOrdersPage`, `AdminCustomersPage`, `AdminSidebar`), a Playwright project `admin`, specs ADM-01 and ADM-02 in `tests/admin/admin.spec.ts`.
- **Test data:** `data/customer.ts` (`createCustomer()`) and the `customer` fixture, backed by `helpers/customer.helper.ts` (`saveCustomer` / `loadCustomer`).
- **`AuthHelper`** gained `openSession()`, `registerCustomer()` and `loginAsAdmin()`. Sessions are saved by the setup files, not by the helper.
- **`RegisterPage`** (`pages/login/register.page.ts`).

### Changed tests, reporting, CI

- AUTH-01 / AUTH-02 use the customer registered in setup instead of static credentials.
- JSON reporter (`test-results/results.json`) next to HTML.
- CI runs on every push; lint and typecheck always; e2e only when the `SESSION_URL` secret is set; e2e runs are serialized.

## 2026-10-08 — PR #1: framework cleanup (`bf132a2`, merge `c9c0aaf`)

### Breaking: how to run

- **Credentials and base URL moved to `.env`** (`BASE_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` — at that time a storefront account), read through `config/env.ts`; CI reads them from secrets.
- **npm scripts added:** `test`, `test:headed`, `test:ui`, `report`, `lint`, `typecheck`.

### Renames and moves

- `fixtures/auth.fixtures.ts` → **`fixtures/index.ts`**: import `test`/`expect` from `fixtures`.
- `tests/auth/auth.login.spec.ts` replaced by `tests/auth/login.spec.ts` (AUTH-01, AUTH-02) and `tests/account/profile-navigation.spec.ts` (ACC-01).
- Auth state lives in **`playwright/.auth/`** (gitignored).

### New layers and rules

- `AccountNav` component and `ProfilePage`; `AccountOverviewPage` reworked.
- **Selectors only in Page Objects**, enforced by ESLint (`eslint.config.mjs` with `eslint-plugin-playwright` and `no-restricted-syntax` rules); strict `tsconfig.json`.
- CI runs lint and typecheck and installs Chromium only.

## 2026-09-25 — Initial commit (`632c57f`)

- Playwright scaffold: `playwright.config.ts`, GitHub Actions workflow, README, `LoginPage`, `AccountOverviewPage`, `AuthHelper`, `fixtures/auth.fixtures.ts`, `tests/auth/` (global setup + `auth.login.spec.ts`). Superseded by PR #1 and PR #2.
