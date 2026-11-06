# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: store\store.spec.ts >> Store listing @flaky >> STORE-02: price high-to-low puts the T-shirt first
- Location: tests\store\store.spec.ts:39:7

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: "Medusa T-Shirt"
Received: "Medusa Sweatshirt"
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - main [ref=e2]:
    - navigation [ref=e5]:
      - button "Menu" [ref=e12] [cursor=pointer]
      - link "Medusa Store" [ref=e14] [cursor=pointer]:
        - /url: /dk
      - generic [ref=e15]:
        - link "Account" [ref=e17] [cursor=pointer]:
          - /url: /dk/account
        - button [ref=e20] [cursor=pointer]:
          - link "Cart (0)" [ref=e21]:
            - /url: /dk/cart
    - generic [ref=e22]:
      - generic [ref=e24]:
        - paragraph [ref=e25]: Sort by
        - generic [ref=e26]:
          - generic [ref=e27]: Latest Arrivals
          - generic [ref=e31]: "Price: Low -> High"
          - generic [ref=e33]: "Price: High -> Low"
      - generic [ref=e35]:
        - heading "All products" [level=1] [ref=e37]
        - list [ref=e38]:
          - listitem [ref=e39]:
            - link [ref=e40] [cursor=pointer]:
              - /url: /dk/products/sweatshirt
              - generic [ref=e41]:
                - img "Medusa Sweatshirt" [ref=e43]
                - generic [ref=e44]:
                  - paragraph [ref=e45]: Medusa Sweatshirt
                  - paragraph [ref=e47]: €10.00
          - listitem [ref=e48]:
            - link [ref=e49] [cursor=pointer]:
              - /url: /dk/products/shorts
              - generic [ref=e50]:
                - img "Medusa Shorts" [ref=e52]
                - generic [ref=e53]:
                  - paragraph [ref=e54]: Medusa Shorts
                  - paragraph [ref=e56]: €10.00
          - listitem [ref=e57]:
            - link [ref=e58] [cursor=pointer]:
              - /url: /dk/products/sweatpants
              - generic [ref=e59]:
                - img "Medusa Sweatpants" [ref=e61]
                - generic [ref=e62]:
                  - paragraph [ref=e63]: Medusa Sweatpants
                  - paragraph [ref=e65]: €10.00
          - listitem [ref=e66]:
            - link [ref=e67] [cursor=pointer]:
              - /url: /dk/products/t-shirt
              - generic [ref=e68]:
                - img "Medusa T-Shirt" [ref=e70]
                - generic [ref=e71]:
                  - paragraph [ref=e72]: Medusa T-Shirt
                  - paragraph [ref=e74]: €10.00
    - generic [ref=e76]:
      - generic [ref=e77]:
        - link "Medusa Store" [ref=e79] [cursor=pointer]:
          - /url: /dk
        - generic [ref=e80]:
          - generic [ref=e81]:
            - generic [ref=e82]: Categories
            - list [ref=e83]:
              - listitem [ref=e84]:
                - link "Shirts" [ref=e85] [cursor=pointer]:
                  - /url: /dk/categories/shirts
                - list
              - listitem [ref=e86]:
                - link "Pants" [ref=e87] [cursor=pointer]:
                  - /url: /dk/categories/pants
                - list
              - listitem [ref=e88]:
                - link "Sweatshirts" [ref=e89] [cursor=pointer]:
                  - /url: /dk/categories/sweatshirts
                - list
              - listitem [ref=e90]:
                - link "Merch" [ref=e91] [cursor=pointer]:
                  - /url: /dk/categories/merch
                - list
          - generic [ref=e92]:
            - generic [ref=e93]: Medusa
            - list [ref=e94]:
              - listitem [ref=e95]:
                - link "GitHub" [ref=e96] [cursor=pointer]:
                  - /url: https://github.com/medusajs
              - listitem [ref=e97]:
                - link "Documentation" [ref=e98] [cursor=pointer]:
                  - /url: https://docs.medusajs.com
              - listitem [ref=e99]:
                - link "Source code" [ref=e100] [cursor=pointer]:
                  - /url: https://github.com/medusajs/dtc-starter
      - generic [ref=e101]:
        - paragraph [ref=e102]: © 2026 Medusa Store. All rights reserved.
        - paragraph [ref=e103]:
          - text: Powered by
          - link [ref=e104] [cursor=pointer]:
            - /url: https://www.medusajs.com
          - text: "&"
          - link [ref=e107] [cursor=pointer]:
            - /url: https://nextjs.org
  - alert [ref=e110]
```

# Test source

```ts
  1   | import { test, expect } from '../../fixtures';
  2   | 
  3   | /**
  4   |  * DELIBERATELY FLAKY — training fixtures.
  5   |  *
  6   |  * Each test below models a real flakiness archetype. Read the comment before
  7   |  * "fixing" anything: the point is the diagnosis, not the green tick.
  8   |  *
  9   |  * Measured behaviour on the inno.ws sandbox (see each test):
  10  |  *   STORE-01  passes 8/8  — latent: breaks when the catalogue changes
  11  |  *   STORE-02  passes ~40% — genuinely intermittent, the real one
  12  |  *   STORE-03  passes 8/8  — latent: breaks on a slow network
  13  |  *   STORE-04  passes 8/8  — latent: breaks on a cold CI runner
  14  |  *   STORE-05  passes 8/8  — breaks on any non-production BASE_URL
  15  |  *
  16  |  * Run them:
  17  |  *   npm run test:flaky            once
  18  |  *   npm run test:flaky:repeat     5x each, to see the variance
  19  |  *
  20  |  * They live in their own Playwright project so `npm test` stays green.
  21  |  */
  22  | 
  23  | test.describe('Store listing @flaky', () => {
  24  |   test('STORE-01: first product in the listing is the sweatshirt', async ({ storePage }) => {
  25  |     // ARCHETYPE: brittle assertion on an ordering the UI never promised.
  26  |     // The listing order is whatever the backend returns. It is stable today,
  27  |     // so this passes every run — the defect is latent, not intermittent. Add
  28  |     // a product or change the default sort and it fails, and the failure will
  29  |     // look unrelated to whatever change caused it.
  30  |     // FIX: assert the set, not the positions —
  31  |     //      expect(names).toEqual(expect.arrayContaining([...]))
  32  |     await storePage.goto();
  33  |     await storePage.waitForLoaded();
  34  | 
  35  |     const names = await storePage.productNames();
  36  |     expect(names[0]).toBe('Medusa Sweatshirt');
  37  |   });
  38  | 
  39  |   test('STORE-02: price high-to-low puts the T-shirt first', async ({ storePage }) => {
  40  |     // ARCHETYPE: race with client-side hydration — the subtle kind.
  41  |     // The sort control is in the server-rendered HTML, so it is clickable
  42  |     // before React has attached its handler. Clicking in that window does
  43  |     // nothing at all: no error, no request, and the list stays unsorted.
  44  |     // The trap is that the obvious guard does not help — waiting for the first
  45  |     // product card to be visible still leaves the race open, because the cards
  46  |     // are server-rendered too (they are in the HTML at 0ms).
  47  |     // Measured: 4 sorted / 6 unsorted over 10 runs with a warm session (~60%
  48  |     // failure), and 2/15 (~13%) cold. This is the genuinely intermittent one.
  49  |     // FIX: wait for interactivity, not paint — assert the sort request's
  50  |     //      response, or poll until the list actually reorders. A fixed timeout
  51  |     //      only hides the race; it does not remove it.
  52  |     await storePage.goto();
  53  |     await storePage.waitForLoaded();
  54  |     await storePage.sortBy('Price: High -> Low');
  55  | 
  56  |     const names = await storePage.productNames();
> 57  |     expect(names[0]).toBe('Medusa T-Shirt');
      |                      ^ Error: expect(received).toBe(expected) // Object.is equality
  58  |   });
  59  | 
  60  |   test('STORE-03: the listing renders exactly four products', async ({ storePage }) => {
  61  |     // ARCHETYPE: asserting on a count instead of waiting for it.
  62  |     // The cards are server-rendered here, so the count is already 4 and this
  63  |     // passes — but the assertion reads the DOM exactly once. On a slow
  64  |     // connection, a cached-then-revalidated response, or once the list becomes
  65  |     // client-fetched, the same code reads 0 and fails.
  66  |     // FIX: a web-first assertion that retries —
  67  |     //      await expect(storePage.productCards).toHaveCount(4)
  68  |     await storePage.goto();
  69  | 
  70  |     const count = await storePage.productCards.count();
  71  |     expect(count).toBe(4);
  72  |   });
  73  | 
  74  |   test('STORE-04: every product costs ten euro', async ({ storePage }) => {
  75  |     // ARCHETYPE: sleep-based synchronisation.
  76  |     // A fixed delay is a guess about how long the network takes — long enough
  77  |     // on a warm local run, too short on a cold CI runner. This passes here and
  78  |     // fails in CI: the classic "works on my machine".
  79  |     // The waitForTimeout below is a deliberate violation of the repo's lint
  80  |     // rule, which is why it is disabled rather than removed. Run `npm run lint`
  81  |     // with this line un-disabled to see the gate catch it.
  82  |     // FIX: replace the delay with a retrying assertion —
  83  |     //      await expect(storePage.productPrices).toHaveCount(4)
  84  |     await storePage.goto();
  85  |     // eslint-disable-next-line playwright/no-wait-for-timeout -- deliberate: the sleep IS the defect being taught
  86  |     await storePage.page.waitForTimeout(150);
  87  | 
  88  |     const prices = await storePage.productPrices.allTextContents();
  89  |     expect(prices.length).toBeGreaterThan(0);
  90  |     for (const price of prices) {
  91  |       expect(price.trim()).toBe('€10.00');
  92  |     }
  93  |   });
  94  | 
  95  |   test('STORE-05: the store URL is exactly the configured base URL', async ({ page, storePage }) => {
  96  |     // ARCHETYPE: hardcoded absolute values that ignore configuration.
  97  |     // Pinning the full URL couples the test to one host and one locale. Point
  98  |     // BASE_URL at a local dev server or a review environment and this fails
  99  |     // even though the page is perfectly correct.
  100 |     // FIX: compare a path, not an origin —
  101 |     //      await expect(page).toHaveURL(/\/dk\/store$/)
  102 |     await storePage.goto();
  103 | 
  104 |     expect(page.url()).toBe('https://qa-sandbox.inno.ws/dk/store');
  105 |   });
  106 | });
  107 | 
```