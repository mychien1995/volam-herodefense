import { startOwnedGameQa } from './owned-game-setup.js';

/** Existing fixture prerequisites; lifecycle and identity are shared. */
export default async function setup() {
  return startOwnedGameQa({
    config: 'playwright.thien-son-skills.config.ts',
    environment: {
      NODE_ENV: 'development',
      VOLAM_DEV_SKILLS: '1',
      VOLAM_DEV_LEGACY_SKILLS: '1',
      VOLAM_DEV_PRACTICE_CREEPS: '1',
    },
    client: { cacheDir: '.cache/vite-thien-son-skills' },
  });
}
