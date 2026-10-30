import { createInvasionDefinition } from '@volam/game-data';
/** Read only server environment. Client join/message payloads cannot override match rules. */
export function serverInvasionDefinition(env: NodeJS.ProcessEnv = process.env) {
  const development = env['NODE_ENV'] !== 'production';
  return createInvasionDefinition(
    development ? Number(env['VOLAM_INVASION_INTERVAL_SECONDS'] ?? 180) : 180,
    development ? Number(env['VOLAM_DEV_STATUE_HP'] ?? 2000) : 2000,
  );
}
