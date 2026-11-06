# Onboarding: first run of the Medusa Store E2E tests

> **Status: Reviewed by Hanna Koval, 2026-11-06** — drafted with Claude, checked against the code (commit `6b9b877` + `engines`) and on a clean clone of this branch.

A step-by-step setup for an AQA engineer who clones this repository for the first time.
Goal: from an empty folder to a first run with an HTML report you can open. Measured on a clean clone: about 2.5 minutes of commands (most of it `npm ci`) with Chromium already cached; a first Chromium download adds a few minutes.

> The reference tests show code style and architecture, **not** a guaranteed green run: your stand may contain defects in any area. Commands are given for PowerShell; bash equivalents are in comments.

## Before you start: what you need from your task

| Item | Where it goes | Required |
|---|---|---|
| `SESSION_URL`: the session link of your stand (a secret) | `.env` | yes, for any run |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`: Medusa Admin (`/app`) credentials from the access dialog | `.env` | yes, for any run: the `setup` project always logs in to the admin |
| `ADMIN_URL`: admin link from the access dialog | `.env` | no (without it the admin opens at `/app/login`) |

## 1. Check Node.js

```powershell
node -v
```

You should see a version in `^20.19.0 || ^22.13.0 || >=24` (for example `v22.13.0` or `v24.x`). This is `engines.node` in `package.json`; it comes from ESLint 10, the strictest dependency. Node 18 does not work. The field is advisory: npm does not stop you, but on a wrong version `npm ci` prints `npm warn EBADENGINE` — for `ai-training` itself and for `eslint` / `@playwright/test`. Treat it as an error and switch Node.

## 2. Get the repository

Work in a **private** repository of your own, never a public fork: your solutions must not be visible to others. Create it as described in your task, then:

```powershell
git clone <URL of your private repository>
cd AI-training
```

You should see the folders `config/`, `data/`, `docs/`, `fixtures/`, `helpers/`, `pages/`, `tests/` and the files `.env.example`, `package.json`, `playwright.config.ts`.

## 3. Install dependencies

```powershell
npm ci
```

`npm ci` installs the exact versions from `package-lock.json`, the same way CI does. You should see `added N packages` and no `EBADENGINE` warning.

> If PowerShell refuses to run `npm`/`npx` with a script error: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`.

## 4. Install the browser

```powershell
npx playwright install chromium
```

Only Chromium is needed: both test projects (`chromium`, `admin`) use `devices['Desktop Chrome']`. On Linux add `--with-deps` to install the system libraries (CI does this).

## 5. Create `.env`

```powershell
Copy-Item .env.example .env    # bash: cp .env.example .env
```

Open `.env` and fill in the values of **your** stand (`SESSION_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, optionally `ADMIN_URL`).
Check with `git status`: `.env` must **not** be listed (it is gitignored). Never commit it: `SESSION_URL` is a secret.

## 6. Check the code: lint and typecheck (no stand needed)

```powershell
npm run lint
npm run typecheck
```

- `lint` runs `eslint .` and enforces the architecture rules: no `locator()` / `getBy*()` / `page.goto()` / `waitForTimeout` in `tests/`, no `test.only` / `test.skip`.
- `typecheck` runs `tsc` (`noEmit: true`, `strict: true`).

You should see both finish with no output and exit code 0. These are the same checks CI runs before the e2e step.

## 7. Run the setup project (sessions)

```powershell
npx playwright test --project=setup
```

This runs both `tests/auth/global.setup.ts` and `tests/auth/admin.setup.ts`: it opens `SESSION_URL`, registers a new customer with a unique email and logs in to the admin. You should see `2 passed` and these files in `playwright/.auth/` (gitignored):

| File | Content |
|---|---|
| `session.json` | Stand cookie only |
| `customer.json` | Logged-in customer session |
| `customer-data.json` | Credentials of the registered customer (the `customer` fixture) |
| `admin.json` | Logged-in Medusa Admin session |

If it fails:

| Message | What to do |
|---|---|
| `Missing env variable SESSION_URL` | Step 5: fill in `.env` |
| `Missing env variable ADMIN_EMAIL` / `ADMIN_PASSWORD` | Step 5: the admin credentials are required for every run |
| `The stand rejected SESSION_URL (403)` / "A session link is required" | The link was revoked. Take a fresh link from your task, update `.env`, rerun |
| `The stand does not respond (HTTP 502)` | Stand services are down or starting. Wait a minute, rerun; if it persists, contact the support of your task |
| Admin setup times out | A cold admin app can be slow (setup timeout is 90 s): rerun once |

## 8. First full run

```powershell
npm test
```

`setup` runs first, then `chromium` (everything except `tests/admin/`, with the customer session) and `admin` (`tests/admin/`, with the admin session). One worker, sequential, no retries locally.
You should see 7 tests: 2 setup + `AUTH-01`, `AUTH-02`, `ACC-01`, `ADM-01`, `ADM-02`. Failures are possible: your stand may contain defects.

Day-to-day commands:

```powershell
npx playwright test tests/auth/login.spec.ts             # one file (setup runs first)
npx playwright test tests/auth/login.spec.ts --no-deps   # one file, reuse existing sessions
npm run test:headed                                      # visible browser
npm run test:ui                                          # UI mode
```

## 9. Open the report

```powershell
npm run report
```

The HTML report opens in the browser. Failed tests have a screenshot (`screenshot: 'only-on-failure'`). Traces are recorded only on the first retry, and there are no retries locally: to get a trace, run with `--trace on`.

## You are done when

- [ ] `node -v` satisfies `^20.19.0 || ^22.13.0 || >=24`
- [ ] `npm run lint` and `npm run typecheck` pass
- [ ] `playwright/.auth/` contains `session.json`, `customer.json`, `customer-data.json`, `admin.json`
- [ ] `npm test` ran and `npm run report` opens the report
- [ ] `.env` and `playwright/.auth/` do not show up in `git status`

## Next

- Read [ARCHITECTURE.md](ARCHITECTURE.md) before writing your first test, and the Architecture Rules in the [README](../README.md#-architecture-rules).
- **CI in your repository.** `.github/workflows/playwright.yml` runs on every push and on manual dispatch. Add GitHub Secrets `SESSION_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` (optionally `ADMIN_URL`) in Settings → Secrets and variables → Actions. Without `SESSION_URL` only lint and typecheck run and the e2e step is skipped with a notice.
