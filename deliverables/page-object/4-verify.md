# Шаг 4 — Verify

## Прогоны

| Прогон | Команда | Итог |
| --- | --- | --- |
| Первый прогон кода модели (до правок) | `npx playwright test tests/account/addresses.spec.ts` | 3 passed (setup ×2 + ACC-02) |
| Итоговый ACC-02, 3 раза подряд на одном покупателе | `npx playwright test tests/account/addresses.spec.ts --repeat-each=3` | 5 passed. Со 2-го повтора в списке несколько карточек — выбор по уникальному `address1` находит одну |
| Мутация: ожидаемый город `CopenhagenX` | то же, одноразово, спека возвращена | 1 failed: `Expected "2100, CopenhagenX"`, `Received "2100, Copenhagen"` — ассерт не пустой |
| ACC-03 (пустая форма) | `npx playwright test tests/account/addresses.spec.ts` | ACC-02 + ACC-03 passed |
| Мутация ACC-03: из ожидаемого списка убрано `first-name-input` | то же, `-g ACC-03`, спека возвращена | 1 failed: `Received + "first-name-input"` — `invalidFields()` читает реальное состояние, а не константу |
| **Весь набор раннером фреймворка** | `npx playwright test` | **9 passed** — существующие AUTH-01/02, ACC-01, ADM-01/02 не сломались. Лог: [runs/full-suite.log](runs/full-suite.log), скриншот HTML-отчёта: [runs/full-suite-report.png](runs/full-suite-report.png) |
| Статика | `npm run typecheck`, `npm run lint` | без ошибок (правила ESLint: нет локаторов и `page.goto` в тестах, нет `waitForTimeout`) |

Скриншот страницы со сохранённым адресом (ручная проверка): [runs/manual-after-save.png](runs/manual-after-save.png).

## Состояния, которых не было в снятом DOM (проверено руками)

| Состояние | Что увидела | Что сделано |
| --- | --- | --- |
| Список с сохранённым адресом | Карточка `address-container` с `address-name`, `address-address`, `address-postal-city`, `address-province-country`, `address-edit-button`, `address-delete-button` | Локаторы `AddressCard` построены по ним (у модели — «требует DOM») |
| Сохранение | `POST /dk/account/addresses` → 200, модалка закрывается, карточка появляется | `submit()` ждёт закрытия модалки (`waitFor({ state: 'hidden' })`), тест ждёт карточку web-first ассертом |
| Пустые обязательные поля | Только нативная HTML5-валидация (`required`, `Please fill out this field.`), модалка остаётся открытой, элементов ошибок с `data-testid` нет; невалидны 5 полей — `country-select` по умолчанию уже `dk` | `invalidFields()` читает `validity` полей (без текста браузера, который зависит от локали) + тест ACC-03, см. правку №10 в [3-edits.md](3-edits.md) |
| Ошибка сервера | Подменила ответ server action на 500 (`page.route`) → Next.js показывает «Application error: a client-side exception» на всю страницу. Это артефакт мока (тело не RSC), не поведение продукта | Не воспроизводится честно без сбоя на сервере; в тест не включено |
| Модалка редактирования | Свой корень `edit-address-modal` | Конфликта с `add-address-modal` нет |
| Обёртка модалки | Внешний `role="dialog"` Headless UI нулевого размера → Playwright считает его `hidden` | Корень — `getByTestId('add-address-modal')`, не `getByRole('dialog')` |
| Страна по умолчанию | `country-select` уже стоит на `dk` | `selectOption('dk')` оставлен: тест не зависит от значения по умолчанию |

## Каждый локатор — ровно один элемент

Проверено одноразовым скриптом (`locator.count()` на стенде, в итоговый код не входит):

| Локатор | count |
| --- | --- |
| `wrapper`, `addAddressButton` | 1, 1 |
| `addAddressModal.root` (на всей странице) | 1 |
| `firstNameInput`, `lastNameInput`, `address1Input`, `postalCodeInput`, `cityInput`, `countrySelect`, `saveButton` | по 1 |
| `save-button` на всей странице (модалка открыта) | 1 |
| `addressCard(address1)` | 1 |
| `name`, `address`, `postalCity`, `provinceCountry` внутри карточки | по 1 |

## Фиксированные паузы

В `pages/`, `tests/`, `data/` нет `waitForTimeout` / `setTimeout`: модель их не ставила.
Единственный `setup.setTimeout(90_000)` в `tests/auth/admin.setup.ts` — это таймаут теста из исходного фреймворка, а не пауза.

## Наблюдения по доступности (не блокируют тест)

- `<label for="first_name">` и другие ссылаются на `id`, которого у `input` нет (есть только `name`), поэтому `getByLabel` не работает.
- У `close-modal-button` нет доступного имени (внутри только SVG, без `aria-label`).
