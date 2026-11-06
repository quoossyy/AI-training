import { test, expect } from '../../fixtures';

/**
 * DELIBERATELY FLAKY — training fixtures.
 *
 * Each test below models a real flakiness archetype. Read the comment before
 * "fixing" anything: the point is the diagnosis, not the green tick.
 *
 * Measured behaviour on the inno.ws sandbox (see each test):
 *   STORE-01  passes 8/8  — latent: breaks when the catalogue changes
 *   STORE-02  documented ~40%; measured 0/110 before the fix (race: read
 *             before the sort response). After the fix ~2-5% residual
 *             failures in sortBy() — app-side, see deliverables/flaky
 *   STORE-03  passes 8/8  — latent: breaks on a slow network
 *   STORE-04  passes 8/8  — latent: breaks on a cold CI runner
 *   STORE-05  passes 8/8  — breaks on any non-production BASE_URL
 *
 * Run them:
 *   npm run test:flaky            once
 *   npm run test:flaky:repeat     5x each, to see the variance
 *
 * They live in their own Playwright project so `npm test` stays green.
 */

test.describe('Store listing @flaky', () => {
  test('STORE-01: first product in the listing is the sweatshirt', async ({ storePage }) => {
    // ARCHETYPE: brittle assertion on an ordering the UI never promised.
    // The listing order is whatever the backend returns. It is stable today,
    // so this passes every run — the defect is latent, not intermittent. Add
    // a product or change the default sort and it fails, and the failure will
    // look unrelated to whatever change caused it.
    // FIX: assert the set, not the positions —
    //      expect(names).toEqual(expect.arrayContaining([...]))
    await storePage.goto();
    await storePage.waitForLoaded();

    const names = await storePage.productNames();
    expect(names[0]).toBe('Medusa Sweatshirt');
  });

  test('STORE-02: price high-to-low puts the T-shirt first', async ({ page, storePage }) => {
    // ARCHETYPE: acting and then reading the result once, before it exists.
    // Originally documented as a hydration race (click swallowed, ~40-60% pass).
    // Measured on qa-sandbox.inno.ws (deliverables/flaky): 0/110 pass. The sort
    // request was sent in every inspected failure; the test read the list once,
    // ~5 ms after the request left and 50-95 ms before the response, so it saw
    // the old order. Fix: sortBy() waits for the click's result (URL change),
    // and the order is checked with retrying assertions, not a one-shot read.
    // Residual (~2-5%, likely app side, open question to the team): the sort request
    // is sent and answered 200, yet the app never applies it — URL and list stay
    // unchanged. sortBy() then fails with a waitForURL timeout. Not masked here:
    // re-clicking or a longer timeout would hide a user-visible defect.
    await storePage.goto();
    await storePage.waitForLoaded();
    await storePage.sortBy('Price: High -> Low');

    await expect(page).toHaveURL(/[?&]sortBy=price_desc(&|$)/);
    await expect(storePage.productTitles.first()).toHaveText('Medusa T-Shirt');
    // The product guarantee of a price sort. All sandbox prices are equal
    // (€10.00), so "T-shirt first" rests on the server's tie-break order —
    // stable today, not promised by the product (question raised to the team).
    const prices = await storePage.productPriceValues();
    // Guard the order check against passing vacuously: an empty list or an
    // unparsed price (NaN equals NaN in toEqual) would make it meaningless.
    expect(prices.length).toBeGreaterThan(1);
    for (const price of prices) expect(price).toBeGreaterThan(0);
    expect(prices).toEqual([...prices].sort((a, b) => b - a));
  });

  test('STORE-03: the listing renders exactly four products', async ({ storePage }) => {
    // ARCHETYPE: asserting on a count instead of waiting for it.
    // The cards are server-rendered here, so the count is already 4 and this
    // passes — but the assertion reads the DOM exactly once. On a slow
    // connection, a cached-then-revalidated response, or once the list becomes
    // client-fetched, the same code reads 0 and fails.
    // FIX: a web-first assertion that retries —
    //      await expect(storePage.productCards).toHaveCount(4)
    await storePage.goto();

    const count = await storePage.productCards.count();
    expect(count).toBe(4);
  });

  test('STORE-04: every product costs ten euro', async ({ storePage }) => {
    // ARCHETYPE: sleep-based synchronisation.
    // A fixed delay is a guess about how long the network takes — long enough
    // on a warm local run, too short on a cold CI runner. This passes here and
    // fails in CI: the classic "works on my machine".
    // The waitForTimeout below is a deliberate violation of the repo's lint
    // rule, which is why it is disabled rather than removed. Run `npm run lint`
    // with this line un-disabled to see the gate catch it.
    // FIX: replace the delay with a retrying assertion —
    //      await expect(storePage.productPrices).toHaveCount(4)
    await storePage.goto();
    // eslint-disable-next-line playwright/no-wait-for-timeout -- deliberate: the sleep IS the defect being taught
    await storePage.page.waitForTimeout(150);

    const prices = await storePage.productPrices.allTextContents();
    expect(prices.length).toBeGreaterThan(0);
    for (const price of prices) {
      expect(price.trim()).toBe('€10.00');
    }
  });

  test('STORE-05: the store URL is exactly the configured base URL', async ({ page, storePage }) => {
    // ARCHETYPE: hardcoded absolute values that ignore configuration.
    // Pinning the full URL couples the test to one host and one locale. Point
    // BASE_URL at a local dev server or a review environment and this fails
    // even though the page is perfectly correct.
    // FIX: compare a path, not an origin —
    //      await expect(page).toHaveURL(/\/dk\/store$/)
    await storePage.goto();

    expect(page.url()).toBe('https://qa-sandbox.inno.ws/dk/store');
  });
});
