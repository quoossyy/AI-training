#!/usr/bin/env node
// Prints the server-rendered order of a list (catalogue, table, feed) for run metadata and data hypotheses.
// Playwright-based; @playwright/test is resolved from the target repo (current directory).
//
// Usage (from the repo root):
//   node list-snapshot.mjs --item SEL --field SEL [--field SEL ...] [options] <label>=<path> [...]
//   <path> is absolute or relative to BASE_URL; write it without a leading slash (Git Bash rewrites /x to C:/...).
//
// For each <path> (relative to BASE_URL) loads the page without JS interaction (no hydration race) and prints
// one row per --item: the trimmed text of each --field inside it, joined by a space. Output is JSON {label: rows}.
//
// Options:
//   --repeat K        load each path K times; adds "<label>_distinct_orders" when K > 1 — whether the order
//                     changes between loads (tie / unstable sort hypothesis)
//   --base-env NAME   env var with the base URL (default BASE_URL)
//   --gate-env NAME   env var with a gate URL (session link etc.) visited first, absolute or relative to base
//   --env-file FILE   KEY=VALUE pairs used for unset vars (default .env if present)
//
// Example (store catalogue sorted by price, used with run-condition.mjs --snapshot-cmd):
//   node list-snapshot.mjs --gate-env SESSION_LINK --item [data-testid=product-wrapper] \
//     --field [data-testid=product-title] --field [data-testid=price] default=dk/store price_desc=dk/store?sortBy=price_desc
// No single quotes inside --snapshot-cmd: run-condition.mjs runs it through cmd.exe on Windows.
/* global process, console */
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const opts = { repeat: 1, baseEnv: 'BASE_URL', gateEnv: '', envFile: '.env', item: '', fields: [] };
const pages = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--repeat') opts.repeat = Number(args[++i]) || 1;
  else if (a === '--base-env') opts.baseEnv = args[++i];
  else if (a === '--gate-env') opts.gateEnv = args[++i];
  else if (a === '--env-file') opts.envFile = args[++i];
  else if (a === '--item') opts.item = args[++i];
  else if (a === '--field') opts.fields.push(args[++i]);
  else if (a.includes('=')) pages.push([a.slice(0, a.indexOf('=')), a.slice(a.indexOf('=') + 1)]);
  else {
    console.error(`Unknown argument ${a}`);
    process.exit(2);
  }
}
if (!opts.item || !opts.fields.length || !pages.length) {
  console.error('Usage: list-snapshot.mjs --item SEL --field SEL [--field SEL ...] [options] <label>=<path> [...]');
  process.exit(2);
}

const fileEnv = {};
if (existsSync(opts.envFile)) {
  for (const line of readFileSync(opts.envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([\w.]+)\s*=\s*(.*?)\s*$/);
    if (m) fileEnv[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}
const envVar = (name) => (name ? process.env[name] || fileEnv[name] || '' : '');

const base = envVar(opts.baseEnv).replace(/\/+$/, '');
if (!base) {
  console.error(`${opts.baseEnv} is not set`);
  process.exit(1);
}
const gate = envVar(opts.gateEnv);
const abs = (url) => (/^https?:\/\//i.test(url) ? url : `${base}/${url.replace(/^\/+/, '')}`);

const { chromium } = createRequire(join(process.cwd(), 'noop.js'))('@playwright/test');
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  if (gate) await page.goto(abs(gate), { waitUntil: 'domcontentloaded' });

  async function rows(path) {
    await page.goto(abs(path), { waitUntil: 'domcontentloaded' });
    const items = page.locator(opts.item);
    await items.first().waitFor();
    return items.evaluateAll(
      (els, fields) => els.map((el) => fields.map((f) => el.querySelector(f)?.textContent?.trim() ?? '').join(' ')),
      opts.fields,
    );
  }

  const out = {};
  for (const [label, path] of pages) {
    const loads = [];
    for (let i = 0; i < opts.repeat; i++) loads.push(await rows(path));
    out[label] = loads[0];
    if (opts.repeat > 1) out[`${label}_distinct_orders`] = [...new Set(loads.map((r) => r.join(' | ')))];
  }
  console.log(JSON.stringify(out, null, 2));
} finally {
  await browser.close();
}
