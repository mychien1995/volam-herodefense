import { startGameQa } from './global-setup.js';

export default async function setup(): Promise<() => Promise<void>> {
  const original = process.env['VOLAM_DEV_LOI_DAI'];
  const restore = () => {
    if (original === undefined) delete process.env['VOLAM_DEV_LOI_DAI'];
    else process.env['VOLAM_DEV_LOI_DAI'] = original;
  };
  process.env['VOLAM_DEV_LOI_DAI'] = '1';
  try {
    const stop = await startGameQa();
    return async () => {
      try {
        await stop();
      } finally {
        restore();
      }
    };
  } catch (error) {
    restore();
    throw error;
  }
}
