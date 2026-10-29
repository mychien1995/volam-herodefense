import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL('../', import.meta.url));
const browsers = fileURLToPath(
  new URL('../.cache/ms-playwright', import.meta.url),
);
const child = spawn(
  process.execPath,
  [require.resolve('@playwright/test/cli'), ...process.argv.slice(2)],
  {
    cwd: root,
    stdio: 'inherit',
    env: {
      ...process.env,
      PLAYWRIGHT_BROWSERS_PATH:
        process.env['PLAYWRIGHT_BROWSERS_PATH'] ?? browsers,
    },
  },
);
child.on('error', (error) => {
  console.error(error);
  process.exitCode = 1;
});
child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
