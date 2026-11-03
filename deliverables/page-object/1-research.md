# Шаг 1 — Research

## Вариант и причина выбора

**Вариант Б — стартовый фреймворк** (`aitraining-ctrl/AI-training`, форк `quoossyy/AI-training`, ветка `task/page-object`).
Почему: фреймворк уже есть (Playwright + TypeScript, POM, фикстуры, storageState-сессия), а ESLint сам ловит
нарушения архитектуры (локаторы в тестах, `page.goto`, `waitForTimeout`). Значит, выдачу модели можно проверить
не только прогоном, но и конвенциями. Исходные тесты проходят: `npx playwright test --project=setup` → 2 passed.

## Страница

`/dk/account/addresses` — «Shipping Addresses». Класса для неё в `pages/` нет: есть только `addressesLink`
в `pages/account/account-nav.component.ts`.

## Снятый DOM

| Файл | Что внутри |
| --- | --- |
| [dom/addresses.html](dom/addresses.html) | `addresses-page-wrapper` у нового покупателя: заголовок, описание, кнопка `add-address-button`, адресов нет |
| [dom/add-address-modal.html](dom/add-address-modal.html) | Модалка после клика «New address»: `add-address-modal`, 10 полей (`*-input`, `country-select`), `cancel-button`, `save-button`, `close-modal-button` |

**Как снят DOM.** Не через «Просмотреть код → копировать внешний HTML» и не через Playwright MCP, как планировалось,
а одноразовым скриптом Playwright с сохранённой сессией покупателя (`playwright/.auth/customer.json`):
`locator.evaluate(el => el.outerHTML)` для `addresses-page-wrapper` и для модалки после клика «New address».
Результат тот же, что у «копировать внешний HTML» в DevTools, но съёмку можно повторить одной командой.
Скрипт — вспомогательный, в репозиторий не входит. При съёмке модалки выяснилось: внешний `role="dialog"` Headless UI имеет нулевой размер и
Playwright считает его `hidden`; видим внутренний блок `add-address-modal`.

Чего в снятом DOM **нет** (модель этого не видела, достраивается на Шаге 4): карточка сохранённого адреса,
сообщения об ошибках валидации и сервера, состояние кнопки сохранения во время запроса, закрытие модалки.

## Стек + стратегия локаторов (по README фреймворка)

```text
стек: Playwright Test + TypeScript (strict), Page Object Model
первичный признак: data-testid — getByTestId, со скоупом от корня страницы/компонента (this.root.getByTestId)
запасной признак: роль + доступное имя (getByRole) — README разрешает его там, где нет data-testid (админка)
запрещено: порядковые номера, длинные цепочки XPath, привязка к тексту
```

### Где стратегия фреймворка расходится с требованием из обучающего материала

| Требование материала | Фреймворк (README) | Как решаю |
| --- | --- | --- |
| Без привязки к тексту | Запасной признак `getByRole(..., { name })` — это и есть привязка к видимому тексту | На этой странице `data-testid` есть у всех нужных элементов, запасной признак не нужен. Текст проверяется только в ассертах спеки (`toContainText`), не в локаторах |
| Без порядковых номеров | README про индексы молчит, но в troubleshooting советует скоуп «parent → child» | Карточки адресов различаются по содержимому через `filter({ has })`, без `nth()` |
| Локатор находит ровно один видимый элемент | README для модалок не даёт признака; естественный выбор `getByRole('dialog')` попадает во внешнюю обёртку Headless UI нулевого размера (hidden) | Корень модалки — `getByTestId('add-address-modal')`, поля ищутся от него (`this.root.getByTestId`) |

## Что передано Claude

Отдельный агент Claude без контекста этой сессии получил только этот набор:

- оба файла DOM;
- запись «стек + стратегия локаторов» (выше);
- `README.md`;
- существующий Page Object `pages/account/profile.page.ts` и компонент `pages/account/account-nav.component.ts`;
- тест `tests/auth/login.spec.ts`;
- фикстуру `fixtures/index.ts`.

Промпт Шага 2 (дословно):

> Ты пишешь Page Object для фреймворка Playwright + TypeScript. Прочитай приложенные файлы: DOM страницы
> /dk/account/addresses и её модалки добавления адреса, запись «стек + стратегия локаторов», README фреймворка,
> пример Page Object, компонент навигации, пример теста и фикстуру. Пока **не пиши код**. Дай:
>
> 1) список элементов, значимых для тестов, — для каждого имя поля в классе и локатор по стратегии;
> 2) список методов Page Object: действия и чтение состояния, с сигнатурами;
> 3) как класс подключается к тестам (фикстура, переход со страницы обзора).
