# Claude: setup-гайд для новичка, шаблон №3 (дословно)

Входные данные: README.md, facts.md. Наша сверка — в [3-implement.md](../3-implement.md).

---

# Onboarding: first run of the Medusa Store E2E tests

A step-by-step setup for an AQA engineer who clones this repository for the first time.
Goal: get from an empty folder to a first green-or-red run with an HTML report you can open.

> Commands are PowerShell, the same shell the README uses. The reference tests show code style and architecture, **not** a guaranteed green run: your stand may contain defects in any area.

## Before you start: what you need from your task

| Item | Where it goes | Required |
|---|---|---|
| `SESSION_URL`: the session link of your stand (a secret) | `.env` | yes |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`: Medusa Admin (`/app`) credentials from the access dialog | `.env` | yes (read via `required(...)` in `config/env.ts`) |
| `ADMIN_URL`: admin link from the access dialog | `.env` | optional (without it the admin opens at `/app`) |

> TODO: where exactly does a new engineer receive the task, the stand and the access dialog? Neither file names the place or the person to ask.

---

## 1. Check Node.js

```powershell
node -v
```

You should see **v20.19.0 or newer within 20.x, v22.13.0 or newer within 22.x, or v24+**.

Why not "v18+" as the README says: `eslint` and `@eslint/js` declare `engines.node: ^20.19.0 || ^22.13.0 || >=24`, and `@playwright/test` declares `>=20`. Node 18 does not satisfy them. CI uses `node-version: lts/*`; the facts were collected on `v24.19.0`.

> TODO: the repo has no `engines` in `package.json` and no `.nvmrc` / `.node-version`. Which version is the team standard? (The README "Node.js v18+" line should be corrected.)

## 2. Get the repository

Work in a **private** repository of your own, never a public fork: your solutions must not be visible to others.

```powershell
git clone <YOUR_PRIVATE_REPO_URL>
cd AI-training
```

You should see the folders `config/`, `data/`, `pages/`, `helpers/`, `fixtures/`, `tests/` and the files `.env.example`, `package.json`, `playwright.config.ts`.

> TODO: the clone URL and the procedure for creating your private copy (import / template / mirror of the source repo) are not given. Git history only shows PRs from `aitraining-ctrl/...` branches. Which URL and which procedure?

## 3. Install dependencies

```powershell
npm install
```

You should see `npm` finish without errors and a `node_modules/` folder appear. Installed versions should match `package-lock.json`, for example `@playwright/test` 1.63.0, `typescript` 6.0.3, `eslint` 10.12.0.

> If PowerShell refuses to run `npm`/`npx` with a script error: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`.
>
> Note: CI uses `npm ci` (clean install from the lockfile). TODO: should engineers use `npm ci` locally too?

## 4. Install the browser

```powershell
npx playwright install chromium
```

You should see Chromium downloaded with no errors. Only Chromium is needed: both test projects (`chromium`, `admin`) use `devices['Desktop Chrome']`.

## 5. Create `.env`

```powershell
Copy-Item .env.example .env
```

Open `.env` and fill in the values of **your** stand:

```
SESSION_URL=
ADMIN_URL=
ADMIN_EMAIL=
ADMIN_PASSWORD=
```

You should see a `.env` file in the repo root. Run `git status`: `.env` must **not** be listed (it is gitignored). Never commit it: `SESSION_URL` is a secret.

## 6. Check the code: lint and typecheck (no stand needed)

```powershell
npm run lint
npm run typecheck
```

- `lint` runs `eslint .` and enforces the architecture rules (no `locator()` / `getBy*()` / `page.goto()` / `waitForTimeout` in `tests/`, no `test.only` / `test.skip`).
- `typecheck` runs `tsc` (`noEmit: true`, `strict: true`).

You should see both commands finish without errors. These are the same checks CI runs before the e2e step.

> TODO: is a clean `lint` + `typecheck` on a fresh clone guaranteed? The files do not state it.

## 7. Run the setup project (auth)

```powershell
npx playwright test --project=setup
```

This runs both `tests/auth/global.setup.ts` and `tests/auth/admin.setup.ts` (`testMatch: /.*\.setup\.ts/`): it opens `SESSION_URL`, registers a new customer with a unique email and logs in to the admin.

You should see the setup tests pass and these files appear in `playwright/.auth/` (gitignored):

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
| `The stand rejected SESSION_URL (403)` / "A session link is required" | The link was revoked. Take a fresh link from your task, update `.env`, rerun |
| `The stand does not respond (HTTP 502)` | Stand services are down or starting. Wait a minute, rerun; if it persists, contact the support of your task |

## 8. First full run

```powershell
npm test
```

This runs `playwright test` headless: `setup` first, then `chromium` (everything except `tests/admin/`, with the customer session) and `admin` (`tests/admin/*.spec.ts`, with the admin session). `workers: 1`, sequential, `retries: 0` locally.

You should see 5 test cases executed besides setup: `AUTH-01`, `AUTH-02`, `ACC-01`, `ADM-01`, `ADM-02`, and a JSON result in `test-results/results.json`. Failures are possible: your stand may contain defects.

To run one file or watch the browser:

```powershell
npx playwright test tests/auth/login.spec.ts
npm run test:headed
npm run test:ui
```

## 9. Open the report

```powershell
npm run report
```

You should see the Playwright HTML report open in the browser with the results of the last run. Screenshots are attached for failed tests (`screenshot: 'only-on-failure'`); traces are recorded only on the first retry, so locally (no retries) there is no trace.

---

## You are done when

- [ ] `node -v` satisfies `^20.19.0 || ^22.13.0 || >=24`
- [ ] `npm run lint` and `npm run typecheck` pass
- [ ] `playwright/.auth/` contains `session.json`, `customer.json`, `customer-data.json`, `admin.json`
- [ ] `npm test` ran and `npm run report` opens the report
- [ ] `.env` and `playwright/.auth/` do not show up in `git status`

## Next: CI in your private repo

CI (`.github/workflows/playwright.yml`) reads GitHub Secrets `SESSION_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` and optionally `ADMIN_URL` (Settings > Secrets and variables > Actions). Without `SESSION_URL` only lint and typecheck run, and the e2e step is skipped with a notice.

> TODO: the workflow triggers (`on:` push / pull_request / branches) are not in the facts. When does CI run?

## Open questions (TODO)

1. Where does a new engineer get the task, the stand and the access dialog?
2. Clone URL and how to create the private copy of the repo.
3. Team-standard Node version (README says v18+, dependencies require `^20.19.0 || ^22.13.0 || >=24`).
4. `npm install` or `npm ci` locally?
5. Is lint/typecheck guaranteed clean on a fresh clone?
6. CI triggers.
7. Setup for macOS/Linux shells (README gives PowerShell commands only).
