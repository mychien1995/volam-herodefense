import setupKim from './kim-luan-setup.js';
import setupLy from './ly-mac-sau-setup.js';
/** Keep each existing suite's owned ports/fixtures and validate the merged game. */
export default async function setup() {
  const closeKim = await setupKim();
  try {
    const closeLy = await setupLy();
    return async () => {
      try {
        await closeLy();
      } finally {
        await closeKim();
      }
    };
  } catch (error) {
    await closeKim();
    throw error;
  }
}
