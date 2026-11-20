import { startOwnedGameQa } from './owned-game-setup.js';

/** Existing fixture prerequisites; lifecycle and identity are shared. */
export default async function setup() {
  return startOwnedGameQa({
    config: 'playwright.hong-liet.config.ts',
    environment: {
      NODE_ENV: 'development',
      VOLAM_DEV_LEGACY_SKILLS: undefined,
      VOLAM_DEV_SKILLS: undefined,
      VOLAM_DEV_PRACTICE_CREEPS: undefined,
      VOLAM_INVASION_INTERVAL_SECONDS: undefined,
      VOLAM_DEV_STATUE_HP: undefined,
    },
    loadClientConfig: true,
    client: { cacheDir: '.cache/hong-liet-vite' },
  });
}
