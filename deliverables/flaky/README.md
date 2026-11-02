# Flaky-тесты: анализ и стабилизация STORE-*

Задание 12 «Анализ flaky-тестов» (AQA). Ветка `feature/flaky-store-tests`, набор `tests/store/store.spec.ts`,
полный цикл — по **STORE-02** (сортировка по цене), остальные store-тесты — общий паттерн (шаг 5).
Работа идёт по этапам **Research → Plan → Implement → Verify**; каждому этапу соответствует один файл.

> **Статус:** анализ кода и гипотезы готовы, прогоны ждут доступа к стенду
> (`.env`: `BASE_URL`, `SESSION_LINK`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`).

## Итог

_Заполняется в конце: причина, вывод «тест или продукт», % падений до → после._

## Где что

| Пункт задания | Файл |
|---|---|
| Шаг 1 — прогоны, логи, статистика «до» | [1-research.md](1-research.md#3-прогоны-до) |
| a) Антипаттерны в коде теста | [1-research.md](1-research.md#2-анализ-кода-артефакт-a) |
| b) Успешный vs неуспешный прогон | [1-research.md](1-research.md#4-успешный-vs-неуспешный-прогон-артефакт-b) |
| Шаг 2 — гипотезы и план проверки | [2-plan.md](2-plan.md) |
| c) Исправление и почему оно устраняет причину | [3-fix.md](3-fix.md#1-исправление-артефакт-c) |
| d) Тест или продукт | [3-fix.md](3-fix.md#2-вывод-тест-или-продукт-артефакт-d) |
| Шаг 4 — ≥10 прогонов до/после, сверка вывода Claude | [4-verify.md](4-verify.md) |
| Рефлексия, попытки маскировки, шаблоны промптов | [5-reflection.md](5-reflection.md) |

## Структура

```
deliverables/flaky/
├── README.md          ← вы здесь
├── 1-research.md      критерии, анализ кода (a), прогоны «до», pass vs fail (b)
├── 2-plan.md          гипотезы, принудительное воспроизведение
├── 3-fix.md           исправление (c), вывод «тест или продукт» (d)
├── 4-verify.md        прогоны «после», проверки, трассировка «риск → результат»
├── 5-reflection.md    рефлексия + журнал промптов
└── runs/              сырые отчёты прогонов (*.json, *.log, *.meta.json)
```

Инструменты не дублируются здесь: всё переиспользуемое — в скилле
[`flaky-tests`](../../.claude/skills/flaky-tests/SKILL.md) (`.claude/skills/flaky-tests/`), специфика проекта —
в [`.flaky/`](../../.flaky/): [`profile.md`](../../.flaky/profile.md) (команды, параметры, конвенции, что не трогать)
и `apply-repro.patch`.

## Инструменты

| Файл | Что делает |
|---|---|
| `$SK/scripts/run-condition.mjs` | Запускает одно условие матрицы, кладёт отчёт в `runs/` и `*.meta.json`: коммит, `dirty`, `BASE_URL`, версии, время, снимок каталога |
| `$SK/scripts/flaky-stats.mjs` | Сводит отчёты в таблицу «тест × условие → pass / fail / % по целевой причине / % шума», сравнивает до и после |
| `$SK/scripts/list-snapshot.mjs` | Товары и цены в порядке SSR (селекторы — в профиле); `--repeat K` — меняется ли порядок сортировки между загрузками (гипотеза H3) |
| `$SK/templates/playwright/repro-conditions.ts` + `.flaky/apply-repro.patch` | Включает условие (`REPRO_CONDITION=…`) в фикстуре `page` настоящего теста; патч локальный, не коммитится |
| `$SK/templates/playwright/cold.config.ts` | Условие «cold»: store-тесты без логина админа и warm-сессии; cookie `SESSION_LINK` — через `REPRO_CONDITION=gate` |

`$SK` = `.claude/skills/flaky-tests`.

Команды — в [1-research.md](1-research.md#команды).
