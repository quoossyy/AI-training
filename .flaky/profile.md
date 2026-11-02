# Flaky profile — AI-training (aitraining-ctrl/AI-training)

Профиль для скилла `flaky-tests`. Собран из `package.json`, `playwright.config.ts`, `eslint.config.mjs`,
`.github/workflows/playwright.yml`, `README.md`, `FLAKY-TESTS.md`.

- **Playwright:** Test 1.63, TypeScript; команды и условия — `references/measurement.md`, repro — `references/root-cause.md`
- **Skill:** `.claude/skills/flaky-tests/` (проектная копия, источник истины; глобальная `~/.claude/skills/flaky-tests`
  синхронизируется копированием). Ниже `SK=.claude/skills/flaky-tests`.
- **Artifacts dir:** `deliverables/flaky/` — только отчёты и `runs/`; скрипты и шаблоны — в скилле, обвязка — `.flaky/`
- **Threshold N (fixed):** 30 «после» на условие; detection — 20 повторов; минимум задания — 10
- **Env prep:** `npm ci`; `npx playwright install chromium`; `.env` из `.env.example`:
  `BASE_URL`, `SESSION_LINK` (гейт sandbox: без него весь хост отвечает 403), `ADMIN_EMAIL`, `ADMIN_PASSWORD`.
  `.env` и `playwright/.auth/` — в `.gitignore`, в артефакты не попадают.
- **Projects:** `setup` (логин админа → `playwright/.auth/admin.json`) → `flaky` (только `tests/store/store.spec.ts`,
  `storageState` админа) и `chromium` (всё остальное). `npm test` = `--project=chromium`.
- **Определения команд** — единственное место; выполнить в Git Bash из корня репо перед командами из отчётов
  (`deliverables/flaky/*.md` используют `$SK`, `$RC`, `$SNAP`, `${META[@]}`, `${PW[@]}`):
  ```bash
  SK=.claude/skills/flaky-tests   # скилл flaky-tests: скрипты и шаблоны
  RC="node $SK/scripts/run-condition.mjs"
  SNAP="node $SK/scripts/list-snapshot.mjs --gate-env SESSION_LINK --item [data-testid=product-wrapper] \
  --field [data-testid=product-title] --field [data-testid=price] default=dk/store price_desc=dk/store?sortBy=price_desc"
  META=(--meta-env BASE_URL --version-cmd "npx playwright --version" \
    --browser-cmd "node -e \"require('@playwright/test').chromium.launch().then(async b=>{console.log('chromium '+b.version());await b.close()})\"" \
    --snapshot-cmd "$SNAP")
  PW=(npx playwright test --retries=0 --reporter=list,json --trace retain-on-failure)
  ```
- **Run (base):** `$RC <phase> <condition> [--block N] "${META[@]}" -- "${PW[@]}" --project=flaky --repeat-each 20
  --workers=1 [--grep "STORE-0X:"]`
- **Filter one test:** `--grep "STORE-02:"` (двоеточие — якорь, чтобы не задеть другие ID)
- **Repeat / workers / retries off:** `--repeat-each N` / `--workers=1|4` (+ `--fully-parallel`, т.к. в конфиге
  `fullyParallel: false`) / `--retries=0` (в конфиге `retries: CI ? 1 : 0`)
- **Cold / warm:** warm = проект `flaky` как есть (storageState админа). Cold = шаблон скилла + условие `gate`
  (без `SESSION_LINK` стенд отвечает 403, а store-тесты сами сессию не открывают):
  `git apply .flaky/apply-repro.patch`, затем `REPRO_CONDITION=gate REPRO_GATE_ENV=SESSION_LINK npx playwright test
  -c $SK/templates/playwright/cold.config.ts --project=flaky-cold` — пустой `storageState`, без `setup`, каждый
  тест сначала открывает session link (store не требует логина).
- **Throttled / repro:** `git apply .flaky/apply-repro.patch` (override фикстуры `page` в `fixtures/index.ts` →
  `$SK/templates/playwright/repro-conditions.ts`), затем `REPRO_CONDITION=…`; после — `git checkout -- fixtures/index.ts`.
  Условия проекта: `throttled`; cold — `gate` (`REPRO_GATE_ENV=SESSION_LINK`); H1 — `cpu` (`REPRO_CPU_RATE=20`); H1 (альт.) — `request-delay`
  с `REPRO_URL_RE='/_next/static/.+\.js(\?|$)'`; H2 — `request-delay` с `REPRO_URL_RE='[?&]sortBy='`
  (`REPRO_DELAY_MS=3000`).
- **Snapshot cmd:** `$SNAP` (см. Run) — имена+цены в порядке по умолчанию и при `?sortBy=price_desc` (SSR-HTML, без
  кликов). С `--repeat K` — сколько разных порядков у каждой страницы (`price_desc_distinct_orders`).
- **Noise regex:** setup — по умолчанию скилла (логин, `storageState`, session link, 401/403); network — по
  умолчанию. Падения проекта `setup` → все store-тесты «did not run» → считаются как `setup`-шум.
- **Lint / typecheck / main suite:** `npm run lint` / `npm run typecheck` / `npm test`
- **Architecture conventions:**
  - локаторы — только в Page Object (`pages/**`); в `tests/**` запрещены `locator/getBy*/$/$$` (ESLint
    `no-restricted-syntax`);
  - навигация — только через `goto()` Page Object, не `page.goto()` в тестах (ESLint);
  - ассерты — в спеках; PO возвращают данные/локаторы и ждут свои состояния (`waitForLoaded`);
  - PO подключаются через фикстуры `fixtures/index.ts` (`storePage`, `loginPage`, …);
  - запрещены `waitForTimeout` (ESLint error), `test.only`, `test.skip`; `eslint-disable` не добавлять;
  - TS strict, `noUnusedLocals`.
- **Do not touch:** `.github/workflows/*` (CI организаторов), `config/env.ts` контракт переменных, upstream-ветки.
  Пушить только в `origin` (свой форк), `upstream` push отключён.
