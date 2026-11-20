import { spawn } from 'node:child_process';

// IPC guardian: losing the owner stops this exact native handle on Windows too.
const [exe, root, runId] = process.argv.slice(2);
let stopping = false;
const native = spawn(
  exe,
  [
    '-b',
    'apps/game-server',
    '--watch',
    '--force',
    '--pretty',
    'false',
    '--preserveWatchOutput',
    '--locale',
    'en',
  ],
  {
    cwd: root,
    stdio: ['ignore', 'inherit', 'inherit'],
    windowsHide: true,
  },
);
const stop = () => {
  if (stopping) return;
  stopping = true;
  native.kill('SIGTERM');
  const deadline = setTimeout(() => native.kill('SIGKILL'), 3000);
  deadline.unref();
};
native.once('spawn', () => {
  if (!process.connected) stop();
  else process.send({ type: 'compiler-pid', runId, pid: native.pid });
});
native.once('error', (error) => {
  console.error(error);
  process.exit(1);
});
native.once('exit', (code) => process.exit(stopping ? 0 : code || 1));
process.on('message', (message) => {
  if (message?.type === 'stop' && message.runId === runId) stop();
});
process.once('disconnect', stop);
if (!process.connected) stop();
