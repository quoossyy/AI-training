# Шаг 2 — Plan

Промпт и набор входных файлов описаны в [1-research.md](1-research.md#что-передано-claude).
Сценарий теста задан заранее: **ACC-02: покупатель добавляет адрес, и он появляется в списке.**

## Ручные правки к выдаче модели

Пометки: **[вычеркнуто]** — тест этим не пользуется; **[добавлено вручную]** — модель этого не дала
или не могла дать (не было в DOM); **[изменено]** — дано, но не по конвенциям фреймворка.

### `AddressesPage` — `pages/account/addresses.page.ts`

| Поле / метод | Пометка | Почему |
| --- | --- | --- |
| `page`, `nav: AccountNav` | — | как в `ProfilePage` |
| `root` → **`wrapper`** = `getByTestId('addresses-page-wrapper')` | **[изменено]** | модель взяла имя `root` из записи стратегии; у страниц фреймворка (`ProfilePage`, `AccountOverviewPage`) поле называется `wrapper`, `root` — у компонентов (`AccountNav`) |
| `addAddressButton` = `wrapper.getByTestId('add-address-button')` | — | — |
| `addAddressModal: AddAddressModal` | — | модалка в портале вне `wrapper` → корень от `page`, модель это верно увидела |
| `addressCards` = `wrapper.getByTestId('address-container')` | **[добавлено вручную]** | у модели «требует DOM»; testid сняты скриптом после сохранения адреса ([dom/manual-after-save.html](dom/manual-after-save.html)) |
| `addressCard(address1: string): AddressCard` | **[добавлено вручную]** | карточка выбирается по уникальному значению тестовых данных (`filter({ hasText })` по `address1` из фабрики), без индексов. Это не привязка к тексту интерфейса: значение генерирует тест |
| компонент `AddressCard`: `root`, `name` (`address-name`), `address` (`address-address`), `postalCity` (`address-postal-city`), `provinceCountry` (`address-province-country`) | **[добавлено вручную]** | у модели «требует DOM» |
| `AddressCard.editButton`, `deleteButton` | **[вычеркнуто]** | в ACC-02 не используются |
| `goto()`, `waitForLoaded()` | — | как в `ProfilePage` |
| `openAddAddressModal(): Promise<AddAddressModal>` | — | — |
| `addAddress(data)` | **[вычеркнуто]** | дублирует `openAddAddressModal()` + `submit()`; тест будет читать шаги явно |
| `addressCount()` | **[вычеркнуто]** | модель сама предложила вместо него `toHaveCount` на `addressCards` |

### `AddAddressModal` — `pages/account/add-address-modal.component.ts`

| Поле / метод | Пометка | Почему |
| --- | --- | --- |
| `root` = `page.getByTestId('add-address-modal')` | — | не `getByRole('dialog')`: внешняя обёртка Headless UI нулевого размера (hidden) |
| `firstNameInput`, `lastNameInput`, `address1Input`, `postalCodeInput`, `cityInput`, `countrySelect`, `saveButton` | — | обязательные поля + сохранение |
| `companyInput`, `address2Input`, `provinceInput`, `phoneInput` | **[вычеркнуто]** | необязательные поля, тест их не заполняет |
| `closeButton`, `cancelButton` | **[вычеркнуто]** | тест модалку не закрывает |
| `waitForOpened()` | **[вычеркнуто]** | ожидание уже внутри `openAddAddressModal()` |
| `fill(data: Partial<AddressData>)` → **`fill(data: AddressData)`** | **[изменено]** | после вычёркивания необязательных полей частичное заполнение не нужно |
| `selectCountry()`, `save()` | **[вычеркнуто]** | покрыты `fill()` / `submit()` |
| `submit(data)`: `fill` + клик Save + ожидание `root` hidden | — | ждёт закрытия модалки, а не паузу |
| `cancel()`, `close()`, `isFieldValid()`, `fieldValues()` | **[вычеркнуто]** | для негативных кейсов, в ACC-02 не нужны |

> **Позже пересмотрено (правка №10 в [3-edits.md](3-edits.md)).** После вычёркивания в классе не осталось методов чтения
> состояния, которых требует Шаг 3. Возвращены `save()` (только клик) и `isFieldValid()` в виде `invalidFields()`,
> добавлен тест ACC-03.

### Подключение и данные

| Что | Пометка | Почему |
| --- | --- | --- |
| фикстура `addressesPage` в `fixtures/index.ts` | — | по образцу `accountPage` |
| `AccountOverviewPage.openAddresses(): Promise<AddressesPage>` | — | модель не видела `overview.page.ts`; в нём уже есть `openProfile()` с тем же устройством, а вариант «метод в `AccountNav`» отпадает |
| `data/address.ts`: `AddressData`, `createAddress()` | — | правило README «Unique test data» |
| `CountryCode` — union из 7 стран | **[изменено]** | union дублирует данные стенда; для фабрики достаточно `countryCode: string` со значением `'dk'` (локаль `/dk`) |
| имя теста `ADDR-01` → **`ACC-02`** | **[изменено]** | в таблице README тесты аккаунта нумеруются `ACC-*` |

### Ответы на открытые вопросы модели

1. DOM карточки снят скриптом после сохранения адреса, см. выше.
2. Cancel — вне сценария, вычеркнут.
3. `wrapper` для страницы, `root` для компонентов (конвенция фреймворка).
4. В `AccountOverviewPage`, рядом с `openProfile()`.
5. Нет связи `label` ↔ `input` (у `input` нет `id`) и нет `aria-label` у кнопки закрытия — записано как наблюдение по доступности в [4-verify.md](4-verify.md).

---

## Выдача модели (дословно)

<details>
<summary>Ответ Claude на промпт Шага 2</summary>

````markdown
# Page Object для `/dk/account/addresses`: план (без кода)

Источники: `deliverables/page-object/dom/addresses.html`, `deliverables/page-object/dom/add-address-modal.html`, `README.md`, `pages/account/profile.page.ts`, `pages/account/account-nav.component.ts`, `tests/auth/login.spec.ts`, `fixtures/index.ts`.

## Что видно в DOM и как это влияет на план

1. **Модалка рендерится порталом.** Это headlessui-диалог `role="dialog"` с `aria-modal="true"`. В DOM он лежит вне `addresses-page-wrapper`. Поэтому корень модалки берётся от `page`, а не от `this.root` страницы. Модалку стоит вынести в отдельный компонент `AddAddressModal`, как сделан `AccountNav`.
2. **Список сохранённых адресов в выгрузке пустой.** На странице есть только кнопка `add-address-button`. Разметки карточки адреса в DOM нет, поэтому её локаторы ниже помечены как **«требует DOM»**. Без них нельзя проверить, что адрес появился после Save.
3. **У полей формы нет доступного имени.** `<label for="first_name">` ссылается на `id`, которого у `input` нет (есть только `name`), а `placeholder=" "` пустой. Значит, `getByLabel` и `getByRole('textbox', { name })` не сработают, и `data-testid` здесь единственный рабочий признак. Это дефект доступности, его стоит отметить.
4. **У кнопки закрытия нет доступного имени.** Внутри `close-modal-button` только SVG, `aria-label` нет. Остаётся только `getByTestId`.
5. **Заголовки страницы («Shipping Addresses») и модалки («Add address») без `data-testid`.** Для `getByRole('heading', { name })` нужна привязка к тексту, а это запрещено. Поэтому заголовки в класс не включаем: что страница и модалка открыты, проверяем по их корням с testid.
6. **Валидация нативная (`required`).** Элементов с текстом ошибок в DOM нет. Невалидность проверяем через состояние input (`validity.valid`), а не по тексту сообщения.
7. **Обязательные поля:** `first_name`, `last_name`, `address_1`, `postal_code`, `city`, `country_code`. Необязательные: `company`, `address_2`, `province`, `phone`.

---

## 1) Элементы и локаторы

### `AddressesPage` (`pages/account/addresses.page.ts`)

| Поле | Тип | Локатор | Признак |
|---|---|---|---|
| `page` | `Page` | — | — |
| `nav` | `AccountNav` | `new AccountNav(page)` | переиспользование компонента |
| `root` | `Locator` | `page.getByTestId('addresses-page-wrapper')` | data-testid |
| `addAddressButton` | `Locator` | `this.root.getByTestId('add-address-button')` | data-testid, скоуп от root |
| `addAddressModal` | `AddAddressModal` | `new AddAddressModal(page)` | компонент (портал, от `page`) |
| `addressCards` | `Locator` | **требует DOM** (ожидаемо `this.root.getByTestId('address-container')` или аналог) | data-testid |
| `addressCard(…)` | `Locator` (метод-фабрика) | **требует DOM**: карточка из `addressCards`, отфильтрованная по `has:` вложенному testid-элементу, без индексов | data-testid |
| внутри карточки: имя, адрес, кнопки Edit/Remove | `Locator` | **требует DOM** | data-testid |

Поле для обёртки называю `root`, как в стратегии (`this.root.getByTestId`). В `ProfilePage` оно называется `wrapper`, а в `AccountNav` — `root`. Это расхождение конвенций, ниже есть вопрос о нём.

### `AddAddressModal` (`pages/account/add-address-modal.component.ts`)

| Поле | Тип | Локатор | Признак |
|---|---|---|---|
| `root` | `Locator` | `page.getByTestId('add-address-modal')` | data-testid |
| `closeButton` | `Locator` | `this.root.getByTestId('close-modal-button')` | data-testid |
| `firstNameInput` | `Locator` | `this.root.getByTestId('first-name-input')` | data-testid |
| `lastNameInput` | `Locator` | `this.root.getByTestId('last-name-input')` | data-testid |
| `companyInput` | `Locator` | `this.root.getByTestId('company-input')` | data-testid |
| `address1Input` | `Locator` | `this.root.getByTestId('address-1-input')` | data-testid |
| `address2Input` | `Locator` | `this.root.getByTestId('address-2-input')` | data-testid |
| `postalCodeInput` | `Locator` | `this.root.getByTestId('postal-code-input')` | data-testid |
| `cityInput` | `Locator` | `this.root.getByTestId('city-input')` | data-testid |
| `provinceInput` | `Locator` | `this.root.getByTestId('state-input')` | data-testid (testid `state`, поле `province`) |
| `countrySelect` | `Locator` | `this.root.getByTestId('country-select')` | data-testid |
| `phoneInput` | `Locator` | `this.root.getByTestId('phone-input')` | data-testid |
| `cancelButton` | `Locator` | `this.root.getByTestId('cancel-button')` | data-testid |
| `saveButton` | `Locator` | `this.root.getByTestId('save-button')` | data-testid |

Запасной признак `getByRole` не понадобился: у всех значимых элементов есть `data-testid`. `page.getByRole('dialog')` можно держать как альтернативу корню, но имя диалога («Add address») пришлось бы брать из текста, поэтому оставляем testid.

---

## 2) Методы

### Тип данных (`data/address.ts`, фабрика по правилу README «Unique test data»)

```
interface AddressData {
  firstName: string; lastName: string; address1: string;
  postalCode: string; city: string; countryCode: CountryCode;
  company?: string; address2?: string; province?: string; phone?: string;
}
type CountryCode = 'dk' | 'fr' | 'de' | 'it' | 'es' | 'se' | 'gb';
createAddress(overrides?: Partial<AddressData>): AddressData   // уникальные значения
```

Тип `CountryCode` повторяет значения `option` из `country-select`. Страну выбираем по `value`, а не по тексту опции.

### `AddressesPage`

| Сигнатура | Назначение |
|---|---|
| `constructor(page: Page)` | инициализация локаторов и компонентов |
| `goto(): Promise<void>` | `page.goto('/dk/account/addresses')` |
| `waitForLoaded(): Promise<void>` | `this.root.waitFor()`, как в `ProfilePage` |
| `openAddAddressModal(): Promise<AddAddressModal>` | клик по `addAddressButton`, ждёт `addAddressModal.root`, возвращает компонент |
| `addAddress(data: AddressData): Promise<void>` | сценарий: открыть модалку → `fill` → `save` → дождаться скрытия модалки |
| `addressCard(…): Locator` | **требует DOM**: локатор карточки для проверок в тесте |
| `addressCount(): Promise<number>` | **требует DOM**: `addressCards.count()`. Лучше отдавать сам `addressCards`, а в тесте проверять `toHaveCount` |

### `AddAddressModal`

| Сигнатура | Назначение |
|---|---|
| `constructor(page: Page)` | инициализация |
| `waitForOpened(): Promise<void>` | `root.waitFor()` |
| `fill(data: Partial<AddressData>): Promise<void>` | заполняет только переданные поля; страну — через `countrySelect.selectOption(code)` |
| `selectCountry(code: CountryCode): Promise<void>` | `selectOption` по value |
| `save(): Promise<void>` | клик по `saveButton` |
| `submit(data: AddressData): Promise<void>` | `fill` + `save` + ожидание `root` в состоянии `hidden` |
| `cancel(): Promise<void>` | клик по `cancelButton` (это `type="reset"`; закрывает ли он модалку, по DOM не видно — см. вопросы) |
| `close(): Promise<void>` | клик по `closeButton` |
| `isFieldValid(field: AddressField): Promise<boolean>` | читает `el.validity.valid` у поля; нужен для негативных кейсов с пустыми обязательными полями |
| `fieldValues(): Promise<Partial<AddressData>>` | читает `inputValue()` всех полей, например для проверки сброса после Cancel |

`AddressField` — ключ `AddressData`, который маппится на поле-локатор. Ассерты (`expect`) в классы не кладём, по правилу README «Actions in POM, assertions in tests». Методы чтения только возвращают значения или локаторы.

---

## 3) Подключение к тестам

**Фикстура.** В `fixtures/index.ts` добавить в `AuthFixtures` поле `addressesPage: AddressesPage` по образцу `accountPage`:

```
addressesPage: async ({ page }, use) => { await use(new AddressesPage(page)); },
```

Модалка отдельной фикстурой не подключается: тест получает её через `addressesPage.addAddressModal` или как результат `openAddAddressModal()`. Хранилище состояния — сессия покупателя по умолчанию из проекта `chromium`. `test.use({ storageState })` переопределять не нужно, так что логина в тесте нет.

**Переход со страницы обзора.** В `AccountNav` уже есть `addressesLink` (`account-nav` → `addresses-link`). Переход по аналогии с `loginPage.login()`, который возвращает `AccountOverviewPage`:

- метод `AccountOverviewPage.openAddresses(): Promise<AddressesPage>` кликает `this.nav.addressesLink`, ждёт `waitForLoaded()` и возвращает новый `AddressesPage`;
- если навигационные переходы должны жить в компоненте, то метод `AccountNav.openAddresses(): Promise<AddressesPage>`. Для этого в `AccountNav` нужно хранить `page`.

Сам `overview.page.ts` в разрешённых файлах нет, я его не читал. Как там устроены методы перехода, нужно сверить отдельно.

**Пример использования (схема):**

```
test('ADDR-01: new address is listed after save', async ({ accountPage, addressesPage }) => {
  // вход через обзор: accountPage.goto() → accountPage.openAddresses()
  // или напрямую: addressesPage.goto()
  // addressesPage.addAddress(createAddress())
  // expect(addressesPage.addressCard(...)).toBeVisible()   ← нужен DOM карточки
});
```

Нумерация `ADDR-NN` и формат имени `ID: what is expected` взяты из правила Naming в README.

---

## Открытые вопросы

1. Нужна выгрузка DOM страницы хотя бы с одним сохранённым адресом: testid карточки, полей в ней, кнопок Edit/Remove. Также нужен DOM модалки редактирования, если она отличается.
2. Как ведёт себя Cancel (`type="reset"`): только сбрасывает форму или ещё и закрывает модалку?
3. Как называть корень страницы: `root` по стратегии или `wrapper`, как в `ProfilePage`?
4. Куда положить метод перехода: в `AccountOverviewPage` или в `AccountNav`?
5. Отсутствие связи `label` ↔ `input` и `aria-label` у кнопки закрытия заводить как дефект доступности?
````

</details>
