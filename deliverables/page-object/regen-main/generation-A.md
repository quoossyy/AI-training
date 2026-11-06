<!-- markdownlint-disable -->
<!-- Дословная выдача свежего агента Claude, 06.11, вход из main. Промпт — в ../5-prompt-check.md. -->

## Page Object и тест ACC-02: добавление адреса

Ниже весь код для сценария «добавить адрес». Я не создавал и не правил ни одного файла и ничего не запускал. Тест не прогонялся.

Что использовано из DOM:
- **Обязательные поля формы.** У полей стоит `required`: `first-name-input`, `last-name-input`, `address-1-input`, `postal-code-input`, `city-input` и выпадающий список `country-select`.
- **Карточка после сохранения.** Корень карточки — `address-container`. Внутри четыре поля:
  - `address-name` = «Имя Фамилия»;
  - `address-address` = адрес;
  - `address-postal-city` = «индекс, город»;
  - `address-province-country` = код страны заглавными буквами, если область не заполнена (в DOM это `DK`).

---

### `data/address.ts` (новый файл)

```typescript
export interface Address {
  firstName: string;
  lastName: string;
  address1: string;
  postalCode: string;
  city: string;
  /** ISO-2 code of a country available in the store region. */
  countryCode: string;
}

/** Stand data persists between runs, so every address gets unique values. */
export function createAddress(): Address {
  const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  return {
    firstName: `Ann-${id}`,
    lastName: `Probe-${id}`,
    address1: `Probe street ${id}`,
    postalCode: String(1000 + Math.floor(Math.random() * 9000)),
    city: `City-${id}`,
    countryCode: 'dk',
  };
}
```

### `pages/account/add-address-modal.component.ts` (новый файл)

```typescript
import { Page, Locator } from '@playwright/test';
import { Address } from '../../data/address';

/** "Add address" modal opened from the addresses page. */
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

  async waitForOpened() {
    await this.root.waitFor();
  }

  /** Fills the required fields, saves and waits until the modal closes. */
  async addAddress(address: Address) {
    await this.firstNameInput.fill(address.firstName);
    await this.lastNameInput.fill(address.lastName);
    await this.address1Input.fill(address.address1);
    await this.postalCodeInput.fill(address.postalCode);
    await this.cityInput.fill(address.city);
    await this.countrySelect.selectOption(address.countryCode);
    await this.saveButton.click();
    await this.root.waitFor({ state: 'hidden' });
  }
}
```

### `pages/account/address-card.component.ts` (новый файл)

```typescript
import { Locator } from '@playwright/test';

/** One saved address in the addresses list. */
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

### `pages/account/addresses.page.ts` (новый файл)

```typescript
import { Page, Locator } from '@playwright/test';
import { AddAddressModal } from './add-address-modal.component';
import { AddressCard } from './address-card.component';

export class AddressesPage {
  readonly page: Page;
  readonly wrapper: Locator;
  readonly addAddressButton: Locator;
  readonly addressCards: Locator;

  constructor(page: Page) {
    this.page = page;
    this.wrapper = page.getByTestId('addresses-page-wrapper');
    this.addAddressButton = this.wrapper.getByTestId('add-address-button');
    this.addressCards = this.wrapper.getByTestId('address-container');
  }

  async waitForLoaded() {
    await this.wrapper.waitFor();
  }

  async openAddAddressModal(): Promise<AddAddressModal> {
    await this.addAddressButton.click();
    const modal = new AddAddressModal(this.page);
    await modal.waitForOpened();
    return modal;
  }

  /** Card found by the unique street line the test entered (test data, not UI copy). */
  addressCard(address1: string): AddressCard {
    return new AddressCard(this.addressCards.filter({ hasText: address1 }));
  }
}
```

### `tests/account/addresses.spec.ts` (новый файл)

```typescript
import { test, expect } from '../../fixtures';
import { createAddress } from '../../data/address';

test.describe('Account addresses', () => {
  test('ACC-02: new address with required fields appears in the address list', async ({ accountPage }) => {
    const address = createAddress();

    await accountPage.goto();
    const addressesPage = await accountPage.openAddresses();
    const modal = await addressesPage.openAddAddressModal();
    await modal.addAddress(address);

    const card = addressesPage.addressCard(address.address1);
    await expect(card.name).toHaveText(`${address.firstName} ${address.lastName}`);
    await expect(card.address).toHaveText(address.address1);
    await expect(card.postalCity).toHaveText(`${address.postalCode}, ${address.city}`);
    await expect(card.provinceCountry).toHaveText(address.countryCode.toUpperCase());
  });
});
```

### `pages/account/overview.page.ts` (изменения)

```diff
 import { AccountNav } from './account-nav.component';
 import { ProfilePage } from './profile.page';
+import { AddressesPage } from './addresses.page';
```

```diff
   async openProfile(): Promise<ProfilePage> {
     await this.nav.profileLink.click();
     return new ProfilePage(this.page);
   }
+
+  async openAddresses(): Promise<AddressesPage> {
+    await this.nav.addressesLink.click();
+    const addressesPage = new AddressesPage(this.page);
+    await addressesPage.waitForLoaded();
+    return addressesPage;
+  }
 }
```

### `README.md` (изменения)

Раздел Project Structure:

```diff
 ├── data/
-│   └── customer.ts                  # Test data factory (unique customer)
+│   ├── customer.ts                  # Test data factory (unique customer)
+│   └── address.ts                   # Test data factory (unique address)
```

```diff
 │   └── account/
 │       ├── account-nav.component.ts # Side nav shared by /dk/account/* pages
 │       ├── overview.page.ts
-│       └── profile.page.ts
+│       ├── profile.page.ts
+│       ├── addresses.page.ts
+│       ├── add-address-modal.component.ts
+│       └── address-card.component.ts
```

```diff
 │   └── account/
-│       └── profile-navigation.spec.ts
+│       ├── profile-navigation.spec.ts
+│       └── addresses.spec.ts
```

Раздел Test Cases:

```diff
 | ACC-01  | Profile page opens from the account navigation | `tests/account/profile-navigation.spec.ts` | ✅  |
+| ACC-02  | New address with required fields appears in the address list | `tests/account/addresses.spec.ts` | ✅ |
 | ADM-01  | Admin logs in with valid credentials           | `tests/admin/admin.spec.ts`             | ✅     |
```

`fixtures/index.ts` не меняется: тест начинается с уже существующей фикстуры `accountPage`.

---

### Решения по ограничениям

1. **Имена корней.** У страницы `AddressesPage` корень называется `wrapper` (`addresses-page-wrapper`), у компонентов `AddAddressModal` и `AddressCard` — `root`. Дочерние локаторы ищутся внутри корня через `getByTestId`. У всех нужных элементов есть `data-testid`, поэтому `getByRole` не понадобился.
2. **DOM.** Взяты все три состояния:
   - пустой список дал кнопку `add-address-button`;
   - модалка дала шесть обязательных полей (у них стоит `required`) и `save-button`;
   - страница после сохранения дала `address-container` и четыре поля карточки.

   Ожидаемый вид полей тоже взят из DOM: `"2100, Copenhagen"` — это «индекс, город», а `"DK"` — код страны заглавными при пустой области. Пометок «требует DOM» нет.
3. **Типы без данных стенда.** `countryCode` в интерфейсе — просто `string`, без перечня опций выпадающего списка. Значение `'dk'` и вообще все значения задаются только в фабрике `data/address.ts`.
4. **ID теста.** В разделе ACC в README есть только ACC-01, поэтому тест получил ACC-02.
5. **Ожидание в методе перехода.** `openAddresses()` дожидается `waitForLoaded()` и только потом возвращает страницу. Открытие модалки и сохранение тоже сами ждут, пока модалка откроется или закроется. В спеке нет ни `toBeVisible` для обёртки, ни `toHaveURL` — они служили бы только ожиданием.
6. **Точное совпадение.** Каждое поле карточки проверяется через `toHaveText` целиком, а не через `toContainText` по частям.
7. **Все заполненные поля.** Проверены все шесть: имя и фамилия (поле name), адрес (address), индекс и город (postalCity), страна (provinceCountry).
8. **Уникальные данные.** В имени, фамилии, адресе и городе есть уникальный `id`, индекс случайный. Значения не совпадают с `Test`/`Customer` из `data/customer.ts`.
9. **Только используемый код.** Нет `goto()` для адресов, кнопок edit/delete, полей company/phone/state, cancel/close и `nav` у `AddressesPage` — их не использует ни один тест. Новых фикстур нет.

Правила README соблюдены: локаторы есть только в `pages/`, `expect` — только в спеке, фиксированных пауз нет, данные создаются фабрикой в `data/`.

Одно допущение: карточка ищется через `filter({ hasText: address1 })` по уникальной строке адреса, которую ввёл сам тест. Это тестовые данные, а не текст интерфейса, и такой поиск не зависит от порядка карточек, если в списке уже есть адреса с прошлых запусков.
