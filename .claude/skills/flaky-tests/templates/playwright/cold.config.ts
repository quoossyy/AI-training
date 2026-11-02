import { createRequire } from 'node:module';
import path from 'node:path';
import { defineConfig, type PlaywrightTestConfig } from '@playwright/test';

/**
 * Run-matrix condition "cold": a project of the repo's own config, without its warm storage state and setup.
 * Run from the repo root (the base config is taken from the current directory):
 *
 *   FLAKY_PROJECT=<project> npx playwright test -c <skill>/templates/playwright/cold.config.ts --project=flaky-cold ...
 *
 *   FLAKY_PROJECT      project of the base config to run cold (default "flaky")
 *   FLAKY_BASE_CONFIG  base config file, relative to the cwd (default playwright.config.ts)
 *
 * A stand that needs a gate cookie even for anonymous users (session link etc.): add the repro patch and
 * REPRO_CONDITION=gate REPRO_GATE_ENV=<env var with the gate URL> (repro-conditions.ts).
 */
const root = process.cwd();
const require = createRequire(path.join(root, 'noop.js'));
const loaded = require(path.resolve(root, process.env.FLAKY_BASE_CONFIG ?? 'playwright.config.ts'));
const base: PlaywrightTestConfig = loaded.default ?? loaded;

const projectName = process.env.FLAKY_PROJECT ?? 'flaky';
const project = base.projects?.find((p) => p.name === projectName);
if (!project) throw new Error(`Project "${projectName}" not found in the base config (FLAKY_PROJECT)`);

const fromRoot = (dir: string | undefined) => path.resolve(root, dir ?? '.');

export default defineConfig({
  ...base,
  // Relative paths of the base config are resolved against this file's directory otherwise.
  testDir: fromRoot(base.testDir),
  outputDir: fromRoot(base.outputDir ?? 'test-results'),
  projects: [
    {
      ...project,
      name: 'flaky-cold',
      testDir: fromRoot(project.testDir ?? base.testDir),
      use: { ...project.use, storageState: { cookies: [], origins: [] } },
      dependencies: [],
    },
  ],
});
