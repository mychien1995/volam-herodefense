import { startOwnedGameQa } from './owned-game-setup.js';

/** Existing fixture prerequisites; lifecycle and identity are shared. */
export default async function setup() {
  return startOwnedGameQa({
    config: 'playwright.ngu-doc-game.config.ts',
    environment: {
      NODE_ENV: 'development',
      VOLAM_DEV_NGU_DOC: '1',
      VOLAM_DEV_PRACTICE_CREEPS: '1',
    },
  });
}
