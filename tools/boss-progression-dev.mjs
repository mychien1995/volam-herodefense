import { qaSession } from './qa-session.mjs';
import { startOwnedGameQa } from './qa-game-services.mjs';

if (process.env.NODE_ENV === 'production') throw Error('Development only');
const session = qaSession({
  profile: 'boss-progression',
  serverPort: 2959,
  clientPort: 5559,
});
const close = await startOwnedGameQa({
  session,
  clientMode: 'development',
  loadClientConfig: true,
  environment: {
    NODE_ENV: 'development',
    VOLAM_DEV_WAVE_BOSSES: '1',
    VOLAM_DEV_FINAL_BOSS: '1',
    VOLAM_DEV_BOSS_PROGRESSION: '1',
    VOLAM_DEV_LEGACY_SKILLS: undefined,
    VOLAM_TEST_LEGACY_PROGRESSION: undefined,
    VOLAM_DEV_SKILLS: undefined,
    VOLAM_DEV_CREEP_TEST: undefined,
    VOLAM_DEV_PRACTICE_CREEPS: undefined,
  },
});
console.log(`Boss progression test: ${session.clientUrl}/?debug=1`);
console.log(
  'Levels 6/12/18/24/27; 20s preparation; normal damage/cooldowns; 3 revivals; presets include previous chapter pearls and 10+10 small potions.',
);
const stop = async () => {
  await close();
  process.exit(0);
};
process.once('SIGINT', stop);
process.once('SIGTERM', stop);
