# 4. Verify — прогоны до/после

> «Починен» = 0 целевых падений из 30 в каждом обязательном условии + проходит repro + падает в негативной
> проверке ([критерии](1-research.md#1-критерии)). Все прогоны — 2026-11-05, одна сессия, снимок каталога
> одинаковый во всех прогонах (sha `63534fb1`).

## 1. Прогоны

Определения `$SK`, `$RC`, `${META[@]}`, `${PW[@]}` — в [профиле](../../.flaky/profile.md). Код «до» — в
`git worktree` на `dee3b18` (`node_modules` — junction на основной репо, `.env` скопирован), «после» — рабочая ветка
с фиксом (поэтому в `_meta` отчётов «после» `dirty: true`, коммит `dee3b18`). Блоки base чередуются:
before 1 → after 1 → before 2 → after 2 → before 3 → after 3 (15:21–15:25 UTC).

```bash
WT=<scratchpad>/wt-before; OUT=$PWD/deliverables/flaky/runs
git worktree add --detach "$WT" dee3b18
for b in 1 2 3; do
  (cd "$WT" && $RC before base --block $b --out-dir "$OUT" "${META[@]}" -- "${PW[@]}" --project=flaky \
     --grep "STORE-02:" --repeat-each 10 --workers=1)
  $RC after base --block $b "${META[@]}" -- "${PW[@]}" --project=flaky --grep "STORE-02:" --repeat-each 10 --workers=1
done
for b in 1 2 3; do $RC after parallel --block $b "${META[@]}" -- "${PW[@]}" --project=flaky --grep "STORE-02:" \
  --repeat-each 10 --workers=4 --fully-parallel; done
git apply .flaky/apply-repro.patch
for b in 1 2 3; do REPRO_CONDITION=gate REPRO_GATE_ENV=SESSION_LINK $RC after cold --block $b "${META[@]}" -- \
  "${PW[@]}" -c $SK/templates/playwright/cold.config.ts --project=flaky-cold --grep "STORE-02:" --repeat-each 10 --workers=1; done
git checkout -- fixtures/index.ts

# phase/condition берутся из _meta каждого отчёта; блоки и волна 1 одного условия суммируются
node $SK/scripts/flaky-stats.mjs --threshold 30 --out deliverables/flaky/runs/stats.md deliverables/flaky/runs
```

## 2. Результат

`flaky-stats --threshold 30`, STORE-02:

| Условие | До: прогонов / pass / fail | После: прогонов / pass / fail | % до → после | Вердикт |
|---|---|---|---|---|
| base (warm, 1 воркер) | 50 / 0 / 50 | 30 / 30 / 0 | 100% → 0% | ✅ починен |
| parallel (4 воркера, fully-parallel) | 20 / 0 / 20 | 30 / 30 / 0 | 100% → 0% | ✅ починен |
| cold (без storageState, через gate) | 20 / 0 / 20 | 30 / 30 / 0 | 100% → 0% | ✅ починен |
| repro H2 (ответ сортировки +3 с) | 10 / 0 / 10 | 10 / 10 / 0 | 100% → 0% | repro пройден |
| repro CPU ×20 | 50 / 5 / 45¹ | 10 / 10 / 0 | 90% → 0% | repro пройден |
| isolated (`--grep STORE-02:` отдельно) | 20 / 0 / 20 | — (все «после» — isolated) | — | — |

¹ 10 через `run-condition` (`runs/before/…_repro-h1-cpu.json`, 2 pass) + 40 с `--trace on` для пары pass/fail (`runs/before/cpu_pass_vs_fail/`, 0/10 и 3/30 pass).

Шум окружения (setup/network): 0 во всех прогонах STORE-02. «До» в base — 20 (волна 1) + 30 (блоки).
0 из 30 → верхняя граница реальной частоты ~10% (правило трёх) в каждом условии.

## 3. Проверки

- [x] `npm run lint` — 0 errors, 1 warning (`prefer-to-have-count`, STORE-03 — R-14, было до фикса)
- [x] `npm run typecheck` — чисто
- [x] `npm test` — 4 passed (setup, ACC-01, AUTH-01, AUTH-02)
- [x] repro-условия из [2-plan.md](2-plan.md) проходят на фиксе: H2 10/10, CPU ×20 10/10
- [x] негативная проверка 1 — сортировка не применяется (ответ +60 с): 3/3 fail в `sortBy()`,
  `page.waitForURL: Test timeout of 30000ms exceeded … at store.page.ts:60`
- [x] негативная проверка 2 — сортировка сломана (`.flaky/negative-wrong-order.patch`: URL `price_desc`, ответ
  в порядке по умолчанию): 3/3 fail, `toHaveText … Expected "Medusa T-Shirt" Received "Medusa Sweatshirt"`

`flaky-stats` помечает негативные условия как «❌ not fixed» — это ожидаемый исход (тест **должен** падать);
`[skill]` скрипт не знает об условиях с ожидаемым падением.

## 4. Сверка вывода Claude с наблюдаемым поведением

| Что предполагалось (статика, 2026-11-02) | Что показали прогоны | Расхождение |
|---|---|---|
| H1 (клик до гидрации) — самая вероятная, первая в списке; комментарий теста и `FLAKY-TESTS.md` говорят то же | Клик доходит в 55/55 проверенных падениях | **Ошибка приоритета.** H1 не наблюдалась ни разу |
| H2 (чтение до перерендера) — вторая, «в комментарии теста не названо» | Единственная наблюдаемая причина, доказана repro 10/10 | Гипотеза верная, но недооценена |
| STORE-02 — флейк ~40–60% (по комментарию) | 0/110 pass в обычных условиях — детерминированное падение; флейк только под CPU ×20 (5/50 pass) | Комментарий не подтвердился; критерий «комментарии ≠ данные» себя оправдал |
| R-03: tie при равных ценах может давать разный порядок | Порядок `price_desc` стабилен (20/20), но держится на tie-break | Риск оракула верен, нестабильности нет |
| H6 (сервер игнорирует `sortBy`) | Опровергнута снимком ×20 | — |
| `throttled` выявит латентные STORE-01/03/04/05 | Пресет (CPU ×4 + 400 кбит/с, 400 мс) не даёт странице дойти до `load` за 30 с — 79/80 падений в `page.goto` | Условие слишком жёсткое для этого стенда; латентные дефекты им не проверены |
| `request-delay` на JS-чанки может не расширить окно гидрации | Не понадобился — H1 не наблюдалась | — |

## 5. Трассировка

| Тест | Риск | Гипотеза | Доказательство | Вердикт | Фикс | Результат |
|---|---|---|---|---|---|---|
| STORE-02 | R-02 | H2 — чтение до перерендера | trace: чтение на 50–95 мс раньше ответа; repro +3 с: 10/10 fail → 10/10 pass | тест | `sortBy()` ждёт смену URL; `toHaveURL` + `toHaveText` вместо однократного чтения | 0/90 → 90/90 pass в 3 условиях |
| STORE-02 | R-01 | H1 — клик до гидрации | запрос сортировки в 55/55 падений | не наблюдалась | ожидание URL в `sortBy()` даст понятное падение, если проявится | — |
| STORE-02 | R-03 | H3 — оракул при равных ценах | снимок ×20: цены равны, порядок стабилен | данные стенда | + проверка цен по невозрастанию; вопрос команде | открыт вопрос |
| STORE-02 | — | H6 — дефект продукта | снимок ×20: 1 уникальный порядок | опровергнута | — | — |
| STORE-02 | R-06 | H4 — warm vs cold | 100% fail в обоих | не влияет | — | — |
| STORE-02 | — | H5 — нагрузка | parallel 100% fail; CPU ×20 → случайные проходы | не влияет на причину | — | — |
| STORE-01/03/04/05 | R-13…R-16 | латентные | stable-pass в base/parallel/cold (по 20); throttled невалиден | latent, не флейкают | не в объёме (шаг 5 — паттерн) | см. [1-research.md §5](1-research.md#5-общий-паттерн-остальные-store-тесты) |
