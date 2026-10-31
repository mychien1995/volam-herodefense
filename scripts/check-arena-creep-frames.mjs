/** Windows-safe fast art iteration, forwarding the normal preparation/build browser workflow. */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { arenaCreepQaOptions } from '../tools/arena-creep-qa-options.mjs';

const profile = arenaCreepQaOptions([
  '--mode',
  'frames',
  ...process.argv.slice(2),
]);
if (profile.mode !== 'frames' || ![2, 3].includes(profile.players)) {
  throw new Error(
    'Frame iteration supports two or three players; use check:final for the six-player gate',
  );
}
const result = spawnSync(
  process.execPath,
  [
    'scripts/check-workflow.mjs',
    'browser',
    '--dev-client',
    '--config',
    'playwright.arena-creeps.config.ts',
  ],
  {
    cwd: fileURLToPath(new URL('../', import.meta.url)),
    stdio: 'inherit',
    shell: false,
    env: {
      ...process.env,
      ARENA_CREEP_QA_MODE: profile.mode,
      ARENA_CREEP_QA_PLAYERS: String(profile.players),
      ARENA_CREEP_QA_EVIDENCE: profile.evidence,
    },
  },
);
if (result.error) console.error(result.error);
process.exitCode = result.error ? 1 : (result.status ?? 1);
