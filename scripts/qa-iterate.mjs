import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  readFileSync,
  mkdirSync,
  writeFileSync,
  openSync,
  closeSync,
} from 'node:fs';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { randomUUID, createHash } from 'node:crypto';
import { qaWorkflowSession, requireFreePorts } from '../tools/qa-session.mjs';
import {
  qaPreflight,
  formatPreflight,
  qaBrowserEnvironment,
} from '../tools/qa-preflight.mjs';
import { QaCompilerWatch } from '../tools/qa-compiler-watch.mjs';
import {
  IterationLease,
  iterationSnapshot,
} from '../tools/qa-iteration-state.mjs';
import { startIterationService } from '../tools/qa-iteration-service.mjs';
import { createRequire } from 'node:module';
import { costPoint, costSince } from '../tools/qa-cost-profile.mjs';
import { requireQaCheckoutReady } from '../tools/qa-checkout-state.mjs';
import { preparedObservation } from '../tools/qa-prepared-observation.mjs';
import { QaPreviewBuild } from '../tools/qa-preview-build.mjs';
import {
  previewInputPaths,
  previewInputFingerprint,
} from '../tools/qa-preview-inputs.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
if (resolve('.') !== resolve(root))
  throw Error('Run qa:iterate from the checkout root');
const args = process.argv.slice(2);
const cold = args.includes('--cold');
const profiling = args.includes('--profile');
const usePreparedObservation = args.includes('--prepared-observation');
const planIndex = args.indexOf('--plan');
const modeIndex = args.indexOf('--client-mode');
const clientMode = modeIndex < 0 ? 'development' : args[modeIndex + 1];
if (
  args.some(
    (x, i) =>
      x !== '--cold' &&
      x !== '--profile' &&
      x !== '--prepared-observation' &&
      x !== '--client-mode' &&
      x !== '--plan' &&
      !(planIndex >= 0 && i === planIndex + 1) &&
      !(modeIndex >= 0 && i === modeIndex + 1),
  ) ||
  (planIndex >= 0 && !args[planIndex + 1]) ||
  args.filter((x) => x === '--plan').length > 1 ||
  args.filter((x) => x === '--client-mode').length > 1 ||
  !['development', 'preview'].includes(clientMode)
)
  throw Error(
    'Usage: qa:iterate [--cold] [--profile] [--prepared-observation] [--client-mode development|preview] [--plan rounds.json]',
  );
const plan =
  planIndex >= 0 ? JSON.parse(readFileSync(args[planIndex + 1], 'utf8')) : null;
if (plan && (!Array.isArray(plan) || !plan.length))
  throw Error('Plan must be a nonempty array of rounds');
const config = 'playwright.qa-iteration.config.ts';
process.env.VOLAM_QA_RUN_ID = randomUUID();
process.env.VOLAM_QA_SERVER_PORT ??= '2886';
process.env.VOLAM_QA_CLIENT_PORT ??= '5486';
process.env.VITE_SERVER_URL ??= `http://127.0.0.1:${process.env.VOLAM_QA_SERVER_PORT}`;
for (const name of [
  'VOLAM_RUNTIME_PUBLIC_DIR',
  'VOLAM_QA_ITERATION_RUN_ID',
  'VOLAM_QA_ITERATION_CLIENT_MODE',
  'VOLAM_QA_ITERATION_CLIENT_DIST',
])
  if (process.env[name])
    throw Error(`${name} is not supported by this owned iteration entrypoint`);
const session = qaWorkflowSession('browser', ['--config', config]);
const directory = resolve(
  'docs/evidence/sessions',
  process.env.VOLAM_QA_SESSION ?? `qa-iterate-${session.runId}`,
);
mkdirSync(directory, { recursive: true });
const report = {
  runId: session.runId,
  mode: cold ? 'cold' : 'owned-reuse',
  startedAt: new Date().toISOString(),
  status: 'RUNNING',
  profiling,
  clientMode,
  preparedObservation: usePreparedObservation,
  rounds: [],
};
const save = () =>
  writeFileSync(
    resolve(directory, 'iteration.json'),
    JSON.stringify(report, null, 2) + '\n',
  );
let activeRound;
const observe = profiling
  ? (data) => activeRound?.hashCosts.push(data)
  : undefined;
const compiler = new QaCompilerWatch(
  root,
  resolve(directory, 'compiler.log'),
  observe,
);
const lease = new IterationLease();
const require = createRequire(import.meta.url);
const preview =
  clientMode === 'preview'
    ? new QaPreviewBuild(
        root,
        session.serverUrl,
        async (output) => {
          const pkg = require.resolve('vite/package.json');
          const command = resolve(
            dirname(pkg),
            JSON.parse(readFileSync(pkg, 'utf8')).bin.vite,
          );
          await run(
            command,
            ['build', '--outDir', output, '--emptyOutDir'],
            process.env,
            resolve(directory, `preview-build-${activeRound.index}.log`),
            false,
            resolve('apps/game-client'),
          );
        },
        observe,
      )
    : undefined;
let active;
async function run(
  script,
  params,
  env,
  log,
  preload = false,
  cwd = root,
  prepared = false,
) {
  const fd = openSync(log, 'wx');
  try {
    active = spawn(
      process.execPath,
      [
        ...(preload
          ? [
              '--import',
              pathToFileURL(resolve('tools/qa-cost-preload.mjs')).href,
            ]
          : []),
        ...(prepared
          ? [
              '--import',
              pathToFileURL(resolve('tools/qa-prepared-preload.mjs')).href,
            ]
          : []),
        script,
        ...params,
      ],
      {
        cwd,
        env,
        stdio: ['ignore', fd, fd],
        windowsHide: true,
      },
    );
    return await new Promise((done, reject) => {
      active.once('error', reject);
      active.once('exit', (code, signal) =>
        code === 0
          ? done()
          : reject(Error(`Command failed (${code ?? signal}); ${log}`)),
      );
    });
  } finally {
    active = undefined;
    closeSync(fd);
  }
}
const stop = async () => {
  const results = await Promise.allSettled([lease.close(), compiler.close()]);
  const errors = results
    .filter((r) => r.status === 'rejected')
    .map((r) => r.reason);
  try {
    await preview?.close();
  } catch (error) {
    errors.push(error);
  }
  if (errors.length)
    throw new AggregateError(errors, 'Iteration cleanup failed');
};
let interrupted = false;
for (const signal of ['SIGINT', 'SIGTERM'])
  process.once(signal, () => {
    interrupted = true;
    if (active) active.kill('SIGTERM');
    void stop().finally(() => process.exit(1));
  });
const started = performance.now();
save();
try {
  report.checkout = requireQaCheckoutReady(root);
  const preflight = await qaPreflight({
    mode: 'browser',
    args: ['--config', config],
  });
  report.preflight = preflight;
  console.log(formatPreflight(preflight));
  if (preflight.status !== 'PASS') throw Error('Iteration preflight failed');
  async function round(options) {
    if (interrupted) throw Error('Iteration interrupted');
    if (
      !options ||
      Object.keys(options).some((k) => !['grep', 'test'].includes(k)) ||
      typeof options.grep !== 'string' ||
      !options.grep ||
      options.grep.length > 500 ||
      !['smoke', 'gameplay'].includes(options.test ?? 'smoke')
    )
      throw Error(
        'Round requires {"grep":"explicit test filter","test":"smoke"|"gameplay"}; no config/fixture overrides',
      );
    const index = report.rounds.length;
    const entry = { index, options, status: 'RUNNING' };
    if (profiling) {
      entry.hashCosts = [];
      entry.lifecycleCosts = [];
    }
    activeRound = entry;
    const timed = async (label, action) => {
      const before = costPoint();
      try {
        return await action();
      } finally {
        if (profiling)
          entry.lifecycleCosts.push({ label, ...costSince(before) });
      }
    };
    report.rounds.push(entry);
    save();
    const t = performance.now();
    try {
      entry.checkout = requireQaCheckoutReady(root);
      if (cold) await stop();
      entry.preflight = await qaPreflight({ mode: 'quick' });
      if (entry.preflight.status !== 'PASS')
        throw Error('Fresh iteration installation preflight failed');
      const prep = performance.now();
      const preparationNonce = randomUUID();
      const preparationPath = resolve(
        directory,
        `prepared-observation-${index}.json`,
      );
      // Always rerun asset guards/preparation. No prepared-art cache or approval reuse.
      await run(
        'scripts/prepare-assets.mjs',
        [],
        {
          ...process.env,
          ...(profiling
            ? {
                VOLAM_QA_COST_OUTPUT: resolve(
                  directory,
                  `prepare-cost-${index}.json`,
                ),
              }
            : {}),
          ...(usePreparedObservation
            ? {
                VOLAM_QA_PREPARED_OUTPUT: preparationPath,
                VOLAM_QA_PREPARED_NONCE: preparationNonce,
              }
            : {}),
        },
        resolve(directory, `prepare-${index}.log`),
        profiling,
        root,
        usePreparedObservation,
      );
      if (profiling)
        entry.preparationCost = JSON.parse(
          readFileSync(
            resolve(directory, `prepare-cost-${index}.json`),
            'utf8',
          ),
        );
      entry.prepareSeconds = (performance.now() - prep) / 1000;
      const compile = performance.now();
      entry.compiler = await compiler.ensure();
      entry.compileSeconds = (performance.now() - compile) / 1000;
      let preparation = usePreparedObservation
        ? preparedObservation(
            root,
            JSON.parse(readFileSync(preparationPath, 'utf8')),
            preparationNonce,
          )
        : undefined;
      if (preparation) entry.preparedOutputs = preparation.outputs;
      const protocol = await import(
        '../packages/game-protocol/dist/index.js?' + randomUUID()
      );
      const sourceFingerprint = () => {
        const observation = preparation;
        preparation = undefined;
        return iterationSnapshot(root, 'service', observe, observation);
      };
      const combine = (source, output) =>
        createHash('sha256')
          .update(JSON.stringify({ source, output, clientMode }))
          .digest('hex');
      let firstPreviewFingerprint;
      const previewPaths = preview ? previewInputPaths(root) : undefined;
      const previewSources = () =>
        previewInputFingerprint(root, previewPaths, observe);
      if (preview) {
        const source = combine(sourceFingerprint(), previewSources());
        entry.previewInputPaths = previewPaths;
        entry.previewBuild = await preview.ensure(source);
        firstPreviewFingerprint = combine(source, entry.previewBuild.output);
      }
      const fingerprint = () => {
        if (!preview) return sourceFingerprint();
        if (firstPreviewFingerprint) {
          const value = firstPreviewFingerprint;
          firstPreviewFingerprint = undefined;
          return value;
        }
        return combine(
          combine(sourceFingerprint(), previewSources()),
          preview.snapshot(),
        );
      };
      const result = await lease.round({
        fingerprint,
        start: () =>
          timed('start owned services', () =>
            startIterationService(
              session,
              directory,
              protocol.PROTOCOL_VERSION,
              {
                profiling,
                clientMode,
                clientDist: entry.previewBuild?.directory,
              },
            ),
          ),
        verify: async (service) => {
          if (
            !compiler.receipt ||
            compiler.receipt.input !==
              iterationSnapshot(root, 'input', observe) ||
            compiler.receipt.output !==
              iterationSnapshot(root, 'output', observe)
          )
            throw Error(
              'Compiler receipt changed or unavailable during iteration',
            );
          await timed('verify owned HTTP identity', () => service.verify());
        },
        reset: (service) =>
          timed('reset owned rooms and sockets', () => service.reset()),
        execute: async (service) => {
          const checkout = requireQaCheckoutReady(root);
          if (checkout.head !== entry.checkout.head)
            throw Error(
              'QA HEAD changed before browser execution; start a fresh round on the new baseline',
            );
          entry.service = { runId: service.runId, pid: service.pid };
          const browserStart = performance.now();
          await run(
            require.resolve('@playwright/test/cli'),
            [
              'test',
              '--config',
              config,
              options.test === 'gameplay'
                ? 'tests/e2e/gameplay.spec.ts'
                : 'tests/e2e/qa-iteration.spec.ts',
              '--grep',
              options.grep,
              profiling
                ? '--reporter=line,./tools/qa-cost-reporter.mjs'
                : '--reporter=line',
              '--output',
              resolve('artifacts', session.runId, `round-${index}`),
            ],
            qaBrowserEnvironment({
              ...process.env,
              VOLAM_QA_ITERATION_RUN_ID: service.runId,
              ...(profiling
                ? {
                    VOLAM_QA_BROWSER_COST_OUTPUT: resolve(
                      directory,
                      `browser-cost-${index}.json`,
                    ),
                    VOLAM_QA_BROWSER_SPAWNED_AT: String(Date.now()),
                  }
                : {}),
            }),
            resolve(directory, `browser-${index}.log`),
          );
          if (profiling) {
            entry.browserCost = JSON.parse(
              readFileSync(
                resolve(directory, `browser-cost-${index}.json`),
                'utf8',
              ),
            );
            if (entry.browserCost.status !== 'passed')
              throw Error('Browser cost receipt did not report passed tests');
          }
          return { seconds: (performance.now() - browserStart) / 1000 };
        },
      });
      Object.assign(entry, result, { status: 'PASS' });
    } catch (error) {
      entry.status = 'FAIL';
      entry.error = String(error);
      throw error;
    } finally {
      entry.seconds = (performance.now() - t) / 1000;
      activeRound = undefined;
      save();
      console.log(
        `[iterate] round ${index}: ${entry.status}, ${entry.seconds.toFixed(2)}s, service reused=${entry.reused ?? false}`,
      );
    }
  }
  if (plan) for (const item of plan) await round(item);
  else {
    console.log(
      '[iterate] Awaiting round JSON lines; EOF closes this owned session.',
    );
    for await (const line of createInterface({
      input: process.stdin,
      crlfDelay: Infinity,
    }))
      if (line.trim()) await round(JSON.parse(line));
  }
  if (!report.rounds.length) throw Error('No iteration rounds requested');
  report.status = 'PASS';
} catch (error) {
  report.status = 'FAIL';
  report.error = String(error);
  process.exitCode = 1;
  console.error(error);
} finally {
  try {
    await stop();
    await requireFreePorts(session);
    report.cleanup = 'PASS';
  } catch (error) {
    report.cleanup = 'FAIL';
    report.status = 'FAIL';
    report.cleanupError = String(error);
    process.exitCode = 1;
  }
  report.seconds = (performance.now() - started) / 1000;
  save();
  console.log(
    `[iterate] ${report.status}; ${resolve(directory, 'iteration.json')}`,
  );
}
