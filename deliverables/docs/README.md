# Задание: поддержка документации фреймворка

Приведение документации фреймворка (`main` @ `6b9b877`) в соответствие с кодом по циклу Research → Plan → Implement → Verify с паттерном **«черновик → сверка с реальностью → именное подтверждение»**. Повторяемый процесс оформлен как скилл [`doc-drift-audit`](../../.claude/skills/doc-drift-audit/SKILL.md).

## Статус

**Задание выполнено** (06.11.2026): цикл Research → Plan → Implement → Verify пройден, документы сверены с кодом и
подтверждены именно — «Reviewed by Hanna Koval, 2026-11-06». Перепроверка 06.11 нашла 8 неточностей, все исправлены
([7-hallucinations.md](7-hallucinations.md)).

## Результат

| Документ | Что изменилось | Статус |
|---|---|---|
| [README.md](../../README.md) | Node `^20.19 \|\| ^22.13 \|\| >=24` (было v18+), таблица env, `npm ci`, `--no-deps`, `projects`, колонка `Automated`, Troubleshooting, правила ESLint, дерево | Reviewed by Hanna Koval, 2026-11-06 |
| [docs/ONBOARDING.md](../../docs/ONBOARDING.md) | новый: 9 шагов от clone до отчёта, у каждого «you should see …» | Reviewed by Hanna Koval, 2026-11-06 |
| [docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md) | новый: 7 слоёв, связи, mermaid-диаграмма, «куда добавлять новое» | Reviewed by Hanna Koval, 2026-11-06 |
| [docs/CHANGELOG.md](../../docs/CHANGELOG.md) | новый: PR #1, PR #2, Unreleased | Reviewed by Hanna Koval, 2026-11-06 |
| [package.json](../../package.json) | `engines.node` (+1 строка в lockfile) | — |

Расхождений найдено 14:

- 1 × P1: шаг установки не работает (Node 18);
- 4 × P2: admin-креды нужны для любого прогона, `--project=setup`, `projects`, ✅-статусы;
- 9 × P3.

Проверка:

- ONBOARDING пройден дословно на чистом клоне коммита ветки (06.11): `7 passed`, `npm run report` отдаёт отчёт.
- `check-doc-refs`: 1 error → **0 errors**.

## Файлы

| Файл | Шаг |
|---|---|
| [1-research.md](1-research.md) | сбор фактов, первичные наблюдения |
| [2-plan.md](2-plan.md) | сверка двух прогонов Claude, расхождения D1–D14 с приоритетами, что не делаем |
| [3-implement.md](3-implement.md) | черновик Claude → сверка → правки, по каждому документу |
| [4-verify.md](4-verify.md) | чистый клон, негативные сценарии, проверка ссылок, диаграмма, именное подтверждение |
| [5-reflection.md](5-reflection.md) | что дал Claude и что сверка, ошибки у себя, время, скилл, вопросы на решение |
| [6-prompt-log.md](6-prompt-log.md) | история промптов дословно |
| [7-hallucinations.md](7-hallucinations.md) | галлюцинации ИИ, найденные перепроверкой 06.11, и что исправить |
| [facts/](facts/) | `facts-v1.md` (вход прогона 1), `facts.md` (вход прогонов 2 и черновиков) |
| [claude/](claude/) | дословные ответы Claude: 01–02 расхождения, 03–06 черновики документов |
| [runs/](runs/) | логи: чистый клон, прогон без admin-кредов, `check-doc-refs` до/после, диаграмма PNG |

## Как воспроизвести

```bash
node .claude/skills/doc-drift-audit/scripts/collect-facts.mjs . --out deliverables/docs/facts/facts.md
node .claude/skills/doc-drift-audit/scripts/check-doc-refs.mjs .        # README + docs/**
```

«Claude» в этом отчёте — свежие субагенты Claude Code (Opus 5.5), у каждого был только явно перечисленный набор входных файлов. Промпты — шаблоны №1–5 из задания, полные тексты в [`references/prompts.md`](../../.claude/skills/doc-drift-audit/references/prompts.md).
