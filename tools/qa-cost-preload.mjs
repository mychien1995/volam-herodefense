import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beginSyncCostProfile } from './qa-cost-profile.mjs';

const output = process.env.VOLAM_QA_COST_OUTPUT;
if (!output) throw Error('QA cost preload requires an explicit report path');
const profile = beginSyncCostProfile(resolve('.'));
process.once('exit', (code) => {
  const data = profile.stop();
  writeFileSync(
    output,
    JSON.stringify(
      { schemaVersion: 1, pid: process.pid, exitCode: code, ...data },
      null,
      2,
    ) + '\n',
  );
});
