# P5 — Генерация Page Objects (вариант Б)

Страница: `/dk/account/addresses` (Shipping Addresses). Основной сценарий: **ACC-02 — новый адрес появляется в адресной книге**;
дополнительно **ACC-03 — пустая форма не сохраняется** (покрывает метод чтения ошибок формы).
Ветка: `task/page-object` в форке `quoossyy/AI-training`.

| Шаг | Файл |
| --- | --- |
| 1. Research: вариант и причина, DOM, «стек + стратегия», расхождения с README, промпт | [1-research.md](1-research.md), [dom/](dom/) |
| 2. Plan: выдача модели дословно + пометки [вычеркнуто] / [добавлено вручную] / [изменено] | [2-plan.md](2-plan.md) |
| 3. Implement: код в репозитории (ниже) | — |
| Список правок «было → стало → почему → ограничение в промпте» (10 строк) + diff и полная выдача модели | [3-edits.md](3-edits.md) |
| Проверка: предотвращают ли ограничения ошибки (повторная генерация свежим агентом, прогон на стенде) | [5-prompt-check.md](5-prompt-check.md) |
| 4. Verify: прогоны, состояния вне DOM, уникальность локаторов | [4-verify.md](4-verify.md), [runs/](runs/) |

## Код (изменения в фреймворке)

| Файл | Что |
| --- | --- |
| [pages/account/addresses.page.ts](../../pages/account/addresses.page.ts) | `AddressesPage` |
| [pages/account/add-address-modal.component.ts](../../pages/account/add-address-modal.component.ts) | `AddAddressModal` |
| [pages/account/address-card.component.ts](../../pages/account/address-card.component.ts) | `AddressCard` |
| [pages/account/overview.page.ts](../../pages/account/overview.page.ts) | + `openAddresses()` |
| [data/address.ts](../../data/address.ts) | `createAddress()` — уникальный адрес |
| [tests/account/addresses.spec.ts](../../tests/account/addresses.spec.ts) | ACC-02, ACC-03 |
| [README.md](../../README.md) | структура + строки ACC-02, ACC-03 |

## Definition of Done

| Критерий | Где |
| --- | --- |
| Указан вариант (Б) и причина | [1-research.md](1-research.md#вариант-и-причина-выбора) |
| Лог / скриншот прохождения теста против песочницы | [runs/full-suite.log](runs/full-suite.log), [runs/full-suite-report.png](runs/full-suite-report.png) — 9 passed |
| Тест использует только методы и поля классов | спека: `goto`, `openAddresses`, `openAddAddressModal`, `submit`, `save`, `invalidFields`, `addressCard` + поля карточки и `modal.root`; ESLint запрещает локаторы в `tests/` |
| В классе нет фиксированных пауз | [4-verify.md](4-verify.md#фиксированные-паузы) |
| ≥ 5 строк правок с выдачей, итогом и ограничением в промпте | [3-edits.md](3-edits.md) — 10 строк; 8 из 9 ограничений подтверждены повторной генерацией ([5-prompt-check.md](5-prompt-check.md)) |
| Конвенции фреймворка; существующие тесты проходят вместе с новым | файлы в `pages/account/`, `tests/account/`, `data/`; переход через `AccountOverviewPage`; `npx playwright test` — 9 passed |
