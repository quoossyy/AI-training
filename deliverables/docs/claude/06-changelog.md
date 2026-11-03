# Claude: «Что изменилось», шаблон №5 (дословно)

Входные данные: git log main --stat. Наша сверка — в [3-implement.md](../3-implement.md).

---

# What changed

Summary of architectural changes on `main`, newest first, aimed at test authors. Everything here comes from commit messages and `--stat` file lists. Items marked *(inferred)* are guesses based only on file names or line counts. Confirm them in the code.

---

## 2026-10-23: PR #2, per-user stands with session link and admin (`c5ce0db`, merge `6b9b877`)

### Breaking changes: how to run
- **`BASE_URL` is gone; use `SESSION_URL` instead.** `baseURL` now comes from the origin of the session link. Update your local `.env` (see `.env.example`).
- **Tests run with a single worker** because there is one stand and one database. Do not rely on parallelism, and design tests so they do not collide on shared data.
- **New optional env var `ADMIN_URL`.** It is needed only for the admin project *(inferred: admin tests are skipped or fail without it)*.
- **Fail-fast stand checks:** a `403` means the session link was revoked, and a `5xx` means the stand is not running. You now get clear errors instead of opaque test failures.

### New layers and files
- **Session setup** (`tests/auth/global.setup.ts`): opens the session link, registers a unique customer, and saves two storage states: the stand cookie and the logged-in customer.
- **Admin layer:**
  - `tests/auth/admin.setup.ts`: admin login setup.
  - Page Objects in `pages/admin/`: `admin-login.page.ts`, `admin-orders.page.ts`, `admin-customers.page.ts`, `admin-sidebar.component.ts`.
  - A new Playwright project named **`admin`** in `playwright.config.ts`.
  - Specs in `tests/admin/admin.spec.ts`: **ADM-01**, **ADM-02**.
- **Test data:** a customer factory in `data/customer.ts` and a **`customer` fixture** in `fixtures/index.ts`.
- **Helpers:** `helpers/customer.helper.ts` is new and `helpers/auth.helper.ts` is extended *(inferred: registration and storage-state logic lives here)*.
- **Registration page:** `pages/login/register.page.ts` is new.

### Changed tests
- **AUTH-01 and AUTH-02** (`tests/auth/login.spec.ts`) now use the registered customer instead of static credentials.

### Reporting and CI
- A **JSON reporter** now runs alongside the HTML reporter.
- CI runs on **every push**. Lint and typecheck always run. **e2e runs only when the `SESSION_URL` secret is set**, and e2e runs are serialized.

---

## 2026-10-08: PR #1, framework cleanup (`bf132a2`, merge `c9c0aaf`)

### Breaking changes: how to run
- **Credentials and the base URL moved to `.env`** and are read through `config/env.ts`. CI reads them from secrets. Start from `.env.example`.
- **New npm scripts** in `package.json` *(inferred: lint, typecheck and test commands; see README)*.
- CI **installs only Chromium** and runs lint and typecheck.

### Renames and moves
- `fixtures/auth.fixtures.ts` was renamed to **`fixtures/index.ts`**. Update your imports.
- `tests/auth/auth.login.spec.ts` was removed and split into:
  - `tests/auth/login.spec.ts`: **AUTH-01**, **AUTH-02**
  - `tests/account/profile-navigation.spec.ts`: **ACC-01**
- Auth state is now stored in **`playwright/.auth/`**. Global setup logs in through `AuthHelper`.

### New layers and rules
- **Page Objects:** `AccountNav` component (`pages/account/account-nav.component.ts`) and `ProfilePage` (`pages/account/profile.page.ts`). `overview.page.ts` was reworked.
- **Rule: selectors live only in Page Objects.** They are enforced by ESLint architecture rules *(inferred from `eslint.config.mjs` plus the commit message)*.
- **ESLint** with `eslint-plugin-playwright` and a **strict `tsconfig.json`**. Expect stricter typing and lint errors in specs.

---

## 2026-09-25: initial commit (`632c57f`)

- Playwright project scaffold: `playwright.config.ts`, a GitHub Actions workflow, and a README.
- Initial structure: `pages/` (login, account overview), `helpers/auth.helper.ts`, `fixtures/auth.fixtures.ts`, and `tests/auth/` (global setup plus `auth.login.spec.ts`).
- These were superseded by the PR #1 and PR #2 changes above.
