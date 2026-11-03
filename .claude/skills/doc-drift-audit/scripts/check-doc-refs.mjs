#!/usr/bin/env node
/* global process, console */
// Checks that what markdown docs reference actually exists in the repo:
//  - repo paths in backticks or links (`config/env.ts`, [x](docs/ONBOARDING.md))
//  - `npm run <script>` / `npm test` -> package.json scripts
//  - `npx playwright test --project=<name>` -> project names in playwright.config.*
//  - env keys written as `UPPER_CASE` that look like env vars -> .env.example
//  - "Node.js vX+" claims -> must satisfy the strictest engines.node of installed deps
// Usage: node check-doc-refs.mjs [repoDir=.] [doc.md ...]   (default: README.md + docs/**/*.md)
// Exit code 1 when a broken reference is found. Paths of gitignored/generated dirs are reported as "info".
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';

const [repoArg, ...docArgs] = process.argv.slice(2);
const repo = resolve(repoArg ?? '.');
const walk = (d) => readdirSync(d).flatMap((f) => {
  const p = join(d, f);
  return statSync(p).isDirectory() ? walk(p) : p.endsWith('.md') ? [p] : [];
});
const docs = docArgs.length
  ? docArgs.map((d) => resolve(repo, d))
  : [join(repo, 'README.md'), ...(existsSync(join(repo, 'docs')) ? walk(join(repo, 'docs')) : [])];

const pkg = JSON.parse(readFileSync(join(repo, 'package.json'), 'utf8'));
const scripts = Object.keys(pkg.scripts ?? {});
const cfgFile = ['playwright.config.ts', 'playwright.config.js', 'playwright.config.mjs'].map((f) => join(repo, f)).find(existsSync);
const projects = cfgFile ? [...readFileSync(cfgFile, 'utf8').matchAll(/name:\s*['"]([\w-]+)['"]/g)].map((m) => m[1]) : [];
const envExample = existsSync(join(repo, '.env.example'))
  ? readFileSync(join(repo, '.env.example'), 'utf8').split('\n').filter((l) => /^[A-Z0-9_]+=/.test(l)).map((l) => l.split('=')[0])
  : [];
const gitignore = existsSync(join(repo, '.gitignore')) ? readFileSync(join(repo, '.gitignore'), 'utf8') : '';
const generated = ['node_modules', 'playwright-report', 'test-results', 'playwright/.auth', 'blob-report', '.env'];

// Strictest minimum Node major.minor among installed deps
const minNode = (() => {
  let best = [0, 0], who = '';
  const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
  for (const name of Object.keys(deps)) {
    const p = join(repo, 'node_modules', name, 'package.json');
    if (!existsSync(p)) continue;
    const eng = JSON.parse(readFileSync(p, 'utf8')).engines?.node;
    if (!eng) continue;
    // lowest allowed version of the range = first comparator of the first alternative
    const m = eng.split('||')[0].match(/(\d+)(?:\.(\d+))?/);
    if (!m) continue;
    const v = [Number(m[1]), Number(m[2] ?? 0)];
    if (v[0] > best[0] || (v[0] === best[0] && v[1] > best[1])) { best = v; who = `${name} (${eng.trim()})`; }
  }
  return { v: best, who };
})();

const results = [];
const add = (level, doc, line, msg) => results.push({ level, doc: doc.replace(repo + '\\', '').replace(repo + '/', ''), line, msg });

// Names that look like paths but are not: npm packages (incl. subpath imports) and git branches.
const isPackage = (s) => {
  const parts = s.split('/');
  const name = s.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
  return existsSync(join(repo, 'node_modules', name, 'package.json'));
};
const branches = new Set(
  (() => { try { return execSync('git branch -a --format=%(refname:short)', { cwd: repo, encoding: 'utf8' }).split('\n').map((b) => b.trim().replace(/^origin\/|^upstream\//, '')).filter(Boolean); } catch { return []; } })(),
);

for (const doc of docs) {
  if (!existsSync(doc)) { add('ERROR', doc, 0, 'doc file does not exist'); continue; }
  // A changelog describes the past: missing paths and removed env vars are expected there.
  const historical = /(^|[\\/])(CHANGELOG|HISTORY|CHANGES)[^\\/]*\.md$/i.test(doc);
  const text = readFileSync(doc, 'utf8').split('\n');
  let inTree = false;
  text.forEach((raw, i) => {
    const n = i + 1;
    if (/^```/.test(raw)) inTree = false;
    if (/[├└]──/.test(raw)) inTree = true;
    // Tree diagrams are checked separately by name, skip path extraction there
    const candidates = new Set();
    for (const m of raw.matchAll(/`([^`\s]+)`/g)) candidates.add(m[1]);
    for (const m of raw.matchAll(/\]\(([^)#\s]+)(#[^)]*)?\)/g)) if (!/^https?:/.test(m[1])) candidates.add(m[1]);
    for (const c of candidates) {
      const clean = c.replace(/[),.:;]+$/, '');
      if (!/^\.?[\w@.-]+(\/[\w@.*-]+)+\/?$|^[\w.-]+\.(ts|js|mjs|json|md|yml|yaml|jsonc)$/.test(clean)) continue;
      if (clean.includes('*') || clean.startsWith('/dk') || clean.startsWith('/app')) continue;
      const rel = clean.startsWith('.') && !clean.startsWith('./') && !clean.startsWith('../') ? clean : clean;
      const abs = [resolve(repo, rel), resolve(dirname(doc), rel)].find(existsSync);
      if (abs) continue;
      if (!clean.includes('/')) {
        // bare file name: fine if it exists anywhere in the repo, otherwise it may be a runtime artefact
        if (walkAll(repo).some((p) => p.endsWith('/' + clean) || p.endsWith('\\' + clean))) continue;
        add('info', doc, n, `file name \`${clean}\` not found in repo (generated at runtime?)`);
        continue;
      }
      if (isPackage(clean) || branches.has(clean)) continue;
      if (generated.some((g) => rel.replace(/^\.\//, '').startsWith(g)) || gitignore.includes(rel.split('/')[0])) {
        add('info', doc, n, `\`${clean}\` is generated/gitignored (not in a clean clone)`);
      } else if (historical) add('info', doc, n, `historical path \`${clean}\` (no longer in repo)`);
      else add('ERROR', doc, n, `path \`${clean}\` does not exist`);
    }
    for (const m of raw.matchAll(/npm run ([\w:-]+)/g)) if (!scripts.includes(m[1])) add('ERROR', doc, n, `npm script "${m[1]}" is not in package.json`);
    if (/\bnpm test\b/.test(raw) && !scripts.includes('test')) add('ERROR', doc, n, 'npm test: no "test" script');
    for (const m of raw.matchAll(/--project[= ]([\w-]+)/g)) if (!projects.includes(m[1])) add('ERROR', doc, n, `playwright project "${m[1]}" is not in ${cfgFile ? 'playwright config' : 'any config'}`);
    for (const m of raw.matchAll(/`([A-Z][A-Z0-9]*_[A-Z0-9_]+)`/g)) {
      const k = m[1];
      if (/_STORAGE_STATE$|_FILE$/.test(k)) continue; // code constants, not env vars
      if (envExample.length && !envExample.includes(k) && !['CI'].includes(k)) add(historical ? 'info' : 'WARN', doc, n, `\`${k}\` looks like an env var but is not in .env.example`);
    }
    const nodeClaim = raw.match(/Node(?:\.js)?\*{0,2}\s*v?(\d+)(?:\.(\d+))?(?:\.\d+)?\s*\+/i);
    if (nodeClaim) {
      const claim = [Number(nodeClaim[1]), Number(nodeClaim[2] ?? 0)];
      if (claim[0] < minNode.v[0] || (claim[0] === minNode.v[0] && claim[1] < minNode.v[1])) {
        add('ERROR', doc, n, `claims Node ${claim.join('.')}+ but ${minNode.who} needs at least ${minNode.v.join('.')}`);
      }
    }
    // Tree entries: leaf names must exist somewhere in the repo
    if (inTree) {
      const m = raw.match(/[├└]──\s+([\w.@-]+\/?)/);
      if (m) {
        const name = m[1].replace(/\/$/, '');
        const found = existsSync(join(repo, name)) || walkAll(repo).some((p) => p.endsWith('/' + name) || p.endsWith('\\' + name));
        if (!found && !generated.some((g) => g.endsWith(name))) add('ERROR', doc, n, `tree entry "${name}" not found in repo`);
      }
    }
  });
}

function walkAll(d) {
  if (walkAll.cache) return walkAll.cache;
  const acc = [];
  const rec = (x) => {
    for (const f of readdirSync(x)) {
      if (['node_modules', '.git'].includes(f)) continue;
      const p = join(x, f);
      acc.push(p);
      if (statSync(p).isDirectory()) rec(p);
    }
  };
  rec(d);
  return (walkAll.cache = acc);
}

console.log(`# check-doc-refs: ${docs.length} doc(s), scripts=[${scripts}], projects=[${projects}], min Node=${minNode.v.join('.')} (${minNode.who})\n`);
for (const r of results) console.log(`${r.level.padEnd(5)} ${r.doc}:${r.line}  ${r.msg}`);
const errors = results.filter((r) => r.level === 'ERROR').length;
console.log(`\n${errors} error(s), ${results.filter((r) => r.level === 'WARN').length} warning(s), ${results.filter((r) => r.level === 'info').length} info`);
process.exit(errors ? 1 : 0);
