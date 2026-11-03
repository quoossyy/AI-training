# Claude: поиск расхождений, прогон 1 (дословно)

- **Исполнитель:** свежий general-purpose субагент. Ему разрешено читать только `README.md` и `deliverables/docs/facts/facts-v1.md` (тогда этот файл назывался `facts.md`).
- **Промпт:** шаблон №1 из задания: «Вот текущий README проекта: [README.md]. Вот актуальная структура репозитория: [facts.md]. Найди расхождения между документацией и реальным кодом.» К нему добавлены формат таблицы и требование «не додумывать типичный проект».
- **Наша сверка** этого ответа — в [2-plan.md](../2-plan.md).

---

| # | Раздел README | Что написано | Что в реальности (раздел facts.md) | Тип | Приоритет |
|---|---|---|---|---|---|
| 1 | Getting Started → Prerequisites | «**Node.js** v18+» | Самые строгие требования у `eslint` 10.12.0 и `@eslint/js` 10.0.1: `^20.19.0 \|\| ^22.13.0 \|\| >=24`. У `@playwright/test` 1.63.0: `>=20` (раздел «Node requirement», «Dependencies»). На Node 18 Playwright и ESLint не поддерживаются. Не подходят также 20.0–20.18, 21.x, 22.0–22.12 и 23.x, хотя формулировка «18+» их обещает. В CI стоит `node-version: lts/*`, локально `v24.19.0`. | устарело | **P1** |
| 2 | Project Structure | В дереве нет `package.json`, `.gitignore`, `README.md` и `.github/workflows/playwright.yml` | Все эти файлы есть в «Tracked files (git ls-files)» | отсутствует | P3 |
| 3 | Tech Stack → Lint | «ESLint + `eslint-plugin-playwright`» | В зависимостях есть ещё `typescript-eslint` ^8.71.1 и `@eslint/js` ^10.0.1 (раздел «Dependencies») | неточно | P3 |
| 4 | Tech Stack (весь раздел) | Версии инструментов не указаны | Установлены: Playwright 1.63.0, TypeScript 6.0.3, ESLint 10.12.0, typescript-eslint 8.71.1, dotenv 18.0.6 (раздел «Dependencies») | отсутствует | P3 |
| 5 | Test Cases → Status | У всех 5 кейсов стоит ✅ | Это противоречит самому README (строка 15): «reference tests show the code style… not a green run: your stand may contain defects». В facts.md нет данных о результатах прогонов, поэтому ✅ ничем не подтверждается. | неточно | P2 |
| 6 | Troubleshooting | Описана только ошибка `Missing env variable SESSION_URL` | Код вызывает `required('SESSION_URL')`, `required('ADMIN_EMAIL')` и `required('ADMIN_PASSWORD')` (раздел «process.env keys read by code»). Ошибки из-за отсутствующих `ADMIN_EMAIL` и `ADMIN_PASSWORD` не описаны. | отсутствует | P3 |
| 7 | Getting Started / Authentication | Нет единого списка переменных окружения. Что `ADMIN_EMAIL` и `ADMIN_PASSWORD` обязательны, видно только из раздела Admin. | В `.env.example` 4 ключа: `SESSION_URL`, `ADMIN_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`. Обязательные, судя по `required()`, — `SESSION_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`; `ADMIN_URL` читается как опциональный (разделы «Env keys», «process.env keys»). README по смыслу не противоречит, но эти сведения разбросаны по тексту. | неточно | P3 |
| 8 | Authentication (CI-абзац) | Говорится только про секреты и пропуск e2e без `SESSION_URL` | Это соответствует workflow (строки 14–17 и 29–37). Но в README не сказано, что CI запускает `npm ci`, `npx playwright install --with-deps chromium` и загружает артефакт `playwright-report` (раздел «CI»). | отсутствует | P3 |
| 9 | Tech Stack «Reporter» и Configuration «reporter» | Одна и та же строка «HTML + JSON (`test-results/results.json`)» повторена дважды | — | дублируется | P3 |
| 10 | Installation (примечание) и Authentication (⚠️) | Предупреждение «`.env`… секрет, не коммитить» повторено в двух местах | — | дублируется | P3 |

Что сходится с facts.md (не расхождения): все 6 npm-скриптов; все пути к файлам в дереве; пути storageState (`session.json`, `admin.json`, `customer.json`, `customer-data.json` совпадают с экспортами `config/env.ts`); экспорт `SESSION_STORAGE_STATE`; опциональность `ADMIN_URL`; набор секретов в CI; пропуск e2e без `SESSION_URL`, при котором выполняются только lint и typecheck. Переименования из истории учтены: `fixtures/auth.fixtures.ts` → `index.ts`, `tests/auth/auth.login.spec.ts` → `login.spec.ts`.

### Чего не хватает в документации вообще

- **Закреплённой версии Node.** В `package.json` нет `engines.node`, файлов `.nvmrc` и `.node-version` тоже нет (раздел «Node requirement»). В README нужно указать `^20.19 || ^22.13 || >=24` и добавить `engines` в `package.json`.
- **Раздела про CI.** Workflow `.github/workflows/playwright.yml` существует, а в README его шаги, версия Node (`lts/*`) и артефакт `playwright-report` не описаны.
- **Таблицы переменных окружения.** Нужна таблица с колонками «ключ / обязательна / откуда взять» по 4 ключам из `.env.example`.
- **CHANGELOG и описания процесса работы с ветками.** В истории три значимых изменения через PR из веток `fix/...` и `feature/...`, последнее — «Adapt framework to per-user stands with session link and admin» от 2026-10-23. CHANGELOG и CONTRIBUTING среди отслеживаемых файлов нет.
- **Карты «файл → класс».** Можно добавить к описанию архитектуры: `AuthHelper`, `AccountNav`, `AccountOverviewPage`, `ProfilePage`, `AdminSidebar`, `AdminLoginPage`, `AdminOrdersPage`, `AdminCustomersPage`, `LoginPage`, `RegisterPage`, `createCustomer`, `saveCustomer` и `loadCustomer` (раздел «Exported symbols»). Сейчас в README есть только имена файлов.

### Не могу проверить по этим данным

- Всю таблицу Configuration: `testDir`, `baseURL` из хоста `SESSION_URL`, `retries` 1/0 (код читает `process.env.CI`, что с этим согласуется, но значения не видны), `workers: 1`, `trace`, `screenshot`, путь JSON-репортера `test-results/results.json`. Содержимого `playwright.config.ts` в facts.md нет.
- Названия проектов `setup`, `chromium` и `admin`, их порядок и зависимости. От этого зависит, работает ли команда `npx playwright test --project=setup` и входит ли `admin.setup.ts` в проект `setup`.
- Правила в таблице Architecture Rules с пометкой «Enforced by ESLint» (запрет `locator()`/`getBy*()` и `page.goto()` в `tests/`, запрет `waitForTimeout`). Содержимого `eslint.config.mjs` в facts.md нет.
- «TypeScript (strict)» и «check without emitting» для `npm run typecheck`. Скрипт — просто `tsc`; если в `tsconfig.json` нет `noEmit`, он создаст `.js`-файлы. Содержимого `tsconfig.json` нет.
- Что `.env` и `playwright/.auth/` перечислены в `.gitignore`. Сам `.gitignore` отслеживается, но его содержимое не приведено. Косвенно это подтверждается тем, что `.env` нет среди tracked files.
- Что `fixtures/index.ts` экспортирует `expect` и фикстуру `customer`. В facts.md виден только `export const test = base.extend<AuthFixtures>`.
- ID и названия тест-кейсов AUTH-01/02, ACC-01, ADM-01/02 и что в них реально проверяется. Содержимого спек нет.
- Тексты ошибок в Troubleshooting (403, 502, «A session link is required», `ENOENT`) и механику выбора стенда через cookie.
- Что в Medusa Admin нет `data-testid`, а также локаль `/dk` и путь `/app`.
- Отдельно: **противоречие внутри самого facts.md.** `package-lock.json` добавлялся и менялся в коммитах `632c57f` и `bf132a2`, его удаление в истории не видно, но в списке tracked files его нет. При этом CI выполняет `npm ci`, которому нужен lockfile. Если `package-lock.json` действительно не отслеживается, шаг Install в CI упадёт. Это нужно перепроверить командой `git ls-files package-lock.json`.
