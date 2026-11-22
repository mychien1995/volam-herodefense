import { startOwnedGameQa } from '../../../../tools/qa-game-services.mjs';

const stop = await startOwnedGameQa({ config: 'playwright.practice.config.ts' });
let closing = false;
const keepAlive = setInterval(() => {}, 30000);
async function close() {
  if (closing) return;
  closing = true;
  clearInterval(keepAlive);
  await stop();
  process.exit(0);
}
process.once('SIGINT', close);
process.once('SIGTERM', close);
console.log(`SFX_REVIEW_READY http://127.0.0.1:55861/?debug PID=${process.pid}`);
