import type { WaveBossTestOptions } from '@volam/game-core';
/** Server environment only; client join options and messages cannot enable cheats. */
export function serverWaveBossTestOptions(
  tickRate: number,
  env: NodeJS.ProcessEnv = process.env,
): WaveBossTestOptions | undefined {
  if (env['NODE_ENV'] === 'production' || env['VOLAM_DEV_WAVE_BOSSES'] !== '1')
    return undefined;
  if (env['VOLAM_DEV_BOSS_PROGRESSION'] === '1')
    return {
      progression: true,
      bossHitFraction: 0.05,
      runSpeedMultiplier: 1,
      firstRestTicks: 20 * tickRate,
      restTicks: 20 * tickRate,
    };
  return {
    bossHitFraction: 0.05,
    runSpeedMultiplier: 3,
    firstRestTicks: 3 * tickRate,
    restTicks: 5 * tickRate,
  };
}
