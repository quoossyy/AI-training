<!-- markdownlint-disable -->
<!-- Дословная выдача свежего агента Claude, 06.11, вход из main. Промпт — в ../5-prompt-check.md. -->

## Page Object и тест ACC-02: добавление адреса

Код я не запускал, как ты и просил. Ни одного файла не создавал и не правил. Новые файлы ниже приведены целиком, для изменённых существующих показаны только изменения.

Что видно в DOM. Модалка `add-address-modal` открывается в портале диалога вне `addresses-page-wrapper`, поэтому её корень ищется от `page`. После сохранения в списке появляется карточка `address-container` с полями:
- `address-name` — это `first_name last_name`;
- `address-address` — это `address_1`;
- `address-postal-city` — это `postal_code, city`;
- `address-province-country` — это код страны в верхнем регистре, провинция пустая.

Обязательные поля формы (`required`): first name, last name, address, postal code, city и country (select).

---

### `data/address.ts` (новый)

```typescript
export interface Address {
  firstName: string;
  lastName: string;
  address1: string;
  postalCode: string;
  city: string;
  /** Value of the country select option (ISO 3166-1 alpha-2, lower case). */
  countryCode: string;
}

/**
 * Stand data persists between runs, so every address gets a unique street line.
 * Names differ from the customer created in setup (data/customer.ts).
 */
export function createAddress(): Address {
  const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  return {
    firstName: 'Nora',
    lastName: `Holm-${id}`,
    address1: `Testvej ${id}`,
    postalCode: '2100',
    city: 'Copenhagen',
    countryCode: 'dk',
  };
}
```

### `pages/account/add-address-modal.component.ts` (новый)

```typescript
import { Page, Locator } from '@playwright/test';
import { Address } from '../../data/address';

/** "Add address" dialog opened from the addresses page. */
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
    // The dialog is rendered in a portal outside the page wrapper, so it is scoped from the page.
    this.root = page.getByTestId('add-address-modal');
    this.firstNameInput = this.root.getByTestId('first-name-input');
    this.lastNameInput = this.root.getByTestId('last-name-input');
    this.address1Input = this.root.getByTestId('address-1-input');
    this.postalCodeInput = this.root.getByTestId('postal-code-input');
    this.cityInput = this.root.getByTestId('city-input');
    this.countrySelect = this.root.getByTestId('country-select');
    this.saveButton = this.root.getByTestId('save-button');
  }

  /** Fills the required fields only. */
  async fill(address: Address) {
    await this.firstNameInput.fill(address.firstName);
    await this.lastNameInput.fill(address.lastName);
    await this.address1Input.fill(address.address1);
    await this.postalCodeInput.fill(address.postalCode);
    await this.cityInput.fill(address.city);
    await this.countrySelect.selectOption(address.countryCode);
  }

  async save() {
    await this.saveButton.click();
    await this.root.waitFor({ state: 'hidden' });
  }
}
```

### `pages/account/address-card.component.ts` (новый)

```typescript
import { Locator } from '@playwright/test';

/** One saved address in the list on the addresses page. */
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

### `pages/account/addresses.page.ts` (новый)

```typescript
import { Page, Locator } from '@playwright/test';
import { Address } from '../../data/address';
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

  async waitForLoaded() {
    await this.wrapper.waitFor();
  }

  async addAddress(address: Address) {
    await this.addAddressButton.click();
    await this.addAddressModal.fill(address);
    await this.addAddressModal.save();
  }

  /** Card of the given address, found by its unique street line (test data, not UI copy). */
  addressCard(address: Address): AddressCard {
    return new AddressCard(
      this.addressCards.filter({
        has: this.page.getByTestId('address-address').filter({ hasText: address.address1 }),
      }),
    );
  }
}
```

### `pages/account/overview.page.ts` (изменения)

```diff
 import { Page, Locator } from '@playwright/test';
 import { AccountNav } from './account-nav.component';
 import { ProfilePage } from './profile.page';
+import { AddressesPage } from './addresses.page';
@@
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

### `tests/account/addresses.spec.ts` (новый)

```typescript
import { test, expect } from '../../fixtures';
import { createAddress } from '../../data/address';

test.describe('Account addresses', () => {
  test('ACC-02: new address with required fields appears in the address list', async ({ page, accountPage }) => {
    const address = createAddress();

    await accountPage.goto();
    const addressesPage = await accountPage.openAddresses();
    await expect(page).toHaveURL(/\/dk\/account\/addresses$/);

    await addressesPage.addAddress(address);
    const card = addressesPage.addressCard(address);

    await expect(card.name).toHaveText(`${address.firstName} ${address.lastName}`);
    await expect(card.address).toHaveText(address.address1);
    await expect(card.postalCity).toHaveText(`${address.postalCode}, ${address.city}`);
    await expect(card.provinceCountry).toHaveText(address.countryCode.toUpperCase());
  });
});
```

### `README.md` (изменения)

```diff
 ├── data/
-│   └── customer.ts                  # Test data factory (unique customer)
+│   ├── customer.ts                  # Test data factory (unique customer)
+│   └── address.ts                   # Test data factory (unique address)
@@
 │   └── account/
 │       ├── account-nav.component.ts # Side nav shared by /dk/account/* pages
+│       ├── add-address-modal.component.ts
+│       ├── address-card.component.ts
+│       ├── addresses.page.ts
 │       ├── overview.page.ts
 │       └── profile.page.ts
@@
 │   └── account/
-│       └── profile-navigation.spec.ts
+│       ├── addresses.spec.ts
+│       └── profile-navigation.spec.ts
@@
 | ACC-01  | Profile page opens from the account navigation | `tests/account/profile-navigation.spec.ts` | ✅  |
+| ACC-02  | New address with required fields appears in the address list | `tests/account/addresses.spec.ts` | ✅ |
 | ADM-01  | Admin logs in with valid credentials           | `tests/admin/admin.spec.ts`             | ✅     |
```

`fixtures/index.ts` не менялся: точка входа сценария — существующая фикстура `accountPage`.

---

### Решения по ограничениям

1. **Имена полей.** У страницы корень называется `wrapper`, у компонентов (`AddAddressModal`, `AddressCard`) — `root`, как в `ProfilePage`, `AccountOverviewPage` и `AccountNav`.
2. **DOM во всех состояниях.** Локаторы взяты из трёх присланных DOM-файлов: страница, модалка и карточка после сохранения. Пометок «требует DOM» нет. Ожидаемый вид полей карточки (`"имя фамилия"`, `"индекс, город"`, `"DK"`) выведен из `manual-after-save.html`.
3. **Данные стенда не в типах.** `countryCode` объявлен как `string`, а не как union из опций select. Значение `'dk'` лежит только в фабрике `data/address.ts`.
4. **ID теста.** В разделе ACC есть только ACC-01, поэтому тест получил **ACC-02**. Строка добавлена в таблицу Test Cases.
5. **Переход ждёт загрузки.** `openAddresses()` вызывает `waitForLoaded()` до возврата. В спеке нет `toBeVisible(wrapper)` ради ожидания. `toHaveURL` — это настоящая проверка шага сценария «перешёл на адреса», как в ACC-01. Закрытие модалки после сохранения ожидается в POM (`waitFor({ state: 'hidden' })`), а не ассертом.
6. **Точное совпадение.** Все четыре поля карточки проверяются через `toHaveText` целого поля строкой, собранной из введённых данных. `toContainText` не используется.
7. **Каждое заполненное поле.** firstName и lastName проверяются в `name`, address1 — в `address`, postalCode и city — в `postalCity`, countryCode — в `provinceCountry`.
8. **Уникальные данные.** Фамилия и улица содержат уникальный id. Имя и фамилия (`Nora`, `Holm-…`) не совпадают с данными покупателя `Test` / `Customer`. Карточка находится по уникальной улице, поэтому повторные прогоны и ретраи на том же покупателе не дают strict mode violation.
9. **Нет неиспользуемого кода.** Не добавлены:
   - необязательные поля формы;
   - кнопки cancel и close;
   - кнопки edit и delete карточки;
   - `goto()` у `AddressesPage`;
   - новые фикстуры.

   `AddressesPage` создаётся из `accountPage.openAddresses()`.

**Правила README:**
- Все локаторы находятся в `pages/`, `expect` есть только в спеке.
- Фиксированных пауз нет.
- Данные создаются через фабрику в `data/`.
- Используются только `getByTestId` со скоупом от `wrapper`/`root`, без индексов и XPath. Модалка ищется от `page`, потому что рендерится в портале вне `wrapper`.
- Карточка фильтруется по тексту, но это строка, которую тест сам ввёл (`address1`), а не текст интерфейса.