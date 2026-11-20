import { startGameQa } from './global-setup.js';

/** Existing server-only legal trial loadouts; no fabricated cast/hit/travel result. */
export default async function setup() {
  const keys = [
    'VOLAM_DEV_CON_LUAN',
    'VOLAM_DEV_DUONG_MON',
    'VOLAM_DEV_NGU_DOC',
  ] as const;
  const original = Object.fromEntries(
    keys.map((key) => [key, process.env[key]]),
  );
  const restore = () => {
    for (const key of keys) {
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
    }
  };
  for (const key of keys) process.env[key] = '1';
  try {
    const close = await startGameQa();
    return async () => {
      try {
        await close();
      } finally {
        restore();
      }
    };
  } catch (error) {
    restore();
    throw error;
  }
}
