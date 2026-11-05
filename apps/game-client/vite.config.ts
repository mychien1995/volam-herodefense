import { defineConfig } from 'vite';

let compiledServerUrl = 'http://localhost:2567';

export default defineConfig({
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
      input: {
        game: 'index.html',
        bacCaiPreview: 'bac-cai-preview.html',
        visualUpgrade: 'visual-upgrade-2.html',
        renovationPreview: 'renovation-preview.html',
      },
    },
  },
});
