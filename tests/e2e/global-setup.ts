import { fileURLToPath } from 'node:url';
import { preview } from 'vite';
import { createGameServer } from '../../apps/game-server/dist/app.config.js';

/** Own test services directly so Windows teardown needs no shell process-tree kill. */
export default async function setup(): Promise<() => Promise<void>> {
  const closers: Array<() => Promise<void>> = [];
  const cleanup = async (): Promise<void> => {
    const results = await Promise.allSettled(
      closers.reverse().map((close) => close()),
    );
    const failure = results.find((result) => result.status === 'rejected');
    if (failure?.status === 'rejected') throw failure.reason;
  };
  const running = async (url: string): Promise<boolean> => {
    try {
      return (await fetch(url, { signal: AbortSignal.timeout(1500) })).ok;
    } catch {
      return false;
    }
  };
  try {
    if (!(await running('http://localhost:2567/health'))) {
      process.env['VOLAM_DEV_PRACTICE_CREEPS'] = '1'; // Explicit historical combat fixture.
const server = createGameServer();
      await server.listen(2567);
      closers.push(() => server.gracefullyShutdown(false));
    }
    if (!(await running('http://127.0.0.1:5173'))) {
      const client = await preview({
        root: fileURLToPath(new URL('../../apps/game-client', import.meta.url)),
        configFile: false,
        preview: { host: '127.0.0.1', port: 5173, strictPort: true },
      });
      closers.push(() => client.close());
    }
    return cleanup;
  } catch (error) {
    await cleanup();
    throw error;
  }
}
