# Проверка ограничений из списка правок

Вопрос: правда ли 9 ограничений из [3-edits.md](3-edits.md) предотвращают ошибки первой генерации?

## Итог

**9 из 9 ограничений сработали в двух независимых генерациях на чистом входе из `main`.** Оговорка одна: во
второй генерации №9 выполнен частично. Обе генерации проходят `tsc`, `eslint .` и тест на стенде.

Первая проверка 03.11 (ниже) дала «8 из 9», но её вход был загрязнён: README и `overview.page.ts` уже содержали мои
итоговые файлы. Поэтому 06.11 проверку повторили (см. [7-hallucinations.md](7-hallucinations.md) #7).

## Перепроверка 06.11: вход из `main`, две генерации

**Как проверяли:**

- Отдельный git worktree на `main` (`6b9b877`). В нём нет ни одного файла адресов, в README нет ACC-02, в
  `overview.page.ts` нет `openAddresses()`. Туда положили только три DOM-файла из `dom/`.
- Два свежих агента Claude, параллельно, без контекста сессии. Промпт — **тот же дословно**, что 03.11 (в конце
  файла), изменён только путь к репозиторию.
- Код каждой генерации по очереди положили в этот worktree и прогнали:
  `npm run typecheck`, `npx eslint .`, `npx playwright test tests/account/addresses.spec.ts`. После прогонов worktree
  сброшен (`git checkout -- . && git clean`).
- Выдача обеих генераций — дословно в [regen-main/generation-A.md](regen-main/generation-A.md) и
  [regen-main/generation-B.md](regen-main/generation-B.md).

**Результат:** обе — `tsc` и `eslint .` без ошибок, **3 passed** (setup ×2 + ACC-02) на стенде с первой попытки.

| # | Ошибка первой генерации | Генерация А | Генерация Б | Вывод |
| --- | --- | --- | --- | --- |
| 1 | корень страницы `root` | `wrapper` / `root` | `wrapper` / `root` | ✅ 2/2 |
| 2 | карточка «требует DOM» | все testid из DOM после сохранения | то же | ✅ 2/2 |
| 3 | `type CountryCode = 'dk' \| …` | `countryCode: string` | `countryCode: string` | ✅ 2/2 |
| 4 | `ADDR-01` | `ACC-02` — следующий свободный по чистому README | `ACC-02` | ✅ 2/2 (на чистом входе — независимо) |
| 5 | переход без ожидания + ассерт-ожидание в спеке | `openAddresses()` написан моделью **с** `waitForLoaded()`; ассертов-ожиданий нет | `openAddresses()` с `waitForLoaded()`. В спеке `toHaveURL(/addresses$/)` — модель объяснила как проверку шага, по образцу ACC-01 (там это основной ассерт) | ✅ 2/2 — №5 теперь проверен независимо |
| 6 | `toContainText` по частям | `toHaveText` целого поля | `toHaveText` целого поля | ✅ 2/2 |
| 7 | страна не проверяется | `provinceCountry` проверен | проверен | ✅ 2/2 |
| 8 | `Test` / `Customer` | `Ann-<id>` / `Probe-<id>` | `Nora` / `Holm-<id>` | ✅ 2/2 |
| 9 | лишняя фикстура | новых фикстур нет, лишних полей нет | новых фикстур нет, но поле `nav: AccountNav` не используется | ✅ / ⚠️ частично |

**Что ограничения по-прежнему не закрывают** (обе генерации, как и 03.11):

- Действие и ожидание его исхода слиты: в А `addAddress()` = fill + save + ждать закрытия, в Б `save()` ждёт
  закрытия. Для негативного сценария (пустая форма) такой метод не годится.
- Нет методов чтения состояния формы. Их требует Шаг 3 задания.
- Это ровно ограничение правки №10: «для формы обязательно метод чтения ошибок валидации и тест, который им
  пользуется; действие (`save`) и ожидание его успешного исхода (`submit`) — разные методы». В набор из 9 оно не
  входило. Две генерации подтверждают, что оно нужно.
- В А карточка ищется `filter({ hasText })` по всей карточке, а не по полю `address-address`. Работает, но
  совпадение возможно и в другом поле карточки.

## Первая проверка 03.11 (загрязнённый вход)

Оставлена для истории. Вывод «8 из 9» заменён итогом выше.

### Как проверяла

- Свежий агент Claude без контекста сессии получил исходные DOM-файлы и DOM после сохранения (это ограничение №2),
  **рабочий** README и примеры фреймворка из ветки `task/page-object`. Отчёт тогда называл их «тот же README» —
  неверно: README уже содержал `addresses.page.ts`, `add-address-modal.component.ts # … (portal, scoped from page)`,
  `address-card.component.ts` и строку ACC-02, а `overview.page.ts` — исправленный `openAddresses()`. Плюс запись
  «стек + стратегия», сценарий и 9 ограничений дословно. Промпт — в конце файла.
- Ему запретили читать итоговые файлы (`addresses.page.ts`, компоненты, `data/address.ts`, спеку) и `deliverables/`, кроме DOM.
- Генерация в один шаг (без промежуточного списка элементов), код вернул текстом.
- Код положила во временную копию фреймворка в репозитории и прогнала тем же раннером. Копию после прогона удалила.

**Результат прогона:** `tsc` без ошибок, ACC-03 (как его назвала модель) — **passed** на стенде с первой попытки.

### Ограничение → что получилось

| # | Ошибка первой генерации | Во второй генерации | Вывод |
| --- | --- | --- | --- |
| 1 | корень страницы `root` | `wrapper` у страницы, `root` у компонентов | ✅ предотвращено |
| 2 | локаторы карточки «требует DOM» | все testid карточки взяты из DOM после сохранения, пометок «требует DOM» нет | ✅ предотвращено |
| 3 | `type CountryCode = 'dk' \| …` | `countryCode: string` | ✅ предотвращено |
| 4 | `ADDR-01` | `ACC-03` — следующий свободный по README, который видела модель (ACC-02 уже был занят) | ✅ предотвращено |
| 5 | `openAddresses()` без ожидания + ассерт-ожидание в спеке | в спеке ассерта-ожидания нет; `openAddresses()` модель не писала | ⚠️ **не проверено**: в `overview.page.ts`, который получила модель, уже был мой исправленный `openAddresses()` с `waitForLoaded()`. Независимое подтверждение — только то, что модель сама добавила ожидание в `openAddAddressModal()` |
| 6 | `toContainText` по частям | `toHaveText` целого поля везде | ✅ предотвращено |
| 7 | страна не проверяется | `provinceCountry` проверяется | ✅ предотвращено |
| 8 | `Test` / `Customer` совпадают с покупателем | `Nora` / `Lind <id>` | ✅ предотвращено |
| 9 | лишняя фикстура `addressesPage` | новых фикстур нет | ✅ предотвращено |

**Итог 03.11: 8 из 9 «подтверждены», №5 не проверен.** Вывод завышен: утечка через README касалась и №4 (ID теста), и разбиения на компоненты, а генерация была одна. Заменён перепроверкой 06.11.
Для честной проверки №5 нужно было дать модели `overview.page.ts` из `main`.

### Что ограничения не закрыли

Новые расхождения второй генерации с конвенциями. Они не ломают прогон, но стали бы правками:

| Что | Почему это проблема | Ограничение, которого не хватило |
| --- | --- | --- |
| Тест в новом файле `tests/account/add-address.spec.ts` | Модель не видела `addresses.spec.ts` (я запретила его читать) и честно написала, что её файлы заменят существующие. Это артефакт постановки проверки, а не ошибка модели | — |
| Тип переименован `AddressData` → `Address` | В фреймворке рядом `Customer` — короткое имя даже ближе к конвенции; расхождение только с моей версией | — |
| `save()` модалки ждёт закрытия | Метод с таким именем нельзя использовать для негативного кейса (пустая форма): он упадёт по таймауту ожидания закрытия. У меня `save()` — только клик, а ожидание — в `submit()` | «Действие и ожидание результата — разные методы, если у действия есть негативный исход» |
| Нет `goto()` у `AddressesPage` | Ограничение №9 («нет неиспользуемого кода») сработало строже, чем у меня: у `ProfilePage` `goto()` есть, хотя тесты его не зовут | Уточнить №9: «обязательная форма Page Object — `goto()` + `waitForLoaded()` — не считается лишним кодом» |
| Нет методов чтения состояния (ошибки формы) | Сценарий был позитивный, а №9 запрещает неиспользуемое. Шаг 3 задания требует методы чтения состояния | «Для формы нужен метод чтения ошибок валидации и тест, который им пользуется» — см. правку №10 в [3-edits.md](3-edits.md) |

## Промпт проверки (дословно)

Из транскрипта сессии 03.11 18:09. 06.11 тот же текст, путь `Репо:` заменён на worktree `main`.

```text
Ты пишешь Page Object и тест для фреймворка Playwright + TypeScript. Работай ТОЛЬКО по файлам ниже (читай их Read-ом), не открывай другие файлы репозитория (в частности НЕ читай pages/account/addresses.page.ts, add-address-modal.component.ts, address-card.component.ts, data/address.ts, tests/account/addresses.spec.ts и папку deliverables, кроме перечисленных DOM-файлов). Ничего не создавай и не редактируй — верни содержимое каждого файла целиком в ответе (по блоку кода на файл, с путём; для изменённых существующих файлов — только изменения). Код не запускай. Репо: C:\Users\user1\Desktop\aiReal\AI-training

Файлы:
- DOM страницы /dk/account/addresses (пустой список): deliverables/page-object/dom/addresses.html
- DOM модалки добавления адреса (кнопка add-address-button): deliverables/page-object/dom/add-address-modal.html
- DOM страницы после сохранения одного адреса: deliverables/page-object/dom/manual-after-save.html
- README.md, pages/account/profile.page.ts, pages/account/overview.page.ts, pages/account/account-nav.component.ts, tests/auth/login.spec.ts, tests/account/profile-navigation.spec.ts, fixtures/index.ts, data/customer.ts

Стек + стратегия локаторов:
стек: Playwright Test + TypeScript (strict), Page Object Model
первичный признак: data-testid — getByTestId, со скоупом от корня страницы/компонента
запасной признак: роль + доступное имя (getByRole) — где нет data-testid
запрещено: порядковые номера, длинные цепочки XPath, привязка к тексту интерфейса

Сценарий: один тест — покупатель с обзора аккаунта переходит на адреса, добавляет новый адрес (только обязательные поля), и адрес появляется в списке.

Ограничения:
1. Имена полей бери из существующих Page Object, а не из записи стратегии: у страницы корень — wrapper, у компонента — root.
2. DOM передан во всех состояниях сценария (до и после сохранения) — используй его, не оставляй «требует DOM».
3. Не переноси данные стенда (опции селектов, тексты) в типы TypeScript.
4. ID теста — следующий свободный номер раздела из таблицы Test Cases в README.
5. Метод перехода ждёт загрузки целевой страницы (waitForLoaded) до возврата; в спеке нет ассертов, которые служат только ожиданием.
6. Для значений, которые тест сам ввёл, — точное совпадение toHaveText целого поля, а не toContainText по частям.
7. Проверь каждое поле, которое тест заполнил.
8. Тестовые данные формы уникальны и не совпадают с данными покупателя из data/customer.ts.
9. Не добавляй код, который не использует ни один тест; фикстуры — только для точек входа, как loginPage/accountPage.
Плюс правила README: локаторы только в pages/, expect только в спеке, без фиксированных пауз, уникальные тестовые данные через data/.

Ответ верни целиком в markdown — он будет процитирован дословно. В конце коротко перечисли, какие решения принял по каждому ограничению.
```

## Выдача модели (дословно)

<details>
<summary>Ответ Claude на промпт проверки</summary>

````markdown
## Page Object и тест: добавление адреса (ACC-03)

Я работал только по перечисленным файлам. `pages/account/addresses.page.ts`, `add-address-modal.component.ts`, `address-card.component.ts`, `data/address.ts` и `tests/account/addresses.spec.ts` не открывал. Поэтому файлы ниже лежат по путям из README и даны как полное содержимое. Если положить их в репозиторий, они заменят существующие файлы с теми же именами. Под ACC-02 их тоже не сверял: он импортирует эти модули, и после замены может сломаться. Единственное, что известно о существующем коде: `overview.page.ts` импортирует `AddressesPage` из `./addresses.page` и вызывает у него `waitForLoaded()`. Мой класс это выполняет. Код не запускал.

### `data/address.ts`

```typescript
export interface Address {
  firstName: string;
  lastName: string;
  address1: string;
  postalCode: string;
  city: string;
  countryCode: string;
}

/** Stand data persists between runs, so every address gets unique name and street. */
export function createAddress(): Address {
  const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  return {
    firstName: 'Nora',
    lastName: `Lind ${id}`,
    address1: `Testvej ${id}`,
    postalCode: '2100',
    city: 'Copenhagen',
    countryCode: 'dk',
  };
}
```

### `pages/account/add-address-modal.component.ts`

```typescript
import { Page, Locator } from '@playwright/test';
import { Address } from '../../data/address';

/** "Add address" dialog. Rendered in a portal outside the page wrapper, so scoped from the page. */
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

  async waitForLoaded() {
    await this.root.waitFor();
  }

  /** Fills only the required fields of the form. */
  async fillRequired(address: Address) {
    await this.firstNameInput.fill(address.firstName);
    await this.lastNameInput.fill(address.lastName);
    await this.address1Input.fill(address.address1);
    await this.postalCodeInput.fill(address.postalCode);
    await this.cityInput.fill(address.city);
    await this.countrySelect.selectOption(address.countryCode);
  }

  /** Submits the form and waits until the dialog closes. */
  async save() {
    await this.saveButton.click();
    await this.root.waitFor({ state: 'hidden' });
  }
}
```

### `pages/account/address-card.component.ts`

```typescript
import { Locator } from '@playwright/test';

/** One saved address card on the addresses page. */
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

  constructor(page: Page) {
    this.page = page;
    this.nav = new AccountNav(page);
    this.wrapper = page.getByTestId('addresses-page-wrapper');
    this.addAddressButton = this.wrapper.getByTestId('add-address-button');
    this.addAddressModal = new AddAddressModal(page);
  }

  async waitForLoaded() {
    await this.wrapper.waitFor();
  }

  async openAddAddressModal(): Promise<AddAddressModal> {
    await this.addAddressButton.click();
    await this.addAddressModal.waitForLoaded();
    return this.addAddressModal;
  }

  /** Card of the saved address with the given street line (unique test data, not UI copy). */
  addressCard(address1: string): AddressCard {
    return new AddressCard(
      this.wrapper
        .getByTestId('address-container')
        .filter({ has: this.page.getByTestId('address-address').filter({ hasText: address1 }) }),
    );
  }
}
```

### `tests/account/add-address.spec.ts` (новый файл)

```typescript
import { test, expect } from '../../fixtures';
import { createAddress } from '../../data/address';

test.describe('Address book', () => {
  test('ACC-03: address with required fields is added to the address list', async ({ accountPage }) => {
    const address = createAddress();

    await accountPage.goto();
    const addressesPage = await accountPage.openAddresses();
    const modal = await addressesPage.openAddAddressModal();
    await modal.fillRequired(address);
    await modal.save();

    const card = addressesPage.addressCard(address.address1);
    await expect(card.name).toHaveText(`${address.firstName} ${address.lastName}`);
    await expect(card.address).toHaveText(address.address1);
    await expect(card.postalCity).toHaveText(`${address.postalCode}, ${address.city}`);
    await expect(card.provinceCountry).toHaveText(address.countryCode.toUpperCase());
  });
});
```

### `README.md` (только изменения)

В Project Structure, в `tests/account/`, добавить строку:

```
│       ├── addresses.spec.ts
│       └── add-address.spec.ts
```

(у `addresses.spec.ts` префикс `└──` меняется на `├──`)

В таблицу Test Cases после ACC-02 добавить строку:

```
| ACC-03  | Address with required fields is added to the address list | `tests/account/add-address.spec.ts` | ✅ |
```

Без изменений остаются `fixtures/index.ts`, `pages/account/overview.page.ts` (в нём уже есть `openAddresses()` с `waitForLoaded()`) и `account-nav.component.ts`.

---

### Решения по ограничениям

1. **Имена полей.** У `AddressesPage` корень называется `wrapper`, как у `ProfilePage` и `AccountOverviewPage`. У компонентов `AddAddressModal` и `AddressCard` корень называется `root`, как у `AccountNav`. Ещё перенёс из существующих Page Object поля `page` и `nav` и методы `goto`/`waitForLoaded`.
2. **DOM всех состояний.** Обязательные поля взял из `add-address-modal.html`: это поля с `required` — first name, last name, address, postal code, city и country select. Состав карточки и формат её полей взял из `manual-after-save.html`: `address-name` = «Имя Фамилия», `address-postal-city` = «индекс, город», `address-province-country` = код страны в верхнем регистре (провинция пустая). Мест с пометкой «требует DOM» не осталось.
3. **Данные стенда не в типах.** `countryCode: string`, union из опций селекта нет. Значения `dk`, `2100` и `Copenhagen` лежат только в фабрике `data/address.ts`.
4. **ID.** В разделе ACC заняты ACC-01 и ACC-02, поэтому тест получил ACC-03. Добавить его в `addresses.spec.ts` к ACC-02 я не мог, потому что этот файл нельзя было читать. Тест лежит в новом файле `add-address.spec.ts`.
5. **Ожидание в переходах.** `openAddresses()` уже ждёт `waitForLoaded()`. `openAddAddressModal()` ждёт появления модалки, а `save()` ждёт, пока она закроется (`waitFor({ state: 'hidden' })`). В спеке нет ни `toBeVisible`, ни проверки URL, которые служили бы только ожиданием.
6. **Точное совпадение.** Каждое поле карточки проверяется через `toHaveText` целиком, ожидаемое значение собирается из введённых данных. `toContainText` нигде нет.
7. **Все заполненные поля проверены.** Имя и фамилия проверяются в `name`, адрес — в `address`, индекс и город — в `postalCity`, страна — в `provinceCountry`.
8. **Уникальные данные.** Фамилия и улица содержат уникальный id. Имя `Nora` и фамилия `Lind …` не совпадают с `Test`/`Customer` из `data/customer.ts`.
9. **Нет лишнего кода.** Кнопки Edit/Remove, необязательные поля формы, Cancel и Close в Page Object не вошли. Новых фикстур нет: точкой входа служит `accountPage`, а `AddressesPage` возвращается из `openAddresses()`.

**Правила README.** Локаторы есть только в `pages/`, а `expect` — только в спеке. Нет `page.goto` в тесте и нет `waitForTimeout`. Данные создаются фабрикой из `data/`.

**Отступление от стратегии локаторов.** У карточек нет своего `data-testid`, поэтому нужную карточку нахожу фильтром `has` по полю `address-address` с уникальной улицей. Улицу ввёл сам тест, так что это не текст интерфейса, а индексы при этом не нужны. Модалка рендерится в портале вне `wrapper`, поэтому её корень ищется от `page`. Роли не понадобились: `data-testid` есть у всего, с чем работает тест.
````

</details>
