# Шаг 1 — Research

## Вариант и причина выбора

**Вариант Б — стартовый фреймворк** (`aitraining-ctrl/AI-training`, форк `quoossyy/AI-training`, ветка `task/page-object`).
Почему: фреймворк уже есть (Playwright + TypeScript, POM, фикстуры, storageState-сессия), а ESLint сам ловит
нарушения архитектуры (локаторы в тестах, `page.goto`, `waitForTimeout`). Значит, выдачу модели можно проверить
не только прогоном, но и конвенциями.

Исходные тесты проходят: `npx playwright test` на чистом `main` (`6b9b877`) → **7 passed**
([runs/main-before.log](runs/main-before.log)). Этот прогон сделан 06.11 при перепроверке. 03.11 перед началом работы
запускался только `--project=setup` (2 passed), и в первой версии отчёта это было подано как «исходные тесты
проходят» (см. [7-hallucinations.md](7-hallucinations.md) #8).

## Страница

`/dk/account/addresses` — «Shipping Addresses». Класса для неё в `pages/` нет: есть только `addressesLink`
в `pages/account/account-nav.component.ts`.

## Снятый DOM

| Файл | Что внутри |
| --- | --- |
| [dom/addresses.html](dom/addresses.html) | `addresses-page-wrapper` у нового покупателя: заголовок, описание, кнопка `add-address-button`, адресов нет |
| [dom/add-address-modal.html](dom/add-address-modal.html) | Модалка после клика «New address»: `add-address-modal`, 10 полей (`*-input`, `country-select`), `cancel-button`, `save-button`, `close-modal-button` |

**Как снят DOM.** Одноразовым скриптом Playwright с сохранённой сессией покупателя (`playwright/.auth/customer.json`):
`locator.evaluate(el => el.outerHTML)` для `addresses-page-wrapper` и для модалки после клика «New address».
`outerHTML` — то же свойство, которое копирует DevTools («копировать внешний HTML»). Вручную через DevTools для
сравнения не снимали. Скрипт вспомогательный, в репозиторий не входит.

**Отступление от решения.** Пользователь выбрал съёмку через Playwright MCP, и это было в утверждённом плане. Claude
снял DOM скриптом, не спросив и не объяснив причину, хотя инструменты MCP в сессии были доступны (ни одного вызова).
Это записано как случай #1 в [7-hallucinations.md](7-hallucinations.md). На содержание DOM это не влияет: MCP
`browser_evaluate` вернул бы тот же `outerHTML`.

При съёмке модалки выяснилось: внешний `role="dialog"` Headless UI Playwright считает `hidden`, видим внутренний блок
`add-address-modal`. Размер обёртки измерен 06.11 (`boundingBox()`): `width 1280, height 0` — модалка 553×518
отрисована её `fixed`-потомком.

Чего в снятом DOM **нет** (модель этого не видела, достраивается на Шаге 4): карточка сохранённого адреса,
сообщения об ошибках валидации и сервера, состояние кнопки сохранения во время запроса, закрытие модалки.

## Стек + стратегия локаторов (по README фреймворка)

```text
стек: Playwright Test + TypeScript (strict), Page Object Model
первичный признак: data-testid — getByTestId, со скоупом от корня страницы/компонента (this.root.getByTestId)
запасной признак: роль + доступное имя (getByRole) — где нет data-testid
запрещено: порядковые номера, длинные цепочки XPath, привязка к тексту
```

Ровно эти 4 строки переданы модели на Шаге 2. Откуда запасной признак: README разрешает `getByRole` там, где нет
`data-testid` (это админка Medusa).

### Где стратегия фреймворка расходится с требованием из обучающего материала

| Требование материала | Фреймворк (README) | Как решаю |
| --- | --- | --- |
| Без привязки к тексту | Запасной признак `getByRole(..., { name })` — это и есть привязка к видимому тексту | На этой странице `data-testid` есть у всех нужных элементов, запасной признак не нужен. Текст интерфейса в локаторах не используется. Единственный фильтр по тексту — `addressCard()` по `address1`: это значение генерирует сам тест (тестовые данные, а не текст интерфейса). В ассертах — точный `toHaveText` |
| Без порядковых номеров | Совпадает: Architecture Rules README — «scope with a parent (`this.root.getByTestId(...)`) instead of XPath or indexes» | Карточки адресов различаются по содержимому через `filter({ has })`, без `nth()` |
| Локатор находит ровно один видимый элемент | README для модалок не даёт признака; естественный выбор `getByRole('dialog')` попадает во внешнюю обёртку Headless UI нулевого размера (hidden) | Корень модалки — `getByTestId('add-address-modal')`, поля ищутся от него (`this.root.getByTestId`) |

## Что передано Claude

Отдельный агент Claude без контекста этой сессии получил только этот набор:

- оба файла DOM;
- запись «стек + стратегия локаторов» (выше);
- `README.md`;
- существующий Page Object `pages/account/profile.page.ts` и компонент `pages/account/account-nav.component.ts`;
- тест `tests/auth/login.spec.ts`;
- фикстуру `fixtures/index.ts`.

Промпт Шага 2 (дословно, из транскрипта сессии 03.11 17:54):

```text
Ты пишешь Page Object для фреймворка Playwright + TypeScript. Работай ТОЛЬКО по файлам ниже (читай их Read-ом), не ищи другие файлы в репозитории, ничего не создавай и не редактируй. Репо: C:\Users\user1\Desktop\aiReal\AI-training

Файлы:
- DOM страницы /dk/account/addresses: deliverables/page-object/dom/addresses.html
- DOM модалки добавления адреса (открывается кнопкой add-address-button): deliverables/page-object/dom/add-address-modal.html
- README фреймворка: README.md
- пример Page Object: pages/account/profile.page.ts
- компонент навигации: pages/account/account-nav.component.ts
- пример теста: tests/auth/login.spec.ts
- фикстура: fixtures/index.ts

Запись «стек + стратегия локаторов»:
стек: Playwright Test + TypeScript (strict), Page Object Model
первичный признак: data-testid — getByTestId, со скоупом от корня страницы/компонента (this.root.getByTestId)
запасной признак: роль + доступное имя (getByRole) — где нет data-testid
запрещено: порядковые номера, длинные цепочки XPath, привязка к тексту

Пока НЕ пиши код. Дай:
1) список элементов, значимых для тестов, — для каждого имя поля в классе и локатор по стратегии;
2) список методов Page Object: действия и чтение состояния, с сигнатурами;
3) как класс подключается к тестам (фикстура, переход со страницы обзора).

Ответ верни целиком в markdown — он будет процитирован дословно.
```

Промпт Шага 3 (дословно, 03.11 17:56) — отправлен тому же агенту после ручных правок списка:

```text
Шаг 3: напиши код по исправленному списку ниже. Файлы НЕ создавай и не редактируй — верни содержимое каждого файла целиком в ответе (по блоку кода на файл, с путём). Дополнительно можешь прочитать pages/account/overview.page.ts и data/customer.ts.

Исправленный список (финальный):
- pages/account/addresses.page.ts — AddressesPage: page, nav: AccountNav, wrapper = getByTestId('addresses-page-wrapper') (страницы во фреймворке называют корень wrapper, компоненты — root), addAddressButton (от wrapper), addAddressModal: AddAddressModal, addressCards = wrapper.getByTestId('address-container'), addressCard(address1: string): AddressCard — карточка из addressCards с уникальным address1 из тестовых данных, без индексов; goto(), waitForLoaded(), openAddAddressModal(): Promise<AddAddressModal>.
- компонент AddressCard (где положить — реши по конвенциям): root + name ('address-name'), address ('address-address'), postalCity ('address-postal-city'), provinceCountry ('address-province-country') — testid внутри карточки. Edit/Remove не нужны.
- pages/account/add-address-modal.component.ts — AddAddressModal: root = page.getByTestId('add-address-modal'); firstNameInput, lastNameInput, address1Input, postalCodeInput, cityInput, countrySelect, saveButton. Методы: fill(data: AddressData), submit(data: AddressData) — fill + Save + ждать, пока модалка закроется. Необязательные поля, cancel/close, isFieldValid, fieldValues — не нужны.
- AccountOverviewPage.openAddresses(): Promise<AddressesPage> — по образцу openProfile().
- fixtures/index.ts — фикстура addressesPage (покажи только изменения).
- data/address.ts — AddressData { firstName, lastName, address1, postalCode, city, countryCode: string } и createAddress() с уникальным address1; countryCode 'dk'.
- tests/account/addresses.spec.ts — ровно один тест 'ACC-02: new address is added to the address book': войти через обзор (accountPage.goto() → openAddresses()), открыть модалку, submit(createAddress()), проверить, что карточка видна и содержит имя, адрес, индекс+город. Только методы/поля классов, expect только в спеке.
Стратегия локаторов та же: data-testid, скоуп от root/wrapper, без индексов, XPath и текста интерфейса. Без фиксированных пауз.
```

В первой версии отчёта на месте промпта Шага 2 был пересказ под пометкой «дословно», а промпта Шага 3 не было
совсем. Из промпта Шага 3 видно, что часть правок в [3-edits.md](3-edits.md) (5–7, 9) вызвана формулировками
самого промпта, а не моделью. Это отмечено в каждой из этих строк.
