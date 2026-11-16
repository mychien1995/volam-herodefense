import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let compiledServerUrl = 'http://localhost:2567';
const runtimePublicDir = process.env['VOLAM_RUNTIME_PUBLIC_DIR'];
const aliases = runtimePublicDir
  ? JSON.parse(
      readFileSync(resolve(runtimePublicDir, '../runtime-assets.json'), 'utf8'),
    ).aliases
  : {};

export default defineConfig({
  ...(runtimePublicDir ? { publicDir: runtimePublicDir } : {}),
  define: { __VOLAM_RASTER_ALIASES__: JSON.stringify(aliases) },
  json: { stringify: false },
  ...(process.env['VOLAM_QA_VITE_CACHE']
    ? { cacheDir: process.env['VOLAM_QA_VITE_CACHE'] }
    : {}),
  server: {
    port: Number(process.env['VOLAM_QA_CLIENT_PORT'] ?? 5173),
    strictPort: true,
  },
  plugins: [
    {
      name: 'volam-build-endpoint',
      configResolved(config) {
        compiledServerUrl =
          config.env['VITE_SERVER_URL'] ?? 'http://localhost:2567';
      },
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: 'volam-build-endpoint.json',
          source: JSON.stringify({
            serverUrl: compiledServerUrl,
          }),
        });
      },
    },
  ],
  build: {
    target: 'es2022',
    rollupOptions: {
      output: {
        // Keep bundler helpers in their own chunk so the menus don't preload Phaser.
        codeSplitting: {
          groups: [
            {
              name: 'phaser.esm',
              test: /[\\/]phaser[\\/]dist[\\/]phaser\.esm\.js$/,
            },
          ],
        },
      },
      input: {
        game: 'index.html',
        ...(!runtimePublicDir
          ? {
              bacCaiPreview: 'bac-cai-preview.html',
              visualUpgrade: 'visual-upgrade-2.html',
              duongMonPreview: 'duong-mon.html',
              nguDocPreview: 'ngu-doc-preview.html',
              renovationPreview: 'renovation-preview.html',
              voDangQuyenPreview: 'vo-dang-quyen-preview.html',
              shaolinDaoPreview: 'shaolin-dao-preview.html',
            }
          : {}),
      },
    },
  },
});
