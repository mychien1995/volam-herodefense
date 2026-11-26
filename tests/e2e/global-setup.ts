import { startOwnedGameQa } from './owned-game-setup.js';

/** Default gameplay uses the same owned lifecycle as dedicated legacy profiles. */
export async function startGameQa(
  startFixture?: () => () => void,
): Promise<() => Promise<void>> {
  return startOwnedGameQa({
    environment: { NODE_ENV: 'development', VOLAM_DEV_PRACTICE_CREEPS: '1' },
    configure(_server, owned) {
      if (startFixture) {
        const stop = startFixture();
        owned.add(() => stop());
      }
    },
  });
}
export default async function setup(): Promise<() => Promise<void>> {
  if (process.env['VOLAM_RUNTIME_PUBLIC_DIR'])
    return startOwnedGameQa({
      loadClientConfig: true,
      environment: { NODE_ENV: 'development', VOLAM_DEV_PRACTICE_CREEPS: '1' },
    });
  return startGameQa();
}
