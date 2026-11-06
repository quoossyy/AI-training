# 3. Implement — исправление и вывод

> Без sleep, роста таймаутов, ретраев и ослабления ассертов. Код до фикса — `dee3b18`, фикс — рабочее дерево
> поверх него (`pages/store/store.page.ts`, `tests/store/store.spec.ts`). Все прогоны — 2026-11-05,
> `qa-sandbox.inno.ws`, Playwright 1.63.0, Chromium 153; сырые данные — [runs/](runs/).

## 1. Исправление (артефакт c)

### Причина

**H2 доказана: тест читает список раньше, чем пришёл отсортированный ответ.** Клик доходит до приложения, но
`productNames()` (`allTextContents()`, однократное чтение) выполняется в ту же миллисекунду, что и уходит
запрос сортировки.

| Данные | Что показали | Где |
|---|---|---|
| Прогоны «до», 4 условия | STORE-02 **0 pass / 90 fail** (base 50, parallel 20, isolated 20, cold 20), одна сигнатура: `Received: "Medusa Sweatshirt"` | [1-research.md §3](1-research.md#3-прогоны-до) |
| Trace падения (base) | запрос `?sortBy=price_desc` ушёл в 9534 мс, ответ — через 99 мс (~9633); список прочитан в 9539–9583, ассерт — 9588. Чтение на **50–95 мс раньше ответа** | [1-research.md §4](1-research.md#4-успешный-vs-неуспешный-прогон-артефакт-b) |
| 20 trace cold + 35 trace cpu | запрос сортировки есть **в 55 из 55** падений → клик не теряется, **H1 не наблюдалась ни разу** | `runs/_local/before/cold_store02_trace/`, `runs/_local/before/cpu_fail_trace/` (локально) |
| Repro H2 (ответ сортировки +3 с) | исходный код **10/10 fail**, фикс **10/10 pass** | `runs/{before,after}/…_repro-h2-delay.json` |
| Repro CPU ×20 | исходный код **5/50 pass** — флейк появляется, когда медленный CPU растягивает чтение и ответ успевает отрисоваться; фикс **10/10 pass** | `runs/{before,after}/…_repro-h1-cpu.json` |
| Снимок каталога ×20 | прямая загрузка `?sortBy=price_desc` всегда даёт T-Shirt первым; все цены €10.00 | [2-plan.md §2](2-plan.md#2-принудительное-воспроизведение) |

### Изменения

```diff
--- a/pages/store/store.page.ts
+++ b/pages/store/store.page.ts
-  /** Waits until the client-rendered list has painted at least one card. */
+  /**
+   * Waits until at least one card is painted. The list is server-rendered, so this
+   * means "HTML arrived", not "the page reacts to clicks".
+   */
   async waitForLoaded() { … }

+  /** Product prices as numbers, in rendered order (single read, no waiting). */
+  async productPriceValues(): Promise<number[]> {
+    const prices = await this.productPrices.allTextContents();
+    return prices.map((price) => Number(price.replace(/[^\d.]/g, '')));
+  }

   async sortBy(label: string) {
+    const before = this.page.url();
     await this.sortOptions.filter({ hasText: label }).first().click();
+    await this.page.waitForURL((url) => url.href !== before);
   }

--- a/tests/store/store.spec.ts
+++ b/tests/store/store.spec.ts
-  test('STORE-02: …', async ({ storePage }) => {
+  test('STORE-02: …', async ({ page, storePage }) => {
     await storePage.goto();
     await storePage.waitForLoaded();
     await storePage.sortBy('Price: High -> Low');
-    const names = await storePage.productNames();
-    expect(names[0]).toBe('Medusa T-Shirt');
+    await expect(page).toHaveURL(/[?&]sortBy=price_desc(&|$)/);
+    await expect(storePage.productTitles.first()).toHaveText('Medusa T-Shirt');
+    const prices = await storePage.productPriceValues();
+    expect(prices).toEqual([...prices].sort((a, b) => b - a));
   });
```

`sortBy()` используется только в STORE-02 (поиск по `tests/`, `pages/`) — другие тесты изменение не затрагивает.

### Почему это устраняет причину, а не симптом

- **Ждём результат действия, а не отрисовку.** `sortBy()` возвращается, только когда клик сработал: URL
  сменился (смена URL через History API для Playwright — навигация, `waitForURL` её ловит; проверено по
  документации Playwright 1.63 через Context7). Это ожидание события, а не фиксированной задержки.
- **Retrying-ассерт вместо однократного чтения.** `toHaveText` на первом заголовке перечитывает DOM до
  появления отсортированного списка — гонка «чтение vs перерендер» закрыта, сколько бы ни шёл ответ (repro +3 с —
  10/10 pass). Таймауты не менялись (дефолтные 5 с ассерта / 30 с теста).
- **Ассерт не ослаблен, а усилен.** Сохранена исходная проверка «T-Shirt первый», добавлены: сортировка
  применена (`sortBy=price_desc` в URL) и цены по невозрастанию — то, что сортировка по цене действительно
  гарантирует. Сейчас все цены равны, и последняя проверка тривиальна; она начнёт ловить ошибки, как только
  в каталоге появятся разные цены.
- **Диагностика при поломке.** Клик без эффекта → падение в `sortBy()` с `page.waitForURL` (строка сортировки);
  неверный порядок → `toHaveText` с `Expected "Medusa T-Shirt" / Received "…"`. Обе ветки проверены
  негативными проверками ([4-verify.md §3](4-verify.md#3-проверки)).

### Проверка под repro и негативная проверка

| Проверка | Как | Ожидание | Результат |
|---|---|---|---|
| Repro H2 | `REPRO_CONDITION=request-delay REPRO_URL_RE='[?&]sortBy='` (+3 с) | фикс проходит | **10/10 pass** (до фикса 10/10 fail) |
| Repro CPU ×20 | `REPRO_CONDITION=cpu REPRO_CPU_RATE=20` | фикс проходит | **10/10 pass** (до фикса 5/50 pass) |
| Негатив 1: сортировка не применяется | ответ сортировки задержан на 60 с (`REPRO_DELAY_MS=60000`) | тест падает в `sortBy()` | **3/3 fail**: `page.waitForURL: Test timeout … at store.page.ts:60` |
| Негатив 2: сортировка сломана | `.flaky/negative-wrong-order.patch`: URL `price_desc`, сервер отвечает порядком по умолчанию | тест падает на порядке | **3/3 fail**: `toHaveText … Expected "Medusa T-Shirt", Received "Medusa Sweatshirt"` |

### Отличие от эталона в `FLAKY-TESTS.md`

Эталон: `await expect.poll(() => storePage.productNames().then(n => n[0])).toBe('Medusa T-Shirt')`.

- **Причина в эталоне названа неверно для этого стенда.** `FLAKY-TESTS.md` и комментарий теста объясняют
  флейк гидрацией («клик до React теряется, запроса нет»). На стенде 2026-11-05 запрос сортировки был в 55/55
  падениях — клик не терялся ни разу. Причина — однократное чтение до ответа (R-02 в карте рисков; в комментарии
  теста не названа).
- **Частота другая.** Эталон: ~40–60% pass warm, ~87% pass cold. Измерено: **0/90 pass** во всех обычных условиях;
  флейк (5/50 pass) появляется только под CPU ×20. На этой машине и стенде тест не «флейкал», а падал
  детерминированно — та же гонка с другим исходом.
- **Эталон тоже устранил бы гонку** (`expect.poll` перечитывает), но:
  - при клике без эффекта он падает с «`Received: Medusa Sweatshirt`» — неотличимо от сломанной сортировки;
    фикс разводит эти случаи (`waitForURL` в `sortBy()` vs `toHaveText`);
  - он оставляет тест привязанным к tie-break при равных ценах (R-03) и не проверяет, что сортировка по цене
    вообще соблюдена; фикс добавляет проверки URL и порядка цен;
  - ожидание результата действия живёт в Page Object (конвенция профиля «PO ждут свои состояния»), а не в
    каждом тесте, который сортирует.

## 2. Вывод: тест или продукт (артефакт d)

| Тест | Вердикт | Обоснование (данные) | Действие | Вопрос/баг команде |
|---|---|---|---|---|
| STORE-02 | **Тест** (ожидание + оракул) | Продукт сортирует корректно и стабильно: 20/20 прямых загрузок `price_desc` дают один порядок; клик всегда отправляет запрос. Падает тест: читает до ответа (H2 доказана repro 10/10) | Фикс (выше), 0/90 → 90/90 pass | **Данные стенда:** все 4 товара по €10.00 — сортировку по цене проверить по существу нельзя, «T-Shirt первый» держится на недокументированном tie-break сервера. Вопрос: добавить товары с разными ценами или зафиксировать tie-break (например, по названию) как требование |
| STORE-02 | Продукт — **не дефект** | H6 опровергнута: сервер не игнорирует `sortBy` (снимок ×20, 1 уникальный порядок) | — | — |

Гипотезы H4 (warm vs cold) и H5 (нагрузка) на частоту в обычных условиях не влияют (100% fail везде); CPU ×20
меняет исход только в сторону случайных проходов — это подтверждает H2, а не отдельную причину.
