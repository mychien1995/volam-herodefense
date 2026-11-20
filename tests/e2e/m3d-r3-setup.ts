import { createM3dFixture } from './m3d-feedback-setup.js';
import productionSetup from './global-setup.js';
import { startOwnedGameQa } from './owned-game-setup.js';
export default async function setup() {
  if (process.env['VOLAM_QA_DEV_CLIENT'] !== '1')
    return createM3dFixture(productionSetup);
  return createM3dFixture(() =>
    startOwnedGameQa({
      config: 'playwright.m3d-r3.config.ts',
      environment: { NODE_ENV: 'development' },
      loadClientConfig: true,
      client: { server: { hmr: true, watch: {} } },
    }),
  );
}
