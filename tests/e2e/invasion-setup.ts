import { startOwnedGameQa } from './owned-game-setup.js';

/** Existing fixture prerequisites; lifecycle and identity are shared. */
export default async function setup() {
  return startOwnedGameQa({
    config: 'playwright.invasion.config.ts',
    environment: {
      NODE_ENV: 'development',
      VOLAM_INVASION_INTERVAL_SECONDS: '6',
      VOLAM_DEV_STATUE_HP: '300',
      VOLAM_DEV_PRACTICE_CREEPS: '1',
    },
  });
}
