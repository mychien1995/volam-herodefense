import { createRequire } from 'node:module';
import { writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { qaBrowserEnvironment } from './qa-preflight.mjs';
import {
  deploymentInputs,
  validateSelection,
  completeDeploymentPaths,
  staticDeploymentTexts,
  atlasUiPaths,
} from '../scripts/deploy-asset-selection.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
if (process.argv.includes('--check')) {
  const manifest = JSON.parse(
    readFileSync(resolve(root, 'assets/deploy-runtime-assets.json'), 'utf8'),
  );
  validateSelection(manifest, deploymentInputs(root));
  console.log(
    'Production atlas selection verified against current source and manifest inputs.',
  );
  process.exit(0);
}
Object.assign(process.env, qaBrowserEnvironment(process.env, root));
delete process.env.VOLAM_RUNTIME_PUBLIC_DIR; // Audit original paths, before deduplication.
const require = createRequire(import.meta.url);
const { createServer } = await import('vite');
const { chromium } = require('@playwright/test');
const clientRoot = resolve(root, 'apps/game-client');
const server = await createServer({
  root: clientRoot,
  resolve: {
    alias: {
      phaser: resolve(clientRoot, 'node_modules/phaser/dist/phaser.esm.js'),
    },
  },
  define: { __VOLAM_RASTER_ALIASES__: '{}' },
  server: {
    port: 5575,
    host: '127.0.0.1',
    strictPort: true,
    fs: { allow: [root] },
  },
  logLevel: 'error',
  plugins: [
    {
      name: 'deployment-loader-audit',
      configureServer(vite) {
        vite.middlewares.use((req, res, next) => {
          if (req.url === '/__deploy-audit-pixel.png') {
            res.setHeader('Content-Type', 'image/png');
            res.end(
              Buffer.from(
                'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==',
                'base64',
              ),
            );
          } else if (req.url === '/__deploy-loader-audit') {
            res.setHeader('Content-Type', 'text/html');
            const entry = resolve(
              root,
              'tools/deploy-loader-audit.mjs',
            ).replaceAll('\\', '/');
            res.end(
              `<div id="scene-status"></div><script type="module" src="/@fs/${entry}"></script>`,
            );
          } else next();
        });
      },
    },
  ],
});
let browser;
try {
  await server.listen();
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const error = new Promise((_, reject) => page.once('pageerror', reject));
  await page.goto('http://127.0.0.1:5575/__deploy-loader-audit', {
    waitUntil: 'commit',
  });
  await Promise.race([
    page.waitForFunction(
      () => window.__deployLoaderAudit?.complete,
      {},
      { timeout: 180000 },
    ),
    error,
  ]);
  const result = await page.evaluate(() => window.__deployLoaderAudit);
  if (result.failures.length) throw Error(JSON.stringify(result.failures));
  const report = {
    version: 1,
    scope:
      'Default production ArenaScene eager preload: all schools, three M4D arenas, wave bosses, every dungeon, Loi Dai and PvP; real pack expansion and production replacement hooks. Historical comparison modes excluded. Only explicitly audited atlas families are pruned.',
    inputs: deploymentInputs(root),
    paths: completeDeploymentPaths(
      [...result.paths, ...atlasUiPaths(root)],
      staticDeploymentTexts(root),
    ),
    failures: result.failures,
  };
  writeFileSync(
    resolve(root, 'assets/deploy-runtime-assets.json'),
    JSON.stringify(report, null, 2) + '\n',
  );
  console.log(
    `Production loader audit PASS: ${report.paths.length} URLs, ${Object.keys(report.inputs).length} pinned inputs, no loader errors. Image bytes were not changed.`,
  );
} finally {
  await browser?.close();
  await server.close();
}
