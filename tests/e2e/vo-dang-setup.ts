import { startOwnedGameQa } from './owned-game-setup.js';

/** Existing fixture prerequisites; lifecycle and identity are shared. */
export default async function setup() {
  return startOwnedGameQa({
    config: 'playwright.vo-dang.config.ts',
    environment: {
      VOLAM_DEV_PRACTICE_CREEPS: '1',
    },
    client: { cacheDir: '.cache/vite-vo-dang' },
  });
}
