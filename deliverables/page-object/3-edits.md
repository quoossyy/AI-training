# Список правок к выдаче модели

Выдача Шага 2 (список элементов) процитирована в [2-plan.md](2-plan.md#выдача-модели-дословно), выдача Шага 3 (код) — целиком в конце файла.
Проверка, предотвращают ли ограничения эти ошибки, — в [5-prompt-check.md](5-prompt-check.md).
Первый прогон кода модели был **зелёным** (typecheck, lint, ACC-02 passed). Правки ниже — не исправления падений:
модель ошибалась в конвенциях фреймворка, в силе ассертов и в том, чего не видела в DOM.

| # | Было (выдача модели) | Стало | Почему | Ограничение в промпте, которое это предотвратило бы |
| --- | --- | --- | --- | --- |
| 1 | Корень страницы назван `root` (взято из записи стратегии `this.root.getByTestId`) | `wrapper` | Во фреймворке у страниц (`ProfilePage`, `AccountOverviewPage`) поле `wrapper`, `root` — только у компонентов (`AccountNav`) | «Имена полей бери из существующих Page Object, а не из записи стратегии: страница — `wrapper`, компонент — `root`» |
| 2 | Локаторы карточки адреса — «требует DOM», без testid | `address-container`, `address-name`, `address-address`, `address-postal-city`, `address-province-country` | Карточки нет в DOM пустого списка; testid сняты руками после сохранения адреса ([dom/manual-after-save.html](dom/manual-after-save.html)) | «Передаю DOM во всех состояниях сценария: до действия и после (список с одним адресом)» — то есть снимать DOM после сценария, а не только до него |
| 3 | `type CountryCode = 'dk' \| 'fr' \| … \| 'gb'` — копия `<option>` из DOM | `countryCode: string` | Список стран — данные стенда (регионы Medusa), а не контракт; union сломает типизацию при смене региона и ничего не проверяет | «Не переносить данные стенда (опции селектов, тексты) в типы TypeScript» |
| 4 | Имя теста `ADDR-01` | `ACC-02` | В таблице README тесты аккаунта нумеруются `ACC-*`, следующий свободный — `ACC-02` | «ID теста — следующий свободный номер раздела из таблицы Test Cases в README» |
| 5 | `openAddresses()` только кликает ссылку; в спеке `await expect(addressesPage.wrapper).toBeVisible()` служит ожиданием перехода | `openAddresses()` вызывает `addressesPage.waitForLoaded()` и возвращает загруженную страницу; ассерт-ожидание из спеки убран | Ожидание загрузки — часть действия перехода; ассерт в спеке маскировался под проверку. Сама модель на Шаге 2 предлагала «ждёт `waitForLoaded()`», но на Шаге 3 скопировала `openProfile()`, который не ждёт | «Метод перехода ждёт загрузки целевой страницы (`waitForLoaded`) до возврата; в спеке нет ассертов, которые служат только ожиданием» |
| 6 | `toContainText(firstName)` + `toContainText(lastName)`, `toContainText(postalCode)` + `toContainText(city)` | `toHaveText('First Last')`, `toHaveText('2100, Copenhagen')` | `toContainText` по частям пропускает перепутанный порядок, лишние символы и неверный формат. Мутация «город + X» проверила: точный ассерт падает | «Для значений, которые тест сам ввёл, — точное совпадение `toHaveText` целого поля, а не `toContainText` по частям» |
| 7 | Поле `provinceCountry` объявлено в `AddressCard`, но в тесте не проверяется | `toHaveText(countryCode.toUpperCase())` → `DK` | Страну тест выбирает сам; без ассерта неверная страна прошла бы незамеченной | «Проверить каждое поле, которое тест заполнил» |
| 8 | Фабрика: `firstName: 'Test', lastName: 'Customer'` — совпадает с данными покупателя из `createCustomer()` | `firstName: 'Address', lastName: 'Owner <id>'` | Если бы стенд подставлял имя из профиля вместо имени из формы, ассерт имени всё равно прошёл бы | «Тестовые данные формы уникальны и не совпадают с данными покупателя из `data/customer.ts`» |
| 9 | Фикстура `addressesPage` в `fixtures/index.ts` (в тесте не используется, «для будущих тестов») | Убрана | `ProfilePage` тоже без фикстуры: страницы, на которые попадают через навигацию, возвращаются методом перехода. Мёртвая фикстура нарушает конвенцию. Ошибка была и в моём промпте Шага 3 — я её сам попросил | «Не добавлять код, который не использует ни один тест; фикстуры — только для точек входа, как `loginPage`/`accountPage`» |

| 10 | Шаг 2: модель предложила `isFieldValid(field)` и `save()`; я вычеркнула их как ненужные позитивному сценарию → в классе не осталось ни одного метода чтения состояния, а Шаг 3 задания их требует | `AddAddressModal.save()` (только клик) + `invalidFields(): Promise<string[]>` (testid полей, не прошедших нативную валидацию) + тест **ACC-03** «пустая форма не сохраняется»; `submit()` = `fill()` + `save()` + ожидание закрытия | Ошибок с `data-testid` на форме нет — валидация нативная (`required`), поэтому состояние читается из `validity` полей, а не из текста. Один метод вместо `isFieldValid` по полю: тест сравнивает весь список и ловит лишние/недостающие поля. Видимость блоков читается локаторами (`modal.root`, `card.root`) через web-first `toBeVisible()`, как `loginPage.errorMessage` во фреймворке | «Для формы обязательно: метод чтения ошибок валидации и тест, который им пользуется; действие (`save`) и ожидание его успешного исхода (`submit`) — разные методы» |

Без изменений приняты: `AddAddressModal`, `AddressCard`, `AddressesPage` (включая выбор карточки
`filter({ has: getByTestId('address-address').filter({ hasText: address1 }) })` по уникальному значению тестовых данных).
Фиксированных пауз модель не ставила: модалка ждётся через `waitFor()` / `waitFor({ state: 'hidden' })`.

## Код модели → итог (diff)

Файлы без изменений: `pages/account/addresses.page.ts`, `pages/account/address-card.component.ts`.
Правка №10 (`save()`, `invalidFields()` и тест ACC-03) — отдельным блоком после diff.

```diff
--- data/address.ts (model)
+++ data/address.ts (final)
@@ export function createAddress(): AddressData {
   return {
-    firstName: 'Test',
-    lastName: 'Customer',
+    firstName: 'Address',
+    lastName: `Owner ${id}`,
     address1: `QA Street ${id}`,

--- pages/account/overview.page.ts (model)
+++ pages/account/overview.page.ts (final)
   async openAddresses(): Promise<AddressesPage> {
     await this.nav.addressesLink.click();
-    return new AddressesPage(this.page);
+    const addressesPage = new AddressesPage(this.page);
+    await addressesPage.waitForLoaded();
+    return addressesPage;
   }

--- fixtures/index.ts (model)
+++ fixtures/index.ts (final)
-import { AddressesPage } from '../pages/account/addresses.page';
-  addressesPage: AddressesPage;
-  addressesPage: async ({ page }, use) => {
-    await use(new AddressesPage(page));
-  },

--- tests/account/addresses.spec.ts (model)
+++ tests/account/addresses.spec.ts (final)
     const addressesPage = await accountPage.openAddresses();
-    await expect(addressesPage.wrapper).toBeVisible();
-
     const modal = await addressesPage.openAddAddressModal();
     await modal.submit(address);

     const card = addressesPage.addressCard(address.address1);
     await expect(card.root).toBeVisible();
-    await expect(card.name).toContainText(address.firstName);
-    await expect(card.name).toContainText(address.lastName);
-    await expect(card.address).toContainText(address.address1);
-    await expect(card.postalCity).toContainText(address.postalCode);
-    await expect(card.postalCity).toContainText(address.city);
+    await expect(card.name).toHaveText(`${address.firstName} ${address.lastName}`);
+    await expect(card.address).toHaveText(address.address1);
+    await expect(card.postalCity).toHaveText(`${address.postalCode}, ${address.city}`);
+    await expect(card.provinceCountry).toHaveText(address.countryCode.toUpperCase());
```

Правка №10:

```diff
--- pages/account/add-address-modal.component.ts (model)
+++ pages/account/add-address-modal.component.ts (final)
+  async save() {
+    await this.saveButton.click();
+  }
+
   async submit(data: AddressData) {
     await this.fill(data);
-    await this.saveButton.click();
+    await this.save();
     await this.root.waitFor({ state: 'hidden' });
   }
+
+  /**
+   * data-testid of the fields that fail native HTML5 validation (`required`).
+   * The form shows no error elements of its own, so the state is read from the inputs.
+   */
+  async invalidFields(): Promise<string[]> {
+    return this.root.evaluate((form) =>
+      Array.from(form.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-testid]'))
+        .filter((field) => field.willValidate && !field.validity.valid)
+        .map((field) => field.dataset.testid ?? ''),
+    );
+  }

--- tests/account/addresses.spec.ts (final, новый тест)
+  test('ACC-03: address with empty required fields is not saved', async ({ accountPage }) => {
+    await accountPage.goto();
+    const addressesPage = await accountPage.openAddresses();
+    const modal = await addressesPage.openAddAddressModal();
+    await modal.save();
+
+    await expect(modal.root).toBeVisible();
+    await expect
+      .poll(() => modal.invalidFields())
+      .toEqual(['first-name-input', 'last-name-input', 'address-1-input', 'postal-code-input', 'city-input']);
+  });
```

## Выдача модели Шага 3 (дословно)

<details>
<summary>Ответ Claude на промпт Шага 3 (исправленный список из 2-plan.md)</summary>

````markdown
# Шаг 3: код Page Object для адресов

Код написан по финальному списку. Файлы в репозитории не создавались и не редактировались: ниже содержимое каждого файла целиком. Для `fixtures/index.ts` показаны только изменения. Код не запускался: typecheck, lint и прогон на стенде не выполнялись.

Дополнительно прочитаны `pages/account/overview.page.ts` и `data/customer.ts`. Генератор уникального id взят из `createCustomer()`.

Компонент карточки лежит в `pages/account/address-card.component.ts`. Компоненты в фреймворке называются `*.component.ts`, а корень у них — `root`.

### `data/address.ts`

```typescript
export interface AddressData {
  firstName: string;
  lastName: string;
  address1: string;
  postalCode: string;
  city: string;
  countryCode: string;
}

/** Stand data persists between runs, so every address gets a unique street line. */
export function createAddress(): AddressData {
  const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  return {
    firstName: 'Test',
    lastName: 'Customer',
    address1: `QA Street ${id}`,
    postalCode: '2100',
    city: 'Copenhagen',
    countryCode: 'dk',
  };
}
```

### `pages/account/address-card.component.ts`

```typescript
import { Locator } from '@playwright/test';

/** One saved address in the address book on /dk/account/addresses. */
export class AddressCard {
  readonly root: Locator;
  readonly name: Locator;
  readonly address: Locator;
  readonly postalCity: Locator;
  readonly provinceCountry: Locator;

  constructor(root: Locator) {
    this.root = root;
    this.name = this.root.getByTestId('address-name');
    this.address = this.root.getByTestId('address-address');
    this.postalCity = this.root.getByTestId('address-postal-city');
    this.provinceCountry = this.root.getByTestId('address-province-country');
  }
}
```

### `pages/account/add-address-modal.component.ts`

```typescript
import { Page, Locator } from '@playwright/test';
import { AddressData } from '../../data/address';

/** "Add address" dialog. Rendered in a portal, so it is scoped from the page, not from the addresses wrapper. */
export class AddAddressModal {
  readonly root: Locator;
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly address1Input: Locator;
  readonly postalCodeInput: Locator;
  readonly cityInput: Locator;
  readonly countrySelect: Locator;
  readonly saveButton: Locator;

  constructor(page: Page) {
    this.root = page.getByTestId('add-address-modal');
    this.firstNameInput = this.root.getByTestId('first-name-input');
    this.lastNameInput = this.root.getByTestId('last-name-input');
    this.address1Input = this.root.getByTestId('address-1-input');
    this.postalCodeInput = this.root.getByTestId('postal-code-input');
    this.cityInput = this.root.getByTestId('city-input');
    this.countrySelect = this.root.getByTestId('country-select');
    this.saveButton = this.root.getByTestId('save-button');
  }

  async fill(data: AddressData) {
    await this.firstNameInput.fill(data.firstName);
    await this.lastNameInput.fill(data.lastName);
    await this.address1Input.fill(data.address1);
    await this.postalCodeInput.fill(data.postalCode);
    await this.cityInput.fill(data.city);
    await this.countrySelect.selectOption(data.countryCode);
  }

  async submit(data: AddressData) {
    await this.fill(data);
    await this.saveButton.click();
    await this.root.waitFor({ state: 'hidden' });
  }
}
```

### `pages/account/addresses.page.ts`

```typescript
import { Page, Locator } from '@playwright/test';
import { AccountNav } from './account-nav.component';
import { AddAddressModal } from './add-address-modal.component';
import { AddressCard } from './address-card.component';

export class AddressesPage {
  readonly page: Page;
  readonly nav: AccountNav;
  readonly wrapper: Locator;
  readonly addAddressButton: Locator;
  readonly addAddressModal: AddAddressModal;
  readonly addressCards: Locator;

  constructor(page: Page) {
    this.page = page;
    this.nav = new AccountNav(page);
    this.wrapper = page.getByTestId('addresses-page-wrapper');
    this.addAddressButton = this.wrapper.getByTestId('add-address-button');
    this.addAddressModal = new AddAddressModal(page);
    this.addressCards = this.wrapper.getByTestId('address-container');
  }

  async goto() {
    await this.page.goto('/dk/account/addresses');
  }

  async waitForLoaded() {
    await this.wrapper.waitFor();
  }

  async openAddAddressModal(): Promise<AddAddressModal> {
    await this.addAddressButton.click();
    await this.addAddressModal.root.waitFor();
    return this.addAddressModal;
  }

  /** Card whose street line contains the unique address1 from test data (no indexes). */
  addressCard(address1: string): AddressCard {
    return new AddressCard(
      this.addressCards.filter({
        has: this.page.getByTestId('address-address').filter({ hasText: address1 }),
      }),
    );
  }
}
```

### `pages/account/overview.page.ts`

Изменён только импорт и добавлен метод `openAddresses()` по образцу `openProfile()`.

```typescript
import { Page, Locator } from '@playwright/test';
import { AccountNav } from './account-nav.component';
import { ProfilePage } from './profile.page';
import { AddressesPage } from './addresses.page';

export class AccountOverviewPage {
  readonly page: Page;
  readonly nav: AccountNav;
  readonly wrapper: Locator;
  readonly welcomeMessage: Locator;
  readonly customerEmail: Locator;

  constructor(page: Page) {
    this.page = page;
    this.nav = new AccountNav(page);
    this.wrapper = page.getByTestId('overview-page-wrapper');
    this.welcomeMessage = page.getByTestId('welcome-message');
    this.customerEmail = page.getByTestId('customer-email');
  }

  async goto() {
    await this.page.goto('/dk/account');
  }

  async waitForLoaded() {
    await this.wrapper.waitFor();
  }

  async openProfile(): Promise<ProfilePage> {
    await this.nav.profileLink.click();
    return new ProfilePage(this.page);
  }

  async openAddresses(): Promise<AddressesPage> {
    await this.nav.addressesLink.click();
    return new AddressesPage(this.page);
  }
}
```

### `fixtures/index.ts` (только изменения)

```typescript
// imports
import { AddressesPage } from '../pages/account/addresses.page';

// type AuthFixtures
  addressesPage: AddressesPage;

// base.extend<AuthFixtures>({ ... })
  addressesPage: async ({ page }, use) => {
    await use(new AddressesPage(page));
  },
```

### `tests/account/addresses.spec.ts`

```typescript
import { test, expect } from '../../fixtures';
import { createAddress } from '../../data/address';

test.describe('Addresses', () => {
  test('ACC-02: new address is added to the address book', async ({ accountPage }) => {
    const address = createAddress();

    await accountPage.goto();
    const addressesPage = await accountPage.openAddresses();
    await expect(addressesPage.wrapper).toBeVisible();

    const modal = await addressesPage.openAddAddressModal();
    await modal.submit(address);

    const card = addressesPage.addressCard(address.address1);
    await expect(card.root).toBeVisible();
    await expect(card.name).toContainText(address.firstName);
    await expect(card.name).toContainText(address.lastName);
    await expect(card.address).toContainText(address.address1);
    await expect(card.postalCity).toContainText(address.postalCode);
    await expect(card.postalCity).toContainText(address.city);
  });
});
```

### Что стоит знать

- **Testid карточки не сверены.** `address-container`, `address-name`, `address-address`, `address-postal-city` и `address-province-country` взяты из твоего списка. В выгрузке DOM карточек нет, поэтому эти testid нужно проверить на стенде.
- **Фильтр по тексту в `addressCard()`.** Карточка выбирается фильтром `hasText` по значению `address1`. Это уникальные тестовые данные, а не текст интерфейса, и фильтр стоит на элементе с testid. Индексы и XPath не используются.
- **Переход ждёт загрузки страницы в спеке.** `openAddresses()` повторяет `openProfile()` и загрузки не ждёт. Поэтому в спеке после перехода стоит `expect(wrapper).toBeVisible()`. Фиксированных пауз нет.
- **Фикстура `addressesPage` в ACC-02 не используется.** Тест входит через обзор, как требует сценарий, и получает объект из `openAddresses()`. Фикстура добавлена для будущих тестов с прямым `goto()`.
- **В README нужна строка ACC-02.** Добавь её в таблицу «Test Cases», файл `tests/account/addresses.spec.ts`.
````

</details>
