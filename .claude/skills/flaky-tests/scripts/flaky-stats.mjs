#!/usr/bin/env node
// Aggregates test-run reports into a flakiness table. No dependencies.
//
// Usage:
//   node flaky-stats.mjs [options] <phase>:<condition>=<report> [...]
//   node flaky-stats.mjs [options] <condition>=<report> [...]        (phase defaults to "before")
//   node flaky-stats.mjs [options] <report|dir> [...]                (phase/condition from the run's meta;
//                                                                     a dir is scanned recursively, _local/ skipped)
//
// Reports: Playwright JSON (*.json) or JUnit XML (*.xml) — JUnit covers pytest, Jest/Vitest (jest-junit),
// Cypress, Maven/Gradle. Several reports with the same <phase>:<condition> (blocks) are summed.
// Run meta written by run-condition.mjs is read from the report's "_meta" key, or from a sibling
// "<report without ext>.meta.json" (JUnit / older runs).
//
// Options:
//   --threshold N        runs needed to call a test fixed (default 30)
//   --grep REGEX         only tests whose title matches
//   --noise LIST         signatures counted as environment noise (default setup,network)
//   --setup-re REGEX     error text that means setup/auth failed (default see SETUP_RE)
//   --network-re REGEX   error text that means network failed (default see NETWORK_RE)
//   --out FILE           also write the markdown to FILE
//
// Each repetition counts once, by its final status. Failures are grouped by signature:
//   setup | network | timeout | assertion | other
// "target" failures = everything not in --noise. Classes (see references/measurement.md):
//   stable-pass   0 target failures          -> stable or latent, needs stress runs
//   always-fail   0 passes among valid runs  -> deterministic failure, not flaky
//   FLAKY         passes and target failures -> flaky
//   noise-only    every run failed on noise  -> no verdict, fix the environment
/* global process, console */
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { basename, join, relative } from 'node:path';

const SETUP_RE = /\b(setup|global\.setup|storageState|login|log in|sign[- ]?in|auth(entication)?|session link|401|403)\b/i;
const NETWORK_RE = /(net::ERR_|ECONNRESET|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|EAI_AGAIN|socket hang up|\b50[234]\b|NS_ERROR_|Connection ?(Error|refused))/i;
const TIMEOUT_RE = /(Timeout \d+ms exceeded|Test timeout of \d+ms|timed? ?out|TimeoutError)/i;
const ASSERTION_RE = /(expect\(|AssertionError|toBe|toEqual|toHave|Expected[: ]|assert )/i;
const ANSI = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g');

// ---------- args ----------
const opts = { threshold: 30, grep: null, noise: ['setup', 'network'], out: null, setupRe: SETUP_RE, networkRe: NETWORK_RE };
const inputs = [];
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--threshold') opts.threshold = Number(argv[++i]);
  else if (a === '--grep') opts.grep = new RegExp(argv[++i]);
  else if (a === '--noise') opts.noise = argv[++i].split(',').map((s) => s.trim()).filter(Boolean);
  else if (a === '--setup-re') opts.setupRe = new RegExp(argv[++i], 'i');
  else if (a === '--network-re') opts.networkRe = new RegExp(argv[++i], 'i');
  else if (a === '--out') opts.out = argv[++i];
  else if (a === '-h' || a === '--help') usage(0);
  else inputs.push(a);
}
if (!inputs.length) usage(1);

function usage(code) {
  console.error('Usage: flaky-stats.mjs [--threshold N] [--grep RE] [--noise setup,network] [--out FILE] <phase>:<condition>=<report> | <report|dir> ...');
  process.exit(code);
}

// ---------- helpers ----------
const clean = (t = '') => String(t).replace(ANSI, '');
// Code frames ("  12 | source", "> 13 | ...", "     |    ^") quote neighbouring source lines — never classify on them.
const noFrames = (t = '') => clean(t).split('\n').filter((l) => !/^\s*>?\s*\d*\s+\|/.test(l)).join('\n');
const headline = (t = '') => clean(t).split('\n').find((l) => l.trim())?.trim().slice(0, 160) ?? '';
const pct = (n, d) => (d ? `${Math.round((n / d) * 100)}%` : '–');
const ruleOfThree = (n) => (n ? `≤~${Math.min(100, Math.round(300 / n))}%` : '');

/**
 * Classifies one failure. `head` = message + failing step (setup is judged on it only: a stack path like
 * "login.spec.ts" must not turn a real login-test failure into noise); `stack` adds frames for the rest.
 */
function signature(head, stack = '', { isSetupProject = false } = {}) {
  const t = noFrames(`${head}\n${stack}`);
  if (isSetupProject || opts.setupRe.test(noFrames(head))) return 'setup';
  if (opts.networkRe.test(t)) return 'network';
  if (TIMEOUT_RE.test(t) && !ASSERTION_RE.test(t.split('\n')[0])) return 'timeout';
  if (ASSERTION_RE.test(t)) return 'assertion';
  if (TIMEOUT_RE.test(t)) return 'timeout';
  return 'other';
}

/** Deepest failing step title — tells "failed in login" from "failed in the assertion". */
function failingStep(steps = []) {
  for (const s of steps) {
    if (s.error) return failingStep(s.steps) || s.title;
  }
  return '';
}

// ---------- parsers: both return [{ title, project, outcome, signature, message }] ----------
// A failed setup makes dependent tests "skipped / did not run": that is environment noise, not a pass.
function markSetupSkips(reps) {
  for (const r of reps) if (r.outcome === 'skipped') Object.assign(r, { outcome: 'failed', signature: 'setup', message: 'setup failed — test did not run' });
}

function* pwSpecs(suite) {
  for (const spec of suite.specs ?? []) yield spec;
  for (const child of suite.suites ?? []) yield* pwSpecs(child);
}

function parsePlaywright(report) {
  const reps = [];
  let setupFailed = false;
  for (const suite of report.suites ?? []) {
    for (const spec of pwSpecs(suite)) {
      for (const test of spec.tests ?? []) {
        const isSetupProject = test.projectName === 'setup' || /\.setup\./.test(spec.file ?? '');
        // Failed attempts: with retries a "flaky" test has them too, so its signature is still known.
        const failed = (test.results ?? []).filter((r) => !['passed', 'skipped'].includes(r.status));
        const last = failed.at(-1);
        const head = last ? [last.error?.message, failingStep(last.steps)].join('\n') : '';
        const outcome = { expected: 'passed', flaky: 'retry-flaky', skipped: 'skipped' }[test.status] ?? 'failed';
        if (isSetupProject) {
          if (outcome === 'failed') setupFailed = true;
          continue;
        }
        reps.push({
          title: spec.title,
          project: test.projectName ?? '',
          outcome,
          signature: last ? signature(head, last.error?.stack) : null,
          message: last ? headline(last.error?.message ?? last.errors?.[0]?.message) : '',
        });
      }
    }
  }
  if (setupFailed) markSetupSkips(reps);
  for (const e of report.errors ?? []) {
    reps.push({ title: '(global error)', project: '', outcome: 'failed', signature: signature(e.message, e.stack), message: headline(e.message) });
  }
  return { reps, runner: report.config?.version ? `Playwright ${report.config.version}` : 'Playwright' };
}

const xmlAttr = (tag, name) => tag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1] ?? '';
const unxml = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');

function parseJUnit(xml) {
  const reps = [];
  let setupFailed = false;
  const re = /<testcase\b([^>]*?)(\/>|>([\s\S]*?)<\/testcase>)/g;
  for (const m of xml.matchAll(re)) {
    const attrs = m[1];
    const body = m[3] ?? '';
    const name = unxml(xmlAttr(attrs, 'name'));
    const classname = unxml(xmlAttr(attrs, 'classname'));
    const fail = body.match(/<(failure|error)\b([^>]*?)(\/>|>([\s\S]*?)<\/\1>)/);
    const skipped = /<skipped\b/.test(body);
    const isSetup = /(^|[\W_])setup([\W_]|$)/i.test(classname);
    let outcome = 'passed';
    let sig = null;
    let message = '';
    if (fail) {
      outcome = 'failed';
      const msg = unxml(xmlAttr(fail[2], 'message'));
      sig = signature(msg, unxml(fail[4] ?? ''), { isSetupProject: isSetup });
      message = headline(msg || fail[4]);
    } else if (skipped) outcome = 'skipped';
    if (isSetup) {
      if (fail) setupFailed = true;
      continue;
    }
    reps.push({ title: name, project: classname, outcome, signature: sig, message });
  }
  if (setupFailed) markSetupSkips(reps);
  return { reps, runner: 'JUnit XML' };
}

function metaPath(file) {
  return file.replace(/\.(json|xml)$/i, '') + '.meta.json';
}

// ---------- aggregate ----------
const cells = new Map(); // key: title \u0000 phase \u0000 condition
const metas = [];
const phases = new Set();
const conditions = [];

// Bare paths (no "label=") are reports or dirs; their label comes from the run meta.
const isReport = (f) => /\.(json|xml)$/i.test(f) && !/\.meta\.json$/i.test(f);
function walk(dir) {
  return readdirSync(dir)
    .sort()
    .flatMap((n) => {
      const p = join(dir, n);
      if (statSync(p).isDirectory()) return n === '_local' || n.startsWith('.') ? [] : walk(p);
      return isReport(n) ? [p] : [];
    });
}
const jobs = [];
for (const input of inputs) {
  const eq = input.indexOf('=');
  if (eq >= 0) jobs.push({ label: input.slice(0, eq), file: input.slice(eq + 1) });
  else if (existsSync(input) && statSync(input).isDirectory()) for (const f of walk(input)) jobs.push({ label: null, file: f, root: input });
  else if (existsSync(input)) jobs.push({ label: null, file: input });
  else usage(1);
}

for (const { label: givenLabel, file, root } of jobs) {
  const raw = readFileSync(file, 'utf8');
  const json = /^\s*</.test(raw) ? null : JSON.parse(raw);
  if (json && !json.suites && !json._meta) continue; // not a test report (e.g. stray JSON in a scanned dir)
  const { reps, runner } = json ? parsePlaywright(json) : parseJUnit(raw);
  const meta = json?._meta ?? (existsSync(metaPath(file)) ? JSON.parse(readFileSync(metaPath(file), 'utf8')) : null);
  let label = givenLabel;
  if (!label) {
    if (!meta?.phase || !meta?.condition) {
      console.error(`${file}: no run meta — pass it as <phase>:<condition>=${file}`);
      process.exit(1);
    }
    label = `${meta.phase}:${meta.condition}`;
  }
  const [phase, condition] = label.includes(':') ? label.split(':', 2) : ['before', label];
  phases.add(phase);
  if (!conditions.includes(condition)) conditions.push(condition);
  metas.push({ phase, condition, file: root ? relative(root, file).replaceAll('\\', '/') : basename(file), runner, meta });

  for (const r of reps) {
    if (opts.grep && !opts.grep.test(r.title)) continue;
    const key = [r.title, phase, condition].join('\u0000');
    const c = cells.get(key) ?? { title: r.title, phase, condition, runs: 0, passed: 0, target: 0, noise: 0, retryFlaky: 0, skipped: 0, sigs: {}, messages: new Map() };
    if (r.outcome === 'skipped') c.skipped++;
    else {
      c.runs++;
      if (r.outcome === 'passed') c.passed++;
      else if (r.outcome === 'retry-flaky') {
        c.passed++;
        // Passed on retry after a noise failure is not evidence of flakiness in the test.
        if (opts.noise.includes(r.signature)) c.sigs[`${r.signature}(retry)`] = (c.sigs[`${r.signature}(retry)`] ?? 0) + 1;
        else c.retryFlaky++;
      } else {
        const isNoise = opts.noise.includes(r.signature);
        if (isNoise) c.noise++;
        else c.target++;
        c.sigs[r.signature] = (c.sigs[r.signature] ?? 0) + 1;
        const mk = `[${r.signature}] ${r.message}`;
        c.messages.set(mk, (c.messages.get(mk) ?? 0) + 1);
      }
    }
    cells.set(key, c);
  }
}

function classify(c) {
  const valid = c.runs - c.noise;
  if (c.runs && !valid) return 'noise-only';
  if (!valid) return 'no-data';
  if (c.target === 0 && c.retryFlaky === 0) return c.noise ? 'stable-pass (env noise)' : 'stable-pass';
  if (c.passed === 0) return 'always-fail';
  return 'FLAKY';
}

// ---------- render ----------
const out = [];
const log = (s = '') => out.push(s);

log('## Run metadata\n');
log('| Phase | Condition | Report | Runner | Commit | Dirty | Branch | Base URL | Browser | Start | End | Exit | Snapshot |');
log('|---|---|---|---|---|---|---|---|---|---|---|---|---|');
for (const m of metas) {
  const x = m.meta ?? {};
  log(`| ${m.phase} | ${m.condition} | ${m.file} | ${x.runnerVersion ?? m.runner} | ${(x.git?.sha ?? '–').slice(0, 8)} | ${x.git?.dirty ?? '–'} | ${x.git?.branch ?? '–'} | ${x.env?.BASE_URL ?? '–'} | ${x.browserVersion ?? '–'} | ${x.startedAt ?? '–'} | ${x.finishedAt ?? '–'} | ${x.exitCode ?? '–'} | ${x.snapshot?.hash?.slice(0, 8) ?? '–'} |`);
}
const shasBy = (p) => new Set(metas.filter((m) => m.phase === p && m.meta).map((m) => m.meta.git?.sha));
const notes = [];
for (const p of phases) if (shasBy(p).size > 1) notes.push(`⚠ phase "${p}" mixes ${shasBy(p).size} commits`);
if (metas.some((m) => m.meta?.git?.dirty)) notes.push('⚠ some runs were made on a dirty working tree');
const snaps = new Set(metas.filter((m) => m.meta?.snapshot?.hash).map((m) => m.meta.snapshot.hash));
for (const m of metas) if (m.meta?.snapshot?.changedDuringRun) notes.push(`⚠ ${m.file}: environment snapshot changed during the run`);
if (snaps.size > 1) notes.push(`⚠ environment snapshot differs between runs (${snaps.size} variants) — compare before trusting before/after`);
else if (snaps.size === 1) notes.push('Environment snapshot identical across all runs.');
if (metas.some((m) => !m.meta)) notes.push('Some reports have no run meta — commit/env unknown for them.');
if (notes.length) log('\n' + notes.map((n) => `- ${n}`).join('\n'));

log(`\n## Per test × condition\n`);
log(`Target = failures not in noise (${opts.noise.join(', ')}). Target % is over valid runs (runs − noise).\n`);
log('| Test | Phase | Condition | Runs | Pass | Target fail | Target % | Noise | Noise % | Retry-flaky | Signatures | Class |');
log('|---|---|---|---|---|---|---|---|---|---|---|---|');
const sorted = [...cells.values()].sort((a, b) => a.title.localeCompare(b.title) || conditions.indexOf(a.condition) - conditions.indexOf(b.condition) || a.phase.localeCompare(b.phase));
for (const c of sorted) {
  const valid = c.runs - c.noise;
  const targetPct = c.target || !valid ? pct(c.target, valid) : `0% (${ruleOfThree(valid)})`;
  const sigs = Object.entries(c.sigs).map(([k, v]) => `${k}:${v}`).join(' ') || '–';
  log(`| ${c.title} | ${c.phase} | ${c.condition} | ${c.runs} | ${c.passed} | ${c.target} | ${targetPct} | ${c.noise} | ${pct(c.noise, c.runs)} | ${c.retryFlaky} | ${sigs} | ${classify(c)} |`);
}

if (phases.has('before') && phases.has('after')) {
  log(`\n## Before / after\n`);
  log(`Fixed = 0 target failures in ≥ ${opts.threshold} valid "after" runs (per condition). Repro and negative checks are tracked separately.\n`);
  log('| Test | Condition | Before target % | After target % | After valid runs | Verdict |');
  log('|---|---|---|---|---|---|');
  const titles = [...new Set(sorted.map((c) => c.title))];
  for (const t of titles) {
    for (const cond of conditions) {
      const b = cells.get([t, 'before', cond].join('\u0000'));
      const a = cells.get([t, 'after', cond].join('\u0000'));
      if (!a) continue;
      const av = a.runs - a.noise;
      let verdict;
      if (a.target > 0) verdict = '❌ not fixed';
      else if (av >= opts.threshold) verdict = b && b.target === 0 && b.retryFlaky === 0 ? '✅ stable (was not failing before)' : '✅ fixed';
      else verdict = `… not enough runs (${av}/${opts.threshold})`;
      const bPct = b ? pct(b.target, b.runs - b.noise) : '–';
      log(`| ${t} | ${cond} | ${bPct} | ${pct(a.target, av)} | ${av} | ${verdict} |`);
    }
  }
}

const withMsgs = sorted.filter((c) => c.messages.size);
if (withMsgs.length) {
  log('\n## Failure messages\n');
  for (const c of withMsgs) {
    log(`**${c.title}** — ${c.phase}:${c.condition}`);
    for (const [msg, n] of [...c.messages].sort((x, y) => y[1] - x[1])) log(`- ${n}× \`${msg.replace(/`/g, "'")}\``);
    log('');
  }
}

const text = out.join('\n');
console.log(text);
if (opts.out) writeFileSync(opts.out, text + '\n');
