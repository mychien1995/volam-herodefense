import { fileURLToPath } from 'node:url';
import { preview } from 'vite';
import { createGameServer } from '../../apps/game-server/dist/app.config.js';
/** Same env users inject before start-game.cmd; no phase/damage/teleport fixture API. */
export default async function setup() {
  const keys = [
      'NODE_ENV',
      'VOLAM_DEV_WAVE_BOSSES',
      'VOLAM_DEV_LEGACY_SKILLS',
      'VOLAM_DEV_SKILLS',
      'VOLAM_DEV_PRACTICE_CREEPS',
      'VOLAM_INVASION_INTERVAL_SECONDS',
      'VOLAM_DEV_STATUE_HP',
    ] as const,
    old = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  process.env['NODE_ENV'] = 'development';
  process.env['VOLAM_DEV_WAVE_BOSSES'] = '1';
  for (const key of keys.slice(2)) delete process.env[key];
  const server = createGameServer();
  await server.listen(Number(process.env['VOLAM_QA_SERVER_PORT'] ?? 2896));
  let client: Awaited<ReturnType<typeof preview>> | undefined;
  try {
    client = await preview({
      root: fileURLToPath(new URL('../../apps/game-client', import.meta.url)),
      configFile: false,
      preview: {
        host: '127.0.0.1',
        port: Number(process.env['VOLAM_QA_CLIENT_PORT'] ?? 5496),
        strictPort: true,
      },
    });
  } catch (error) {
    await server.gracefullyShutdown(false);
    throw error;
  }
  return async () => {
    await client?.close();
    await server.gracefullyShutdown(false);
    for (const key of keys)
      if (old[key] === undefined) delete process.env[key];
      else process.env[key] = old[key];
  };
}
