# 1. Research: сбор контекста

Цель шага: положить рядом **текущую документацию** и **реальность кода**, чтобы искать расхождения, а не писать README «с нуля».

## База

- Ветка `task/docs` от `main` @ `6b9b877` (2026-10-23, «Merge PR #2 base-session-flow»).
- Документация на входе: только [`README.md`](../../README.md) (≈240 строк). Других md, wiki и диаграмм в репозитории нет.
- Обратной связи от новичков нет. Её заменяет собственный опыт онбординга на этом репо в заданиях 1–2: путаница `BASE_URL` / `SESSION_URL`, вопрос, какие переменные обязательны локально.

## Как собрана «реальность»

Вручную дерево не копировалось. Скрипт скилла собирает факты прямо из репозитория:

```powershell
node .claude/skills/doc-drift-audit/scripts/collect-facts.mjs . --out deliverables/docs/facts/facts.md
```

| Что собрано | Откуда | Раздел в [facts.md](facts/facts.md) |
|---|---|---|
| Отслеживаемые файлы | `git ls-files` | Tracked files |
| npm-скрипты | `package.json` | package.json scripts |
| Зависимости: заявлено / установлено / `engines.node` | `package.json` + `node_modules/*/package.json` | Dependencies |
| Требование к Node | engines зависимостей, `.nvmrc` | Node requirement |
| Шаги CI, секреты | `.github/workflows/playwright.yml` | CI |
| Переменные окружения | `.env.example` и реальные `process.env`/`required()` в коде | Env keys, process.env keys |
| Ключевые классы и функции | `git grep "^export class|function|const"` | Exported symbols |
| История | `git log` | Git history |

Кроме того, вручную прочитаны все исходники (`pages/`, `helpers/`, `data/`, `fixtures/`, `tests/`, конфиги): этого требует описание архитектуры, и так можно проверить выводы Claude на шаге 2.

## Первичные наблюдения (до сравнения Claude)

1. `README.md:81` требует «Node.js v18+». Но `eslint` 10 / `@eslint/js` 10 требуют `^20.19 || ^22.13 || >=24`, а `@playwright/test` 1.63 требует `>=20`. В `package.json` нет `engines`, файла `.nvmrc` нет. Значит, шаг установки на Node 18 не работает. Автоматическая проверка подтверждает: [runs/check-refs-before.txt](runs/check-refs-before.txt).
2. Проект `setup` включает **оба** setup-файла (`testMatch: /.*\.setup\.ts/`), а `chromium` и `admin` зависят от него. Поэтому любой локальный прогон, даже одного `login.spec.ts`, требует `ADMIN_EMAIL`/`ADMIN_PASSWORD`. README описывает admin-креды только в разделе Admin и не говорит, что они обязательны всегда.
3. Фикстуры из `fixtures/index.ts` (`authHelper`, `loginPage`, `accountPage`, `adminLoginPage`, `adminOrdersPage`, `customer`) в README не перечислены. Новичок не знает, что уже доступно в тесте.
4. Раздела об архитектуре (как слои связаны между собой), гайда для новичка, диаграммы и changelog нет.
5. Troubleshooting: совет «Timeout on `fill()` → найти `data-testid` через codegen» не подходит для админки, где `data-testid` нет.
6. Команды установки только для PowerShell (`Copy-Item`).
7. В дереве структуры нет `.github/workflows/`, хотя CI есть и описан в тексте.

## Вывод

README в целом свежий (переписан 2026-10-23 вместе с кодом), поэтому расхождения точечные. Главное расхождение относится к P1: инструкция обещает Node, на котором проект не установится. Основной объём работы — то, чего нет вообще: онбординг, архитектура, changelog.
