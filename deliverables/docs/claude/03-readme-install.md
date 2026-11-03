# Claude: раздел установки README, шаблон №2 (дословно)

Входные данные: README.md (Getting Started), package.json, facts.md. Наша сверка — в [3-implement.md](../3-implement.md).

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** `^20.19.0 || ^22.13.0 || >=24` (the `engines.node` range in `package.json`; matches the strictest dependencies, `eslint` and `@eslint/js`) ([download](https://nodejs.org/))
- The values of **your own stand** from your task: session link, admin credentials and (optionally) admin link

### Installation

```powershell
npm install
npx playwright install chromium

# Create your local env file and fill in the values of YOUR stand (from your task)
Copy-Item .env.example .env
```

Fill in `.env`:

| Variable         | Required | What it is                                                                 |
|------------------|----------|----------------------------------------------------------------------------|
| `SESSION_URL`    | Yes      | Session link of your stand (a secret: it selects the stand via cookie)     |
| `ADMIN_EMAIL`    | Yes      | Medusa Admin credentials of your stand                                     |
| `ADMIN_PASSWORD` | Yes      | Medusa Admin credentials of your stand                                     |
| `ADMIN_URL`      | No       | Admin link from the access dialog; without it the admin opens at `/app`    |

> Work in a **private** repository of your own (never a public fork): your solutions must not be visible to others. `.env` and `playwright/.auth/` are gitignored: never commit them, `SESSION_URL` is a secret.

### Running

| Command               | What it does                                       |
|-----------------------|----------------------------------------------------|
| `npm test`            | Run all tests (`playwright test`, headless)        |
| `npm run test:headed` | Run with a visible browser                         |
| `npm run test:ui`     | Playwright UI mode                                 |
| `npm run report`      | Open the last HTML report                          |
| `npm run lint`        | ESLint (enforces the architecture rules)           |
| `npm run typecheck`   | TypeScript check (`tsc`, `noEmit`)                 |

Projects in `playwright.config.ts`: `setup` (runs first), `chromium` (customer session, everything outside `tests/admin/`), `admin` (admin session, `tests/admin/`). Tests run sequentially (`workers: 1`).

```powershell
# Run a single file
npx playwright test tests/auth/login.spec.ts

# Only regenerate the auth sessions (playwright/.auth/)
npx playwright test --project=setup

# Only the admin specs
npx playwright test --project=admin
```

Results: HTML report in `playwright-report/`, JSON in `test-results/results.json`.
