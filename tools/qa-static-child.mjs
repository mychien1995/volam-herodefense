import { realpathSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

const target = realpathSync(resolve(process.argv[2]));
if (!target.startsWith(realpathSync(resolve('.')) + sep))
  throw Error('Static QA script escapes workspace');
let stopping = false;
const stop = () => {
  if (stopping) return;
  stopping = true;
  const deadline = setTimeout(() => process.exit(1), 5000);
  deadline.unref();
  // Reuse the script's existing native HTTP close handler without a Windows signal race.
  if (process.listenerCount('SIGTERM')) process.emit('SIGTERM');
  else process.exit(0);
};
process.on('message', (value) => {
  if (value?.type === 'stop' && value.runId === process.env.VOLAM_QA_RUN_ID)
    stop();
});
process.once('disconnect', stop);
if (!process.connected) stop();
await import(pathToFileURL(target).href);
