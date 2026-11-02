#!/usr/bin/env node
// Runs one condition of the flaky-run matrix and records what it ran on. No dependencies.
//
// Usage:
//   node run-condition.mjs <phase> <condition> [options] -- <test command ...>
//
// The test command is runner-specific (take it from the project profile). The report path is handed to it as
//   - the {report} placeholder anywhere in the command, e.g.  pytest --junitxml={report}
//   - env FLAKY_REPORT, and for --format json also PLAYWRIGHT_JSON_OUTPUT_NAME,
//     for --format junit also PLAYWRIGHT_JUNIT_OUTPUT_NAME / JEST_JUNIT_OUTPUT_FILE.
//
// Writes into --out-dir:
//   <date>_<phase>_<condition>[_<block>].<json|xml>   the report produced by the runner
//   ....log                                          runner stdout+stderr
//   ....meta.json                                    commit, branch, dirty, env vars, versions, times, exit code, snapshot
//
// Options:
//   --out-dir DIR           default deliverables/flaky/runs
//   --format json|junit     report format (default json)
//   --block ID              suffix for alternating before/after blocks (1, 2, ...)
//   --meta-env A,B          env vars to record in meta (values only of these; never secrets). Default BASE_URL
//   --env-file FILE         read KEY=VALUE pairs for --meta-env from it if unset in env (default .env if present)
//   --version-cmd CMD       runner version command, e.g. "npx playwright --version"
//   --browser-cmd CMD       browser version command (prints a version string)
//   --snapshot-cmd CMD      prints the environment/data snapshot (catalogue etc.); stored + sha256-hashed
//   --cwd DIR               where to run (default current dir; must be inside the git repo)
//
// Exit code: 0 when a report was produced (test failures are data, see meta.exitCode), 2 otherwise.
/* global process, console */
import { spawn, execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const argv = process.argv.slice(2);
const sep = argv.indexOf('--');
if (sep < 2) {
  console.error('Usage: run-condition.mjs <phase> <condition> [options] -- <test command ...>');
  process.exit(2);
}
const [phase, condition, ...rest] = argv.slice(0, sep);
const command = argv.slice(sep + 1);
if (!command.length) {
  console.error('Missing test command after --');
  process.exit(2);
}

const opts = { outDir: 'deliverables/flaky/runs', format: 'json', block: '', metaEnv: ['BASE_URL'], envFile: '.env', versionCmd: '', browserCmd: '', snapshotCmd: '', cwd: process.cwd() };
for (let i = 0; i < rest.length; i++) {
  const a = rest[i];
  const v = () => rest[++i];
  if (a === '--out-dir') opts.outDir = v();
  else if (a === '--format') opts.format = v();
  else if (a === '--block') opts.block = v();
  else if (a === '--meta-env') opts.metaEnv = v().split(',').map((s) => s.trim()).filter(Boolean);
  else if (a === '--env-file') opts.envFile = v();
  else if (a === '--version-cmd') opts.versionCmd = v();
  else if (a === '--browser-cmd') opts.browserCmd = v();
  else if (a === '--snapshot-cmd') opts.snapshotCmd = v();
  else if (a === '--cwd') opts.cwd = resolve(v());
  else {
    console.error(`Unknown option ${a}`);
    process.exit(2);
  }
}
if (!/^[\w.-]+$/.test(phase) || !/^[\w.-]+$/.test(condition) || !/^[\w.-]*$/.test(opts.block)) {
  console.error('phase, condition and block may contain only letters, digits, "_", "-", "."');
  process.exit(2);
}

const sh = (cmd) => {
  try {
    return execSync(cmd, { cwd: opts.cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  } catch (e) {
    return `ERROR: ${(e.stderr || e.message).toString().trim().split('\n')[0]}`;
  }
};

function readEnvFile(file) {
  const path = resolve(opts.cwd, file);
  if (!existsSync(path)) return {};
  const vars = {};
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][\w]*)\s*=\s*(.*)\s*$/);
    if (m) vars[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  return vars;
}

const date = new Date().toISOString().slice(0, 10);
const ext = opts.format === 'junit' ? 'xml' : 'json';
const base = [date, phase, condition, opts.block].filter(Boolean).join('_');
const outDir = resolve(opts.cwd, opts.outDir);
mkdirSync(outDir, { recursive: true });
const reportPath = join(outDir, `${base}.${ext}`);
const logPath = join(outDir, `${base}.log`);
const metaPath = join(outDir, `${base}.meta.json`);
if (existsSync(reportPath)) {
  console.error(`${reportPath} already exists — pass a different --block, refusing to overwrite raw data.`);
  process.exit(2);
}

const fileEnv = readEnvFile(opts.envFile);
const recordedEnv = Object.fromEntries(opts.metaEnv.map((k) => [k, process.env[k] ?? fileEnv[k] ?? null]));

const env = { ...process.env, FLAKY_REPORT: reportPath };
if (opts.format === 'json') env.PLAYWRIGHT_JSON_OUTPUT_NAME = reportPath;
else {
  env.PLAYWRIGHT_JUNIT_OUTPUT_NAME = reportPath;
  env.JEST_JUNIT_OUTPUT_FILE = reportPath;
}

const quote = (s) => (/^[\w@%+=:,./\\-]+$/.test(s) ? s : `"${s.replace(/"/g, '\\"')}"`);
const cmdLine = command.map((a) => a.replaceAll('{report}', reportPath)).map(quote).join(' ');

const meta = {
  phase,
  condition,
  block: opts.block || null,
  command: cmdLine,
  cwd: opts.cwd,
  git: {
    sha: sh('git rev-parse HEAD'),
    branch: sh('git rev-parse --abbrev-ref HEAD'),
    dirty: sh('git status --porcelain --untracked-files=no') !== '',
    dirtyFiles: sh('git status --porcelain --untracked-files=no').split('\n').filter(Boolean),
  },
  env: recordedEnv,
  runnerVersion: opts.versionCmd ? sh(opts.versionCmd) : null,
  browserVersion: opts.browserCmd ? sh(opts.browserCmd) : null,
  host: { platform: process.platform, node: process.version, cpus: (await import('node:os')).cpus().length },
  startedAt: new Date().toISOString(),
};

const snapBefore = opts.snapshotCmd ? sh(opts.snapshotCmd) : '';
console.log(`[run-condition] ${phase}/${condition}${opts.block ? `/${opts.block}` : ''}: ${cmdLine}`);
const log = createWriteStream(logPath);
const child = spawn(cmdLine, { cwd: opts.cwd, env, shell: true, stdio: ['inherit', 'pipe', 'pipe'] });
child.stdout.on('data', (d) => (process.stdout.write(d), log.write(d)));
child.stderr.on('data', (d) => (process.stderr.write(d), log.write(d)));
const exitCode = await new Promise((res) => child.on('close', res));
log.end();

meta.finishedAt = new Date().toISOString();
meta.exitCode = exitCode;
if (opts.snapshotCmd) {
  const after = sh(opts.snapshotCmd);
  const hash = (s) => createHash('sha256').update(s).digest('hex');
  // Taken before and after the run: a change means the environment moved under the tests.
  meta.snapshot = { command: opts.snapshotCmd, hash: hash(after), changedDuringRun: hash(after) !== hash(snapBefore), content: after };
  if (meta.snapshot.changedDuringRun) meta.snapshot.contentBefore = snapBefore;
}
meta.report = existsSync(reportPath) ? reportPath : null;
writeFileSync(metaPath, JSON.stringify(meta, null, 2) + '\n');

console.log(`[run-condition] exit ${exitCode}; report ${meta.report ?? 'MISSING'}; meta ${metaPath}`);
process.exit(meta.report ? 0 : 2);
