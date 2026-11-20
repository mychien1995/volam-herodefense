import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import {
  qaWorkflowSession,
  requireFreePorts,
  requireQaPorts,
  qaManagedProfile,
} from './qa-session.mjs';

const repository = fileURLToPath(new URL('../', import.meta.url));

/** Keep browser discovery identical to the Playwright wrapper, including overrides. */
export function qaBrowserEnvironment(env = process.env, root = repository) {
  return {
    ...env,
    PLAYWRIGHT_BROWSERS_PATH:
      env.PLAYWRIGHT_BROWSERS_PATH === '0'
        ? '0'
        : resolve(root, env.PLAYWRIGHT_BROWSERS_PATH ?? '.cache/ms-playwright'),
  };
}

export function supportsNode(version, range) {
  const actual = version.replace(/^v/, '').split('.').map(Number);
  return range.split(/\s*\|\|\s*/).some((part) => {
    const match = /^(\^|>=)(\d+)\.(\d+)\.(\d+)$/.exec(part);
    if (!match) throw Error(`Unsupported Node engine range: ${part}`);
    const minimum = match.slice(2).map(Number);
    const comparison = actual.reduce(
      (result, value, i) => result || Math.sign(value - minimum[i]),
      0,
    );
    return comparison >= 0 && (match[1] === '>=' || actual[0] === minimum[0]);
  });
}

// Explicit audited contracts include legacy ports, fixture ports and browser channels.
export function managedQaProfile(mode, args = []) {
  return qaManagedProfile(mode, args) !== null;
}

export function verifyQaBuild(root, session) {
  const contract = session.contract;
  const clientOnly = contract?.services.every(
    (service) => service.serverPort === undefined,
  );
  if (contract?.clientMode === 'static')
    return { client: 'static review; no game build consumed' };
  if (clientOnly) {
    if (!existsSync(resolve(root, 'apps/game-client/dist/index.html')))
      throw Error('Missing built preview client');
    return { client: 'preview-only; no game server consumed' };
  }
  if (!existsSync(resolve(root, 'apps/game-server/dist/app.config.js')))
    throw Error('Missing compiled server application');
  const source = readFileSync(
    resolve(root, 'packages/game-protocol/src/index.ts'),
    'utf8',
  );
  const compiled = readFileSync(
    resolve(root, 'packages/game-protocol/dist/index.js'),
    'utf8',
  );
  const version = (text) => /PROTOCOL_VERSION\s*=\s*(\d+)/.exec(text)?.[1];
  if (!version(source) || version(source) !== version(compiled))
    throw Error('Compiled/source protocol mismatch');
  if (contract?.clientMode === 'development')
    return {
      protocol: version(source),
      client: 'fixture-owned Vite development client',
    };
  const endpoint = JSON.parse(
    readFileSync(
      resolve(root, 'apps/game-client/dist/volam-build-endpoint.json'),
      'utf8',
    ),
  );
  if (
    endpoint.serverUrl?.replace('://localhost:', '://127.0.0.1:') !==
    session.serverUrl.replace('://localhost:', '://127.0.0.1:')
  )
    throw Error('Client build endpoint differs from this QA session');
  return { protocol: version(source), serverUrl: session.serverUrl };
}

/** Fresh observations only. No installation, compilation, cache of PASS or process cleanup. */
export async function qaPreflight({
  mode = 'browser',
  args = [],
  root = repository,
  env = process.env,
  stage = 'before-build',
  nodeVersion = process.versions.node,
} = {}) {
  const started = performance.now();
  const checks = [];
  const check = async (id, action, remedy) => {
    try {
      const detail = await action();
      checks.push({ id, status: 'PASS', ...(detail ? { detail } : {}) });
      return true;
    } catch (error) {
      checks.push({ id, status: 'FAIL', message: error.message, remedy });
      return false;
    }
  };
  let pkg, session, requireFromRoot;
  let managed = false;
  // Validate profile arguments through the same contract as the runner.
  try {
    managed = managedQaProfile(mode, args);
  } catch {
    /* session check reports it */
  }
  const workspace = await check(
    'workspace',
    () => {
      if (!['quick', 'browser', 'final'].includes(mode))
        throw Error('Mode must be quick, browser or final');
      if (!['before-build', 'ready'].includes(stage))
        throw Error('Stage must be before-build or ready');
      pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
      if (pkg.name !== 'volam-hero-defense')
        throw Error('Not the Võ Lâm Hero Defense checkout');
      requireFromRoot = createRequire(resolve(root, 'package.json'));
      return { mode, stage, managed };
    },
    'Run from this checkout with --mode quick|browser|final.',
  );
  if (workspace) {
    // Fail the known port problem before resolving dependencies or loading Playwright.
    const configured = await check(
      'session',
      () => {
        session = qaWorkflowSession(mode, args, env);
        return managed
          ? { serverPort: session.serverPort, clientPort: session.clientPort }
          : 'No managed service ports for this profile';
      },
      'Set a unique VOLAM_QA_SESSION and matching local server/client ports and VITE_SERVER_URL.',
    );
    if (configured && managed)
      await check(
        'ports',
        () =>
          session.contract
            ? requireQaPorts(session.contract.ports)
            : requireFreePorts(session),
        'Choose unused VOLAM_QA_SERVER_PORT/VOLAM_QA_CLIENT_PORT; do not borrow or stop another service.',
      );
    await check(
      'node',
      () => {
        if (!supportsNode(nodeVersion, pkg.engines.node))
          throw Error(
            `Node ${nodeVersion} does not satisfy ${pkg.engines.node}`,
          );
        return nodeVersion;
      },
      `Use a Node version satisfying ${pkg.engines?.node}.`,
    );
    const installed = await check(
      'installation',
      () => {
        const stamp = readFileSync(
          resolve(root, 'node_modules/.modules.yaml'),
          'utf8',
        );
        // pnpm 11 emits JSON; older YAML stamps are also accepted for diagnostics.
        const manager = stamp.trimStart().startsWith('{')
          ? JSON.parse(stamp).packageManager
          : /^packageManager:\s*['"]?([^\s'"]+)/m.exec(stamp)?.[1];
        if (manager !== pkg.packageManager)
          throw Error(
            `Installed ${manager ?? 'unknown pnpm'}, expected ${pkg.packageManager}`,
          );
        const agent = /\bpnpm\/([^\s]+)/.exec(
          env.npm_config_user_agent ?? '',
        )?.[1];
        if (agent && `pnpm@${agent}` !== pkg.packageManager)
          throw Error(`Running pnpm@${agent}, expected ${pkg.packageManager}`);
        if (
          !readFileSync(resolve(root, 'pnpm-lock.yaml')).equals(
            readFileSync(resolve(root, 'node_modules/.pnpm/lock.yaml')),
          )
        )
          throw Error('Installed lockfile differs from pnpm-lock.yaml');
        return manager;
      },
      'Use the pinned pnpm version; run pnpm install --offline --frozen-lockfile (or an authorized online install if the cache is incomplete).',
    );
    if (installed) {
      const modules = await check(
        'tools',
        () => {
          const names =
            mode === 'quick'
              ? ['typescript', 'vitest']
              : ['typescript', 'vitest', 'vite', '@playwright/test'];
          const versions = {};
          for (const name of names) {
            const path = requireFromRoot.resolve(`${name}/package.json`);
            const metadata = JSON.parse(readFileSync(path, 'utf8'));
            if (metadata.version !== pkg.devDependencies[name])
              throw Error(
                `${name}: installed ${metadata.version}, expected ${pkg.devDependencies[name]}`,
              );
            versions[name] = metadata.version;
          }
          return versions;
        },
        'Restore dependencies with the pinned pnpm and frozen lockfile.',
      );
      if (
        modules &&
        managed &&
        !checks.some((entry) => entry.status === 'FAIL')
      )
        await check(
          'chromium',
          () => {
            const channels = session.contract?.channels ?? [null];
            const configuredExecutable = session.contract?.executableEnv
              ? env[session.contract.executableEnv]
              : undefined;
            if (configuredExecutable || channels.some(Boolean)) {
              if (configuredExecutable && !existsSync(configuredExecutable))
                throw Error(
                  'Missing configured browser executable: ' +
                    configuredExecutable,
                );
              const options = configuredExecutable
                ? [{ executablePath: configuredExecutable }]
                : [...new Set(channels)].map((channel) =>
                    channel ? { channel } : {},
                  );
              const script =
                "const{createRequire}=require('node:module');const r=createRequire(process.argv[1]);(async()=>{for(const options of JSON.parse(process.argv[2])){const b=await r('@playwright/test').chromium.launch({...options,headless:true,timeout:5000});try{if(!b.isConnected())throw Error('Browser did not connect');}finally{await b.close();}}process.stdout.write('configured browser launch/close verified');})().catch(e=>{console.error(e.message);process.exitCode=1;});";
              const result = spawnSync(
                process.execPath,
                [
                  '-e',
                  script,
                  resolve(root, 'package.json'),
                  JSON.stringify(options),
                ],
                {
                  cwd: root,
                  env: qaBrowserEnvironment(env, root),
                  encoding: 'utf8',
                  timeout: 20000,
                  windowsHide: true,
                },
              );
              if (result.error || result.status !== 0)
                throw Error(
                  'Configured browser unavailable: ' +
                    (result.error?.message ?? result.stderr.slice(-500)),
                );
              return {
                channels,
                executable: configuredExecutable ?? null,
                verified: 'headless launch + close',
              };
            }
            // Public executablePath(), in a child so per-run cache overrides never mutate global state.
            const script =
              "const {createRequire}=require('node:module');const r=createRequire(process.argv[1]);process.stdout.write(r('@playwright/test').chromium.executablePath());";
            const result = spawnSync(
              process.execPath,
              ['-e', script, resolve(root, 'package.json')],
              {
                cwd: root,
                env: qaBrowserEnvironment(env, root),
                encoding: 'utf8',
                timeout: 10000,
                windowsHide: true,
              },
            );
            if (result.error || result.status !== 0)
              throw Error(
                'Cannot discover installed Chromium: ' +
                  (result.error?.message ?? result.stderr.slice(-300)),
              );
            const executable = result.stdout.trim();
            if (!existsSync(executable))
              throw Error(`Missing Chromium: ${executable}`);
            // Default managed profiles launch the headless shell. Verify its executable too.
            const playwrightRequire = createRequire(
              requireFromRoot.resolve('@playwright/test/package.json'),
            );
            const metadata = JSON.parse(
              readFileSync(
                resolve(
                  dirname(
                    playwrightRequire.resolve('playwright-core/package.json'),
                  ),
                  'browsers.json',
                ),
                'utf8',
              ),
            );
            const shell = metadata.browsers.find(
              (browser) => browser.name === 'chromium-headless-shell',
            );
            const suffix = {
              win32: [
                'chrome-headless-shell-win64',
                'chrome-headless-shell.exe',
              ],
              linux: ['chrome-headless-shell-linux64', 'chrome-headless-shell'],
              darwin: [
                'chrome-headless-shell-mac-' +
                  (process.arch === 'arm64' ? 'arm64' : 'x64'),
                'chrome-headless-shell',
              ],
            }[process.platform];
            if (!shell || !suffix)
              throw Error(
                'Unsupported headless-shell layout; inspect the installed Playwright browser metadata',
              );
            const browserCache = qaBrowserEnvironment(
              env,
              root,
            ).PLAYWRIGHT_BROWSERS_PATH;
            const shellPath = resolve(
              browserCache === '0'
                ? resolve(
                    dirname(
                      playwrightRequire.resolve('playwright-core/package.json'),
                    ),
                    '.local-browsers',
                  )
                : browserCache,
              `chromium_headless_shell-${shell.revision}`,
              ...suffix,
            );
            if (!existsSync(shellPath))
              throw Error(`Missing Chromium headless shell: ${shellPath}`);
            return {
              version: shell.browserVersion,
              cache: qaBrowserEnvironment(env, root).PLAYWRIGHT_BROWSERS_PATH,
            };
          },
          "Install the profile's configured Chrome/Edge or browser cache; use pnpm install:browsers for bundled Chromium with the same PLAYWRIGHT_BROWSERS_PATH.",
        );
    }
    if (mode === 'final')
      await check(
        'python',
        () => {
          const result = spawnSync('python', ['--version'], {
            encoding: 'utf8',
            timeout: 5000,
            windowsHide: true,
          });
          if (result.error || result.status !== 0)
            throw Error('Python is unavailable for asset validators');
          return result.stdout.trim();
        },
        'Make Python available for the existing asset validators.',
      );
    if (stage === 'ready' && managed)
      await check(
        'build',
        () => {
          return verifyQaBuild(root, session);
        },
        'Run check:browser/check:final with the same endpoint; protocol identity alone does not prove server code freshness.',
      );
  }
  return {
    status: checks.some((entry) => entry.status === 'FAIL') ? 'FAIL' : 'PASS',
    mode,
    stage,
    milliseconds: Math.round(performance.now() - started),
    checks,
    ...(!managed && mode !== 'quick'
      ? {
          note: 'Legacy profile: preflight does not guess ports, browser channel or build identity; its existing fixture remains responsible.',
        }
      : {}),
  };
}

export function formatPreflight(report) {
  const failures = report.checks.filter((check) => check.status === 'FAIL');
  return failures.length
    ? failures
        .map(
          (check) =>
            `[preflight] FAIL ${check.id}: ${check.message}\n  ${check.remedy}`,
        )
        .join('\n')
    : `[preflight] PASS ${report.checks.length} checks in ${report.milliseconds}ms${report.note ? '; legacy service/browser checks remain in fixture' : ''}`;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const args = process.argv.slice(2);
  let mode = 'browser',
    stage = 'before-build',
    json = false;
  for (let i = 0; i < args.length;) {
    if (args[i] === '--mode') {
      mode = args[i + 1] ?? 'invalid';
      args.splice(i, 2);
    } else if (args[i] === '--ready') {
      stage = 'ready';
      args.splice(i, 1);
    } else if (args[i] === '--json') {
      json = true;
      args.splice(i, 1);
    } else i++;
  }
  const report = await qaPreflight({ mode, stage, args });
  console.log(json ? JSON.stringify(report, null, 2) : formatPreflight(report));
  process.exitCode = report.status === 'PASS' ? 0 : 1;
}
