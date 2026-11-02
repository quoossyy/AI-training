import type { Page } from '@playwright/test';

/**
 * Forced-reproduction conditions for Playwright.
 *
 * Applied to the real spec through a local, never-committed patch of the `page` fixture, so the same mechanism
 * runs against the code "before" and "after" the fix (references/root-cause.md):
 *
 *   page: async ({ page, baseURL }, use) => { await applyReproCondition(page, baseURL); await use(page); },
 *
 * Project-specific values (URL patterns, rates) go into env and are recorded in .flaky/profile.md.
 *
 *   REPRO_CONDITION=gate           before the test opens the stand gate URL (session link etc.) taken from the env var
 *                                  named by REPRO_GATE_ENV, absolute or relative to baseURL. For "cold" behind a gate
 *   REPRO_CONDITION=cpu           CPU x REPRO_CPU_RATE (default 20): JS execution (e.g. hydration) ends long after `load`
 *   REPRO_CONDITION=request-delay  delay every request whose URL matches REPRO_URL_RE by REPRO_DELAY_MS (default 3000).
 *                                  Caveat: goto() waits for `load`, which also waits for the document's scripts, so
 *                                  delaying JS chunks may NOT widen a hydration window — check in the trace
 *   REPRO_CONDITION=throttled      run-matrix condition: CPU x4 + ~Slow 3G
 * Several conditions: comma-separated. Chromium only (CDP) for cpu / throttled.
 */
const delayMs = Number(process.env.REPRO_DELAY_MS ?? 3000);
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function applyReproCondition(page: Page, baseURL?: string): Promise<void> {
  const conditions = (process.env.REPRO_CONDITION ?? '').split(',').filter(Boolean);
  for (const condition of conditions) {
    switch (condition) {
      case 'gate': {
        const gate = process.env[process.env.REPRO_GATE_ENV ?? ''];
        if (!gate) throw new Error('REPRO_CONDITION=gate needs REPRO_GATE_ENV naming a non-empty env var');
        const url = /^https?:\/\//i.test(gate) ? gate : `${(baseURL ?? '').replace(/\/+$/, '')}/${gate.replace(/^\/+/, '')}`;
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        break;
      }
      case 'cpu': {
        const cdp = await page.context().newCDPSession(page);
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: Number(process.env.REPRO_CPU_RATE ?? 20) });
        break;
      }
      case 'request-delay': {
        if (!process.env.REPRO_URL_RE) throw new Error('REPRO_CONDITION=request-delay needs REPRO_URL_RE');
        const urlRe = new RegExp(process.env.REPRO_URL_RE);
        await page.route(
          (url) => urlRe.test(url.href),
          async (route) => {
            await pause(delayMs);
            await route.continue();
          },
        );
        break;
      }
      case 'throttled': {
        const cdp = await page.context().newCDPSession(page);
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
        await cdp.send('Network.emulateNetworkConditions', {
          offline: false,
          latency: 400,
          downloadThroughput: (400 * 1024) / 8,
          uploadThroughput: (400 * 1024) / 8,
        });
        break;
      }
      default:
        throw new Error(`Unknown REPRO_CONDITION "${condition}"`);
    }
  }
}
