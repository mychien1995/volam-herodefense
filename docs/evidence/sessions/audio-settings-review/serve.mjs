import { startOwnedGameQa } from '../../../../tools/qa-game-services.mjs';
const stop = await startOwnedGameQa({ config: 'playwright.practice.config.ts' });
const timer = setInterval(() => {}, 30000);
async function close() { clearInterval(timer); await stop(); process.exit(0); }
process.once('SIGINT', close);
process.once('SIGTERM', close);
console.log(`AUDIO_SETTINGS_READY http://127.0.0.1:${process.env.VOLAM_QA_CLIENT_PORT}/?debug PID=${process.pid}`);
