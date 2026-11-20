import { startOwnedGameQa } from './owned-game-setup.js';
export default async function setup() {
  return startOwnedGameQa({ config: 'playwright.visual-upgrade.config.ts' });
}
