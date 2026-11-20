import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { observeAssetOutputs } from '../scripts/asset-files.mjs';
import { prepareOutputObserver } from './qa-prepared-observation.mjs';

const output = process.env.VOLAM_QA_PREPARED_OUTPUT,
  nonce = process.env.VOLAM_QA_PREPARED_NONCE;
if (!output || !nonce)
  throw Error('Owned prepared observation requires output and nonce');
const observer = prepareOutputObserver(resolve('.'), nonce);
const stop = observeAssetOutputs(observer.observe);
process.once('exit', (code) => {
  stop();
  writeFileSync(output, JSON.stringify(observer.receipt(code)) + '\n');
});
