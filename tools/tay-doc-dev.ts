import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { createGameServer } from '../apps/game-server/dist/app.config.js';
if (process.env['NODE_ENV'] === 'production')
  throw Error('Tây Độc DEV spawn is development-only.');
process.env['NODE_ENV'] = 'development';
process.env['VOLAM_DEV_TAY_DOC'] = '1';
// This helper spawns the real encounter; it has no pose, HP or cast mutation API.
const server = createGameServer();
await server.listen(2795);
const client = await createServer({
  root: fileURLToPath(new URL('../apps/game-client', import.meta.url)),
  configFile: false,
  cacheDir: '.cache/tay-doc-dev-vite',
  server: { host: '127.0.0.1', port: 5398, strictPort: true },
  define: {
    'import.meta.env.VITE_SERVER_URL': JSON.stringify('http://127.0.0.1:2795'),
  },
});
await client.listen();
console.log(
  'Tây Độc gameplay: http://127.0.0.1:5398/?debug=1 · server 2795 · DEV spawn only; invasion clock remains 180s.',
);
let closing = false;
async function close() {
  if (closing) return;
  closing = true;
  await client.close();
  await server.gracefullyShutdown(false);
  process.exit(0);
}
process.on('SIGINT', () => void close());
process.on('SIGTERM', () => void close());
