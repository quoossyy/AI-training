#!/usr/bin/env node
/* global process, console */
// Collects the "reality" side of a docs-vs-code audit into one markdown file:
// tracked file tree, package scripts, declared deps with installed versions and engines,
// effective Node requirement, CI workflow steps, env example keys, recent git history.
// Usage: node collect-facts.mjs [repoDir=.] [--out facts.md] [--since "3 months ago"]
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 ? args.splice(i, 2)[1] : def;
};
const out = opt('--out', null);
const since = opt('--since', '6 months ago');
const repo = resolve(args[0] ?? '.');

const sh = (cmd) => {
  try {
    return execSync(cmd, { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
};
const readJson = (p) => {
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
};
const lines = [];
const h = (t) => lines.push('', `## ${t}`, '');

lines.push(`# Facts: ${repo.split(/[\\/]/).pop()}`, '');
lines.push(`Collected: ${new Date().toISOString()} · HEAD: ${sh('git rev-parse --short HEAD') || 'n/a'} (${sh('git rev-parse --abbrev-ref HEAD') || 'n/a'})`);

// 1. Tracked files
h('Tracked files (git ls-files)');
// Never hide files here: a missing lockfile in this list once read as "npm ci will fail in CI".
const files = (sh('git ls-files') || '').split('\n').filter(Boolean);
lines.push('```', ...files, '```');

// 1b. Key config files verbatim: without them every config claim of the docs is "cannot verify".
const CONFIG_RE = /(^|\/)(playwright|vitest|jest|cypress|wdio)\.config\.\w+$|(^|\/)tsconfig[\w.-]*\.json$|(^|\/)eslint\.config\.\w+$|(^|\/)\.eslintrc[\w.]*$|^\.gitignore$|^\.env\.example$|^fixtures\/index\.\w+$|^\.github\/workflows\/[\w.-]+\.ya?ml$|^\.gitlab-ci\.yml$/;
for (const f of files.filter((x) => CONFIG_RE.test(x))) {
  h(`Config (verbatim): ${f}`);
  const ext = f.split('.').pop();
  lines.push('```' + ({ ts: 'ts', js: 'js', mjs: 'js', json: 'json', yml: 'yaml', yaml: 'yaml' }[ext] ?? ''), readFileSync(join(repo, f), 'utf8').trimEnd(), '```');
}

// 2. package.json
const pkg = readJson(join(repo, 'package.json'));
if (pkg) {
  h('package.json scripts');
  lines.push('| Script | Command |', '|---|---|');
  for (const [k, v] of Object.entries(pkg.scripts ?? {})) lines.push(`| \`${k}\` | \`${v}\` |`);

  h('Dependencies: declared, installed, engines.node');
  lines.push('| Package | Declared | Installed | engines.node |', '|---|---|---|---|');
  const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
  const engines = [];
  for (const [name, range] of Object.entries(deps)) {
    const inst = readJson(join(repo, 'node_modules', name, 'package.json'));
    const eng = inst?.engines?.node ?? '';
    if (eng) engines.push(`${name}: ${eng}`);
    lines.push(`| ${name} | ${range} | ${inst?.version ?? 'not installed'} | ${eng || '—'} |`);
  }
  h('Node requirement');
  lines.push(`- package.json engines.node: ${pkg.engines?.node ?? 'not declared'}`);
  lines.push(`- .nvmrc / .node-version: ${['.nvmrc', '.node-version'].map((f) => existsSync(join(repo, f)) ? `${f}=${readFileSync(join(repo, f), 'utf8').trim()}` : null).filter(Boolean).join(', ') || 'none'}`);
  lines.push('- Strictest engines among dependencies (the docs must not promise less):');
  for (const e of engines) lines.push(`  - ${e}`);
  lines.push(`- Local node: ${process.version}`);
}

// 3. CI workflows
const wfDir = join(repo, '.github', 'workflows');
if (existsSync(wfDir)) {
  for (const f of readdirSync(wfDir).filter((x) => /\.ya?ml$/.test(x))) {
    h(`CI: .github/workflows/${f} (run/uses/secrets lines)`);
    const src = readFileSync(join(wfDir, f), 'utf8').split('\n');
    lines.push('```');
    src.forEach((l, i) => {
      if (/\b(run|uses|node-version|name):|secrets\.|if:/.test(l)) lines.push(`${String(i + 1).padStart(3)}: ${l.trim()}`);
    });
    lines.push('```');
  }
}

// 4. Env example
for (const f of ['.env.example', '.env.sample', '.env.template']) {
  if (existsSync(join(repo, f))) {
    h(`Env keys (${f})`);
    const keys = readFileSync(join(repo, f), 'utf8').split('\n').filter((l) => /^\s*[A-Z0-9_]+\s*=/.test(l)).map((l) => l.split('=')[0].trim());
    lines.push(keys.map((k) => `\`${k}\``).join(', '));
  }
}

// 5. process.env usages in code (what the code actually reads)
h('process.env keys read by code');
const envUse = sh('git grep -ohE "process\\.env(\\.[A-Z0-9_]+|\\[[^]]+\\])" -- "*.ts" "*.js" "*.mjs"');
const viaRequired = sh('git grep -ohE "required\\(\'[A-Z0-9_]+\'\\)" -- "*.ts" "*.js"');
lines.push([...new Set([...envUse.split('\n'), ...viaRequired.split('\n')].filter(Boolean))].map((k) => `\`${k}\``).join(', ') || 'none');

// 6. Exported classes/functions per top-level dir (key classes)
h('Exported symbols (key classes and functions)');
const exp = sh('git grep -nE "^export (default )?(abstract )?(class|function|const|type|interface) [A-Za-z0-9_]+" -- "*.ts" "*.js" "*.mjs"');
lines.push('```', ...exp.split('\n').map((l) => l.replace(/\{.*$/, '').trim()), '```');

// 7. Git history
h(`Git history since ${since}`);
lines.push('```', sh(`git log --since="${since}" --date=short --format="%h %ad %s"`) || 'n/a', '```');
h('Files changed per commit (--stat, last 10)');
lines.push('```', sh('git log -10 --date=short --format="--- %h %ad %s" --stat=100'), '```');

const md = lines.join('\n') + '\n';
if (out) {
  writeFileSync(out, md);
  console.log(`facts written to ${out}`);
} else process.stdout.write(md);
