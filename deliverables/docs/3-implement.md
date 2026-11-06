# 3. Implement: черновики Claude → сверка → правки

Порядок работы по каждому документу одинаковый:

1. Черновик пишет **свежий субагент** по шаблону промпта из задания. На вход он получает только перечисленные файлы.
2. Ответ сохраняется **дословно** в [claude/](claude/).
3. Я сверяю каждое утверждение с кодом (не с README и не с требованиями) и вношу правки.
4. В шапку документа ставится `Status: DRAFT … pending review by Hanna Koval`.

| Документ | Шаблон | Черновик Claude | Итог |
|---|---|---|---|
| Раздел установки README | №2 | [03-readme-install.md](claude/03-readme-install.md) | [README.md](../../README.md) (точечные правки по всему файлу) |
| Setup-гайд | №3 | [04-onboarding.md](claude/04-onboarding.md) | [docs/ONBOARDING.md](../../docs/ONBOARDING.md) |
| Архитектура + диаграмма | №4 | [05-architecture.md](claude/05-architecture.md) | [docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md) |
| «Что изменилось» | №5 | [06-changelog.md](claude/06-changelog.md) | [docs/CHANGELOG.md](../../docs/CHANGELOG.md) |

Изменение кода одно: в [package.json](../../package.json) добавлено `engines.node: ^20.19.0 || ^22.13.0 || >=24`, плюс одна строка в lockfile (D1).

## README: раздел установки (шаблон №2)

> ⚠️ **Утечка в промпт.** Агент читал `package.json`, где `engines` уже стоял (я добавила его до запуска). Диапазон Node он взял оттуда, а не вывел сам. Он честно отметил, что `facts.md` говорит «not declared», а `package.json` — другое.

| Предложение Claude | Сверка | Решение |
|---|---|---|
| Node `^20.19.0 \|\| ^22.13.0 \|\| >=24` | Совпадает с engines зависимостей | ✅ принято (D1) |
| Таблица переменных «Required» | `config/env.ts`: `required()` для трёх ключей, `ADMIN_URL` опционален | ✅ принято. Уточнено **«Yes, for any run»** с причиной (D2): у Claude «Yes» без объяснения, что admin нужен даже для storefront |
| `npm install` | CI делает `npm ci`, lockfile в git | ✏️ заменено на `npm ci` |
| `--project=setup` — «Only regenerate the auth sessions» | Пересоздаёт и admin-сессию | ✏️ «customer AND admin» + новый пример `--no-deps` (D3) |
| Абзац про проекты | Верно, но без связи `dependencies` | ✏️ строка `projects` перенесена в таблицу Configuration (D4) |

Остальные правки README сделаны по [2-plan.md](2-plan.md):

- D5: колонка `Automated` и легенда.
- D6: Troubleshooting — `ADMIN_*`, `ENOENT`, codegen для Admin.
- D7: правило `test.only`/`test.skip`.
- D8: import в сниппете.
- D9: дерево с `docs/`, `.github/`, `package.json`.
- D12: Lint.
- Сверху статус DRAFT и ссылки на `docs/`.

## ONBOARDING (шаблон №3)

Черновик сильный. Агент не угадывал, а вынес 7 вопросов в TODO, как просили. Структура «шаг → команда → что увидите» сохранена.

| TODO / утверждение Claude | Как закрыто |
|---|---|
| Какая версия Node — стандарт? | `engines` в `package.json`. `npm ci` на неподходящем Node печатает `EBADENGINE` и для корневого `engines` (`ai-training`), и для зависимостей. 03.11 по документации npm сделан неверный вывод «корневой — только advisory, без предупреждения»; 06.11 проверено запуском (npm 11.17.0, `engines.node: ">=99"` → `npm warn EBADENGINE … package: x@1.0.0`), формулировка исправлена |
| Clone URL / как создать приватную копию | «как описано в вашем задании» — процесс задают организаторы, а не репо |
| `npm install` или `npm ci`? | `npm ci` |
| Гарантирован ли чистый lint/typecheck? | Проверено на чистом клоне: exit 0 ([4-verify.md](4-verify.md)) |
| Триггеры CI | `on: push` + `workflow_dispatch`. Агент их не увидел, потому что collector брал из workflow только `run/uses/name`. **Collector исправлен:** workflow теперь в facts целиком |
| macOS/Linux | bash-варианты в комментариях, `--with-deps` для Linux |
| Где взять задание и стенд | Вне репо, оставлено «from your task» |
| «5 test cases executed besides setup» | Уточнено до «7 tests: 2 setup + 5» — именно так пишет Playwright (`Running 7 tests`) |
| Нет `Missing env variable ADMIN_EMAIL` в таблице ошибок | ✏️ добавлено, плюс таймаут холодной админки (`setup.setTimeout(90_000)`) |
| Нет `--no-deps` | ✏️ добавлено в day-to-day команды |
| Совет про trace | ✏️ добавлено: «to get a trace, run with `--trace on`» (флаг проверен `npx playwright test --help`) |

## ARCHITECTURE (шаблон №4)

Главный риск из задания — «типичный AQA-фреймворк, которого нет». **Не подтвердился:** выдуманных слоёв (BasePage, API client, builders, logger) нет, догадки помечены как *inferred*. Ошибки другого рода — пропуски, потому что агент видел только экспорты, а не тела классов:

| У Claude | В коде | Правка |
|---|---|---|
| «It has six layers», а в таблице 7 | — | ✏️ seven, плюс явная фраза «нет base page / API client / logger» |
| Нет паттерна навигации | `LoginPage.login()` → `AccountOverviewPage`, `AdminOrdersPage.openCustomers()` → `AdminCustomersPage` и др. (6 переходов; `RegisterPage.register()` → `AccountOverviewPage` пропущен 03.11 и добавлен 06.11) | ✏️ пункт 5 со всеми переходами; контракт `goto()`/`waitForLoaded()` описан по классам, а не «у каждого» |
| Setup «saves sessions (inferred)» | `global.setup.ts`, `admin.setup.ts`: `storageState({ path })` в самих setup-файлах | ✏️ шаги setup по файлам, без *inferred* |
| На диаграмме setup пишет в `.auth` напрямую, связи с `AuthHelper`/`createCustomer` нет | Setup использует `AuthHelper`, `createCustomer`, `saveCustomer`, а не фикстуры | ✏️ рёбра `SETUP → AUTH`, `SETUP → DATA`; `AUTH → LOGIN/ADM` |
| «Projects depend on setup» как ребро project → spec | Зависимость — между проектами | ✏️ `P_CHROME → P_SETUP`, `P_ADMIN → P_SETUP` |
| Нет `test.use({ storageState: SESSION_STORAGE_STATE })` | `login.spec.ts`, блок `Login` в `admin.spec.ts` | ✏️ пункт 3 |
| Не сказано, когда читаются env | Ленивые геттеры; `baseURL` читает `SESSION_URL` при загрузке конфига | ✏️ пункт 1 |
| — | — | ➕ раздел «Where to add things» для автора нового теста |

Диаграмма отрендерена (см. [4-verify.md](4-verify.md)). Две пунктирные связи «spec → config/env» убраны с картинки и описаны текстом: они пересекали всю схему.

## CHANGELOG (шаблон №5)

| Утверждение Claude | Проверка | Решение |
|---|---|---|
| *(inferred)* npm-скрипты добавлены в PR #1 | `git show bf132a2:package.json` — все 6 скриптов | ✅ перечислены явно |
| *(inferred)* в `AuthHelper` логика регистрации и storageState | `git show c5ce0db -- helpers/auth.helper.ts`: регистрация, `openSession`, `loginAsAdmin`. storageState сохраняют setup-файлы | ✏️ половина неверна, исправлено |
| *(inferred)* «`ADMIN_URL` нужен admin-проекту, без него тесты падают» | Коммит: «ADMIN_URL is optional»; код: fallback на `/app/login` | ❌ **неверно**, исправлено |
| Остальное (без пометки *inferred*) | Совпадает с сообщениями коммитов | ✅ |
| Пропущено | `git show bf132a2:.env.example`, `…:tests/auth/global.setup.ts` | ➕ **`ADMIN_EMAIL`/`ADMIN_PASSWORD` сменили смысл** в PR #2: были storefront-аккаунтом, стали кредами Medusa Admin. Это самое важное breaking-изменение для автора тестов |
| — | — | ➕ раздел «Unreleased» про эту ветку |

> **Моя ошибка, пойманная сверкой.** В первой версии итогового CHANGELOG я написала «`ADMIN_EMAIL`/`ADMIN_PASSWORD` are new» в PR #2. Проверка `git show bf132a2:.env.example` показала, что они были уже в PR #1. Правило «сверять с реальностью» относится и к тексту, который пишет человек, а не только к ответам Claude.

## Осознанно оставлено как есть

- `devEngines` с `onFail: "error"` реально блокирует `npm ci` на неподходящем Node (документация npm). Но это изменение поведения установки, а не документации: вынесено на решение в [5-reflection.md](5-reflection.md).
- Рекомендация «work in a private repository» сохранена. Это правило организаторов, а не факт о коде.
