# Claude: поиск расхождений, прогон 2 (дословно)

- **Исполнитель:** новый свежий субагент, без контекста прогона 1. Ему разрешено читать только `README.md` и исправленный `deliverables/docs/facts/facts.md`, где теперь есть lockfile и ключевые конфиги целиком.
- **Промпт:** тот же шаблон №1 плюс одна фраза-**наводка**: «Pay special attention to how Playwright projects and their dependencies affect which env variables are required for any local run». Наводка взята из моего наблюдения №2 в [1-research.md](../1-research.md). Поэтому находку #2 ниже нельзя считать самостоятельной находкой Claude. Подробно об этом в [2-plan.md](../2-plan.md).

---

## Расхождения README.md и facts.md

| # | Раздел README | Что написано | Что в реальности (раздел facts.md) | Тип | Приоритет |
|---|---|---|---|---|---|
| 1 | Getting Started → Prerequisites | «**Node.js** v18+» | В **Dependencies** и **Node requirement**: `eslint` и `@eslint/js` требуют `^20.19.0 \|\| ^22.13.0 \|\| >=24`, `@playwright/test` требует `>=20`. В `package.json` поле `engines.node` не задано, `.nvmrc` нет. В CI стоит `node-version: lts/*`. Node 18 не подходит ни для Playwright 1.63, ни для ESLint 10. | устарело | P1 |
| 2 | Authentication (абзац **Admin**) и Running | «specs in `tests/admin/` run in the `admin` project with that session, everything else runs in the `chromium` project with the customer session». Из текста следует, что `ADMIN_EMAIL` и `ADMIN_PASSWORD` нужны только для admin-тестов. | В **playwright.config.ts** у проекта `setup` стоит `testMatch: /.*\.setup\.ts/`, поэтому в него попадают оба файла: `global.setup.ts` и `admin.setup.ts`. У `chromium` и у `admin` стоит `dependencies: ['setup']`. Значит, при любом локальном запуске (`npm test`, `npx playwright test tests/auth/login.spec.ts`, `--project=chromium`) сначала выполняется и логин в админку. В **process.env keys read by code** указаны `required('ADMIN_EMAIL')` и `required('ADMIN_PASSWORD')`. Без них не пройдёт даже запуск только storefront-тестов. | неточно | P1 |
| 3 | Authentication, шаг 1 | «The `setup` project runs first: it opens `SESSION_URL` … registers a new customer … saves … `customer.json`» | Проект `setup` состоит из двух файлов (`global.setup.ts` и `admin.setup.ts`, см. **Tracked files** и **playwright.config.ts**). Он также логинится в админку и сохраняет `admin.json` (`ADMIN_STORAGE_STATE` в **Exported symbols**). README описывает admin.setup отдельно и создаёт впечатление, что это другой этап. | неточно | P2 |
| 4 | Running (пример команды) | `npx playwright test --project=setup` описан как «Only regenerate the auth session» | Та же команда запускает и `admin.setup.ts` (**playwright.config.ts**, `testMatch`). Она пересоздаёт также `admin.json` и требует `ADMIN_EMAIL` и `ADMIN_PASSWORD`. | неточно | P2 |
| 5 | Troubleshooting | Описана только ошибка `Missing env variable SESSION_URL` | Обязательных переменных три: `required('SESSION_URL')`, `required('ADMIN_EMAIL')`, `required('ADMIN_PASSWORD')` (**process.env keys read by code**). Необязательная одна: `ADMIN_URL`, она читается как `process.env.ADMIN_URL`. Похожие ошибки для `ADMIN_EMAIL` и `ADMIN_PASSWORD` в README не описаны. | отсутствует | P2 |
| 6 | Troubleshooting | «`ENOENT: customer.json` / `customer-data.json` → Run `npx playwright test --project=setup` first» | Проект `setup` и так запускается автоматически перед `chromium` и `admin` (`dependencies: ['setup']`, **playwright.config.ts**). Значит, такая ошибка возникает, только если зависимости отключены (например, `--no-deps`) или если setup упал. Совет «запусти setup сначала» не объясняет, откуда берётся ошибка. | неточно | P3 |
| 7 | Project Structure | В дереве нет `.github/workflows/playwright.yml`, `.gitignore`, `package.json`, `package-lock.json`, `README.md` | Все эти файлы есть в **Tracked files**. CI в README упоминается, но путь к workflow-файлу нигде не указан. | отсутствует | P3 |
| 8 | Configuration | Таблица из 7 настроек | В **playwright.config.ts** есть ещё `fullyParallel: false`, `forbidOnly: !!process.env.CI` и три проекта `setup`, `chromium`, `admin` с `testMatch`/`testIgnore`, `storageState` и `dependencies`. Именно секция `projects` определяет, что и в каком порядке запускается, а в таблице её нет. | отсутствует | P2 |
| 9 | Architecture Rules | Перечислены три ESLint-правила: no `locator()`/`getBy*()`, no `page.goto()`, no `waitForTimeout` | В **eslint.config.mjs** включены также `playwright/no-focused-test` и `playwright/no-skipped-test` (оба `error`), под запрет попадают `$` и `$$`, подключён пресет `flat/recommended`. Для `*.setup.ts` отключено правило `expect-expect`. Запрет `test.skip` и `test.only` в README не упомянут. | отсутствует | P3 |
| 10 | Tech Stack → Lint | «ESLint + `eslint-plugin-playwright`» | В **eslint.config.mjs** и **Dependencies** также используются `typescript-eslint` (`tseslint.configs.recommended`) и `@eslint/js`. | неточно | P3 |
| 11 | Tech Stack и Configuration | Reporter «HTML + JSON (`test-results/results.json`)» указан в обеих таблицах. Auth strategy и `storageState` описаны и в Tech Stack, и в Authentication. | Значения совпадают с **playwright.config.ts**, но одна и та же информация стоит в двух местах. При следующем изменении её придётся править дважды. | дублируется | P3 |
| 12 | Authentication, шаг 3 | Сниппет `test.use({ storageState: SESSION_STORAGE_STATE })` без import | `SESSION_STORAGE_STATE` экспортируется из `config/env.ts` (**Exported symbols**), а `fixtures/index.ts` его не реэкспортирует (**fixtures/index.ts**). Из сниппета непонятно, откуда импортировать. | неточно | P3 |
| 13 | Project Structure → fixtures | «Custom fixtures: import test/expect from here» | В **fixtures/index.ts** есть фикстуры `authHelper`, `loginPage`, `accountPage`, `adminLoginPage`, `adminOrdersPage` и `customer`. В README упомянута только `customer`. Для `ProfilePage`, `RegisterPage`, `AdminCustomersPage` и `AdminSidebar` фикстур нет. | отсутствует | P3 |

## Чего не хватает в документации вообще

- **Какие переменные обязательны для какого запуска.** По facts.md для любого e2e-запуска обязательны `SESSION_URL`, `ADMIN_EMAIL` и `ADMIN_PASSWORD`. `ADMIN_URL` необязательна. Нужна таблица «переменная / обязательна / где используется», и в ней явно сказать, что admin-логин входит в общий `setup`. Это следует из `testMatch` и `dependencies` в playwright.config.ts и из `required(...)` в списке env keys.
- **Граф проектов.** Нужно описать: `setup` включает оба setup-файла, `chromium` и `admin` зависят от `setup`. Также стоит сказать, как запустить тесты без пересоздания сессий: через `--no-deps`. Это поведение Playwright, а не факт из facts.md, поэтому его надо проверить по документации.
- **Реальное требование к Node.** Нужно указать `^20.19.0 || ^22.13.0 || >=24` (это engines у eslint и @eslint/js) и при желании добавить `engines.node` в package.json.
- **CI.** Нужно указать путь `.github/workflows/playwright.yml`, порядок шагов (`npm ci` → lint → typecheck → установка браузеров → тесты → upload-artifact `playwright-report`) и версию Node `lts/*`. Также стоит сказать, что в CI действует `forbidOnly` и `retries: 1`.

## Не могу проверить по этим данным

- Locale `/dk`, Admin по пути `/app`, отсутствие `data-testid` в Medusa Admin, выбор стенда по cookie при общем хосте.
- Тексты ошибок в Troubleshooting: `Missing env variable SESSION_URL` (точная формулировка, видно только `process.env[name]` и `required(...)`), `The stand rejected SESSION_URL (403)`, «A session link is required», `HTTP 502`. Кода `auth.helper.ts` и `config/env.ts` в facts.md нет.
- Вычисляются ли `required(...)` сразу при импорте `config/env.ts`, то есть при загрузке playwright.config.ts, или только при обращении. От этого зависит, упадёт ли запуск сразу на старте конфига.
- Что именно делают `global.setup.ts` и `admin.setup.ts` (регистрация с уникальным email, использование `ADMIN_URL`) и как устроены `data/customer.ts` и `createCustomer`.
- Статусы ✅ в таблице Test Cases и сами ID и названия тестов (AUTH-01/02, ACC-01, ADM-01/02): содержимого spec-файлов в facts.md нет.
- Что `networkidle` не дожидается завершения на storefront, советы про `Set-ExecutionPolicy` и `codegen`.
- Нужен ли локально `--with-deps` для `npx playwright install` (в CI он используется).
- Раздел License («Private»): в facts.md нет ни LICENSE, ни поля license.
