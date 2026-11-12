import { createInvasionDefinition } from '@volam/game-data';
/** Read only server environment. Client join/message payloads cannot override match rules. */
export function serverInvasionDefinition(
  env: NodeJS.ProcessEnv = process.env,
  portalCount: 1 | 2 | 3 | 4 = 2,
) {
  const development = env['NODE_ENV'] !== 'production';
  const test = development && env['VOLAM_DEV_CREEP_TEST'] === '1';
  if (test && env['VOLAM_DEV_WAVE_BOSSES'] === '1')
    throw Error(
      'Choose VOLAM_DEV_CREEP_TEST or VOLAM_DEV_WAVE_BOSSES, not both.',
    );
  const definition = createInvasionDefinition(
    test
      ? 20
      : development
        ? Number(env['VOLAM_INVASION_INTERVAL_SECONDS'] ?? 180)
        : 180,
    test
      ? 1000000000
      : development
        ? Number(env['VOLAM_DEV_STATUE_HP'] ?? 2000)
        : 2000,
    {
      portalCount,
      durationSeconds: test ? 12 : 60,
      spawnEverySeconds: test ? 3 : 2,
    },
  );
  if (test) definition.warningTicks = [60, 30];
  return definition;
}
