import { resolve } from 'node:path';
import { preview } from 'vite';

export default async function setup() {
  const server = await preview({
    configFile: false,
    root: resolve('apps/game-client'),
    preview: { host: '127.0.0.1', port: 5527, strictPort: true },
  });
  return () =>
    new Promise<void>((done, reject) => {
      server.httpServer.close((error) => (error ? reject(error) : done()));
    });
}
